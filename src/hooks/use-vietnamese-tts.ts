import { api } from "@/convex/_generated/api";
import { getVoice } from "@/lib/aiVoices";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Bọc PCM thô (audio/L16 — định dạng Gemini TTS trả về) vào container WAV
 * để trình duyệt phát được — trước đây Audio không phát PCM → im lặng.
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

/**
 * TTS tiếng Việt hai tầng cho Trợ lý Pháp:
 * 1. SERVER TTS (ưu tiên): Gemini TTS / OpenAI TTS trả về audio base64 →
 *    phát qua <Audio> — giọng tiếng Việt tự nhiên bất kể máy người dùng,
 *    đúng giọng người dùng đã chọn. Có TIMEOUT 12s: máy chủ chậm/treo →
 *    chuyển ngay sang giọng trình duyệt, đàm thoại không bị khựng.
 * 2. FALLBACK: Web Speech API cải tiến — chunk câu dài, chờ voices tải,
 *    chọn giọng vi khớp giới tính người dùng chọn (Google vi-VN nếu có).
 */
export function useVietnameseTTS() {
  const speakAction = useAction(api.aiChat.speak);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopFlagRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const [engine, setEngine] = useState<"server" | "browser" | null>(null);

  // Dọn audio element khi unmount
  useEffect(() => {
    return () => {
      stopFlagRef.current = true;
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
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
        if (stopFlagRef.current) return;
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

      // 1. Thử server TTS — timeout 12s, chậm/treo thì rời về Web Speech
      try {
        const res = await Promise.race([
          speakAction({
            text: clean.slice(0, 2400),
            voice: opts.voice ?? undefined,
            male: opts.male,
          }),
          new Promise<null>((resolve) =>
            window.setTimeout(() => resolve(null), 12_000),
          ),
        ]);
        if (res && !stopFlagRef.current) {
          // Gemini trả PCM thô → bọc WAV; mp3/WAV dùng nguyên bản
          const src = /L16|pcm/i.test(res.mime)
            ? `data:audio/wav;base64,${pcmToWav(res.audioBase64)}`
            : `data:${res.mime};base64,${res.audioBase64}`;
          const audio = new Audio(src);
          audioRef.current = audio;
          setEngine("server");
          setSpeaking(true);
          audio.onended = () => {
            setSpeaking(false);
            audioRef.current = null;
            opts.onDone?.();
          };
          audio.onerror = () => {
            setSpeaking(false);
            audioRef.current = null;
            // Server audio lỗi → rơi về Web Speech
            webSpeak(clean, opts.voice, opts.onDone);
          };
          try {
            await audio.play();
            return;
          } catch {
            setSpeaking(false);
            audioRef.current = null;
            webSpeak(clean, opts.voice, opts.onDone);
          }
          return;
        }
      } catch {
        /* không có khóa TTS hoặc lỗi server → fallback */
      }

      // 2. Fallback Web Speech
      if (!stopFlagRef.current) webSpeak(clean, opts.voice, opts.onDone);
      else opts.onDone?.();
    },
    [speakAction, webSpeak],
  );

  return { speak, speakBrowser: webSpeak, stop, speaking, engine };
}
