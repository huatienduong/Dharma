import { api } from "@/convex/_generated/api";
import { getVoice } from "@/lib/aiVoices";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Bọc PCM thô (audio/L16 — định dạng Gemini TTS trả về) vào container WAV
 * để decode được — trước đây Audio không phát PCM → im lặng.
 */
function pcmToWav(base64Pcm: string, sampleRate = 24000): string {
  const bin = atob(base64Pcm);
  const pcmLen = bin.length;
  const buffer = new ArrayBuffer(44 + pcmLen);
  const view = new DataView(buffer);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + pcmLen, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, "data");
  view.setUint32(40, pcmLen, true);
  for (let i = 0; i < pcmLen; i++) view.setUint8(44 + i, bin.charCodeAt(i));
  // Chuyển ArrayBuffer sang base64
  const bytes = new Uint8Array(buffer);
  let out = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode(...bytes.subarray(i, i + CH));
  }
  return btoa(out);
}

/** Tùy chọn giọng đọc: id giọng (AI_VOICES) + giới tính mong muốn. */
export type SpeakOpts = {
  voice?: string | null;
  male?: boolean;
  onDone?: () => void;
};

/* ------------------------------------------------------------------ */
/* AudioContext DÙNG CHUNG — cú chạm/bấm đầu tiên tạo + resume context */
/* này để phát sau đó (vượt autoplay policy kể cả trong iframe/webview */
/* — nguyên nhân chính của "đàm thoại im lặng").                       */
/* ------------------------------------------------------------------ */

let sharedCtx: AudioContext | null = null;

function getSharedCtx(): AudioContext | null {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!sharedCtx) sharedCtx = new AC();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Gọi trong cú chạm/bấm đầu tiên — mở khóa vĩnh viễn context chung. */
function unlockSharedCtx(): void {
  const ctx = getSharedCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
}

/**
 * Phát audio (data URL) qua Web Audio — đáng tin cậy hơn HTMLAudioElement
 * trong iframe/webview. Promise resolve KHI PHÁT XONG, reject nếu lỗi.
 */
async function playWithWebAudio(dataUrl: string): Promise<void> {
  const ctx = getSharedCtx();
  if (!ctx) throw new Error("no-webaudio");
  if (ctx.state === "suspended") await ctx.resume();
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const buffer = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
  return new Promise<void>((resolve, reject) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    // AudioBufferSourceNode không có onerror — lỗi phát hiện qua việc context
    // bị đóng giữa chừng: promise không resolve → caller tự có timeout riêng.
    src.start();
  });
}

/**
 * TTS tiếng Việt hai tầng cho Trợ lý Phật học:
 * 1. SERVER TTS (ưu tiên): Gemini TTS / OpenAI TTS trả về audio base64 →
 *    phát qua Web Audio (dự phòng HTMLAudio) — giọng tiếng Việt tự nhiên
 *    bất kể máy người dùng, đúng giọng người dùng đã chọn. TIMEOUT 12s:
 *    máy chủ chậm/treo → chuyển ngay sang giọng trình duyệt.
 * 2. FALLBACK: Web Speech API cải tiến — chunk câu dài, chờ voices tải,
 *    chọn giọng vi khớp giới tính người dùng chọn (Google vi-VN nếu có).
 *
 * FIX "đàm thoại không phát ra tiếng / đứng im":
 * - Phát qua AudioContext dùng chung đã mở khóa bằng cú chạm (iframe/webview).
 * - Mọi nhánh kết thúc (phát xong / hủy / timeout / lỗi) đều gọi onDone ĐÚNG
 *   MỘT LẦN → vòng nghe-nói của đàm thoại không bao giờ treo.
 */
export function useVietnameseTTS() {
  const speakAction = useAction(api.aiChat.speak);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopFlagRef = useRef(false);
  /** Hủy có kiểm soát: stop() giữa chừng vẫn báo onDone cho vòng đàm thoại. */
  const interruptRef = useRef<(() => void) | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<"server" | "browser" | null>(null);

  // Mở khóa AudioContext chung ở cú chạm/bấm đầu tiên (đàm thoại luôn bắt
  // đầu bằng một cú chạm nút gọi → context sẵn sàng phát).
  useEffect(() => {
    const unlock = () => unlockSharedCtx();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Dọn audio element khi unmount
  useEffect(() => {
    return () => {
      stopFlagRef.current = true;
      interruptRef.current?.();
      interruptRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /** Dừng ngay mọi âm thanh (server + browser). */
  const stop = useCallback(() => {
    stopFlagRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch {
        /* noop */
      }
      audioRef.current = null;
    }
    // Cắt buffer đang phát qua Web Audio: đóng context (nguồn gắn với nó
    // im ngay) — lượt phát sau tự tạo context mới.
    if (sharedCtx) {
      try {
        void sharedCtx.close();
      } catch {
        /* noop */
      }
      sharedCtx = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    // Nếu đang có lượt phát dở → báo kết thúc ngay để vòng nghe-nói tiếp tục
    interruptRef.current?.();
    interruptRef.current = null;
  }, []);

  /* --------------------- Web Speech fallback --------------------- */

  const webSpeak = useCallback(
    (text: string, voiceId?: string | null, onDone?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onDone?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      setEngine("browser");

      const pref = getVoice(voiceId);

      // Chọn giọng vi khớp giọng người dùng chọn, chờ voices tải nếu chưa
      const pickVoice = () => {
        const voices = synth.getVoices();
        const viVoices = voices.filter((v) =>
          v.lang?.toLowerCase().startsWith("vi"),
        );
        const pool = viVoices.length > 0 ? viVoices : voices;
        // Ưu tiên: giọng khớp mẫu của giọng đã chọn → Google vi → đúng giới
        // tính → giọng vi đầu tiên.
        return (
          pool.find((v) => pref.browser.test(v.name)) ??
          pool.find((v) => /google/i.test(v.name) && /vi/i.test(v.lang)) ??
          pool.find((v) =>
            pref.male
              ? /male|nam|nam-phong/i.test(v.name)
              : /female|nữ/i.test(v.name),
          ) ??
          pool[0]
        );
      };

      // Chia chunk ≤ 180 ký tự, cắt ở dấu câu để đọc liền mạch
      const chunks: string[] = [];
      const parts = text.split(/(?<=[.!?;:。])\s+/);
      let cur = "";
      for (const p of parts) {
        if ((cur + " " + p).trim().length > 180) {
          if (cur) chunks.push(cur.trim());
          cur = p;
        } else {
          cur = (cur + " " + p).trim();
        }
      }
      if (cur.trim()) chunks.push(cur.trim());

      let idx = 0;
      const speakNext = () => {
        if (stopFlagRef.current) {
          setSpeaking(false);
          onDone?.();
          return;
        }
        if (idx >= chunks.length) {
          setSpeaking(false);
          onDone?.();
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.lang = "vi-VN";
        u.rate = 0.95;
        u.pitch = pref.male ? 0.85 : 1.05;
        const vi = pickVoice();
        if (vi) u.voice = vi;
        u.onend = () => speakNext();
        u.onerror = () => {
          setSpeaking(false);
          onDone?.();
        };
        synth.speak(u);
      };

      setSpeaking(true);
      // Voices có thể tải trễ (Chrome) — thử phát sau 250ms nếu rỗng
      const tryStart = (attempt: number) => {
        if (stopFlagRef.current) {
          onDone?.();
          return;
        }
        if (synth.getVoices().length === 0 && attempt < 8) {
          window.setTimeout(() => tryStart(attempt + 1), 250);
          return;
        }
        speakNext();
      };
      tryStart(0);
    },
    [],
  );

  /* --------------------- Server TTS (ưu tiên) --------------------- */

  const speak = useCallback(
    async (text: string, optsOrDone?: SpeakOpts | (() => void)) => {
      const opts: SpeakOpts =
        typeof optsOrDone === "function"
          ? { onDone: optsOrDone }
          : (optsOrDone ?? {});
      stopFlagRef.current = false;
      const clean = text.trim();
      if (!clean) {
        opts.onDone?.();
        return;
      }

      let settled = false; // đảm bảo onDone chỉ chạy đúng một lần
      const finishWith = (fn?: () => void) => {
        if (settled) return;
        settled = true;
        interruptRef.current = null;
        setSpeaking(false);
        fn?.();
      };
      // Đăng ký hủy có kiểm soát: stop() giữa chừng sẽ gọi onDone một lần
      interruptRef.current = () => {
        if (settled) return;
        finishWith(() => opts.onDone?.());
      };

      // 1. Thử server TTS — timeout 12s, chậm/treo thì rời về Web Speech.
      let timeoutId = 0;
      try {
        const res = await Promise.race([
          speakAction({
            text: clean.slice(0, 2400),
            voice: opts.voice ?? undefined,
            male: opts.male,
            ...getDeviceMeta(),
          }),
          new Promise<null>((resolve) => {
            timeoutId = window.setTimeout(() => resolve(null), 12_000);
          }),
        ]);
        window.clearTimeout(timeoutId);

        if (res && !stopFlagRef.current) {
          // Gemini trả PCM thô → bọc WAV; mp3/WAV dùng nguyên bản
          const src = /L16|pcm/i.test(res.mime)
            ? `data:audio/wav;base64,${pcmToWav(res.audioBase64)}`
            : `data:${res.mime};base64,${res.audioBase64}`;
          setEngine("server");
          setSpeaking(true);

          // 1a. ƯU TIÊN: Web Audio — resolve khi phát xong
          try {
            await playWithWebAudio(src);
            if (stopFlagRef.current) {
              finishWith(() => opts.onDone?.());
            } else {
              finishWith(() => opts.onDone?.());
            }
            return;
          } catch {
            /* Web Audio lỗi → thử HTMLAudio */
          }

          // 1b. DỰ PHÒNG: HTMLAudioElement
          if (stopFlagRef.current) {
            finishWith(() => opts.onDone?.());
            return;
          }
          try {
            const audio = new Audio(src);
            audioRef.current = audio;
            audio.onended = () => {
              audioRef.current = null;
              finishWith(() => opts.onDone?.());
            };
            audio.onerror = () => {
              audioRef.current = null;
              finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
            };
            unlockSharedCtx();
            await audio.play();
            return;
          } catch {
            audioRef.current = null;
            /* HTMLAudio cũng lỗi → Web Speech */
          }
          finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
          return;
        }

        // res = null (timeout / không có khóa TTS) — kết thúc có kiểm soát:
        // đang dừng thì báo xong, không thì rời về giọng trình duyệt.
        if (stopFlagRef.current) {
          finishWith(() => opts.onDone?.());
        } else {
          finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
        }
      } catch {
        window.clearTimeout(timeoutId);
        // Lỗi server/rate-limit → không ngắt vòng đàm thoại: rời về Web Speech
        if (stopFlagRef.current) {
          finishWith(() => opts.onDone?.());
        } else {
          finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
        }
      }
    },
    [speakAction, webSpeak],
  );

  return { speak, speakBrowser: webSpeak, stop, speaking, engine };
}
