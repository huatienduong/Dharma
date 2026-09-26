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
  /**
   * Chạy khi âm thanh BẮT ĐẦU phát ra (sau khi đã có đủ dữ liệu).
   *
   * Tách khỏi onDone vì giai đoạn chờ máy chủ tổng hợp TTS có thể mất vài
   * giây — giao diện cần biết để hiện “đang chờ” thay vì im lặng, khiến
   * người dùng tưởng nút bị hỏng.
   */
  onStart?: () => void;
};

/* ------------------------------------------------------------------ */
/* AudioContext DÙNG CHUNG — cú chạm/bấm đầu tiên tạo + resume context */
/* này để phát sau đó (vượt autoplay policy kể cả trong iframe/webview */
/* — nguyên nhân chính của "đàm thoại im lặng").                       */
/* ------------------------------------------------------------------ */

let sharedCtx: AudioContext | null = null;
/**
 * BufferSource đang phát — giữ tham chiếu để CẮT NGAY khi người dùng
 * ngắt, thay vì đóng cả AudioContext.
 *
 * VÌ SAO ĐỔI: trước đây `stop()` đóng context rồi đặt null. Lượt phát sau
 * phải tạo context mới, mà context tạo ngoài cư chạm của người dùng thường
 * mở ở trạng thái `suspended` và `resume()` hay bị từ chối → `playWithWebAudio`
 * ném lỗi → rơi sang HTMLAudio rồi Web Speech. Đó là lý do “bấm nghe thử
 * giọng” lúc nào cũng loạt, và câu đầu tiên của mỗi lượt bị nuốt. Nay chỉ
 * dừng buffer, context vẫn sống và phát lần sau ổn định.
 */
let activeSource: AudioBufferSourceNode | null = null;
let speechPrimed = false;
let noVietnameseVoiceWarned = false;

/* ------------------------------------------------------------------ */
/* BỘ NHỚ ĐỆM ÂM THANH — làm nút “đọc lại” có tiếng ngay lập tức        */
/* ------------------------------------------------------------------ */
/*
 * VÌ SAO: mỗi lần bấm nút loa lại gọi TTS trên máy chủ (vài giây, có khi
 * hết hạn mức thì rơi về Web Speech và đọc sai giọng, hoặc không đọc) —
 * đó là lý do “lúc nghe được lúc không, lâu lâu mới trả lời”.
 *
 * Âm thanh đã tổng hợp được là GIỐNG HỆT nhau cho cùng một câu + cùng một
 * giọng, nên tải một lần rồi phát lại tức thì. Bản tải trước chạy nền ngay
 * khi câu trả lời vừa có → lần bấm đầu tiên cũng không phải chờ.
 */
const audioCache = new Map<string, string>();
/** Chỉ giữ vài câu gần nhất — audio base64 khá nặng, giữ nhiều sẽ phình RAM. */
const AUDIO_CACHE_MAX = 8;

function cacheKey(text: string, voice?: string | null, male?: boolean): string {
  return `${voice ?? ""}|${male ? 1 : 0}|${text}`;
}

function cachePut(key: string, src: string) {
  audioCache.set(key, src);
  // Bỏ phần tử cũ nhất (Map giữ thứ tự chèn) khi vượt trần.
  while (audioCache.size > AUDIO_CACHE_MAX) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
}

/** Xoá toàn bộ âm thanh đã đệm (đổi giọng hoặc cần giải phóng bộ nhớ). */
export function clearSpeechCache() {
  audioCache.clear();
}

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

/** Mở khóa cả Web Audio và Web Speech ngay trong cú chạm bắt đầu cuộc gọi. */
function primeBrowserAudio(): void {
  unlockSharedCtx();
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.resume();
  if (speechPrimed) return;
  try {
    const warmup = new SpeechSynthesisUtterance(" ");
    warmup.lang = "vi-VN";
    warmup.volume = 0;
    synth.speak(warmup);
    speechPrimed = true;
  } catch {
    /* Một số trình duyệt vẫn cho phép phát sau khi ctx đã resume. */
  }
}

/**
 * Phát audio (data URL) qua Web Audio — đáng tin cậy hơn HTMLAudioElement
 * trong iframe/webview. Promise resolve KHI PHÁT XONG, reject nếu lỗi.
 *
 * Có chốt chặn thời gian: nếu AudioContext bị trình duyệt khoá (suspended) —
 * việc `src.start()` chạy nhưng KHÔNG phát ra tiếng và `onended` không bao
 * giờ bắn — nếu không chốt chặn, lời gọi treo im lặng vĩnh viễn và các
 * nhánh dự phòng phía sau không bao giờ được gọi. Từ đây ta luôn reject
 * khi quá thời gian để rơi tiếp sang HTMLAudio / Web Speech.
 */
/** Đọc trạng thái context qua hàm riêng: TypeScript không thấy `resume()`
 *  thay đổi state nên sẽ suy ra kiểu quá hẹp và báo lỗi so sánh vô nghĩa. */
const ctxState = (c: AudioContext): AudioContextState => c.state;

/** Thử mở lại một context; trả về context đang chạy hoặc null. */
async function reviveCtx(c: AudioContext): Promise<AudioContext | null> {
  try {
    if (ctxState(c) === "suspended") await c.resume();
  } catch {
    /* iOS hay từ chối resume ngoài cư chạm */
  }
  if (ctxState(c) === "running") return c;
  return null;
}

async function playWithWebAudio(dataUrl: string): Promise<void> {
  let ctx = getSharedCtx();
  if (!ctx) throw new Error("no-webaudio");
  if (ctxState(ctx) === "suspended") {
    const alive = await reviveCtx(ctx);
    if (alive) {
      ctx = alive;
    } else {
      // Giữ context sống là cách ổn định nhất, nhưng nếu resume thất bại thì
      // context đó đã chết vĩnh viễn (đúng trường hợp iOS). Khi đó mới đóng
      // và tạo context mới — giữ lại cơ chế cứu hộ cũ, không bỏ.
      try {
        await ctx.close();
      } catch {
        /* noop */
      }
      if (sharedCtx === ctx) sharedCtx = null;
      ctx = getSharedCtx();
      if (!ctx) throw new Error("no-webaudio");
      ctx = (await reviveCtx(ctx)) ?? ctx;
    }
  }
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const buffer = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);

  return new Promise<void>((resolve, reject) => {
    // Vẫn suspended sau khi resume → không thể phat, trả về ngay để thử
    // đường khác thay vì chờ mãi.
    if (ctxState(ctx) !== "running") {
      reject(new Error("audio-context-suspended"));
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    activeSource = src;
    // Trừ thêm 3s cho việc giải mã/phát và cộng thêm độ dài âm thanh.
    const deadlineMs = (buffer.duration + 3) * 1000;
    const timer = window.setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* noop */
      }
      if (activeSource === src) activeSource = null;
      reject(new Error("webaudio-timeout"));
    }, deadlineMs);
    src.onended = () => {
      window.clearTimeout(timer);
      if (activeSource === src) activeSource = null;
      resolve();
    };
    // AudioBufferSourceNode không có onerror — lỗi phát hiện qua việc context
    // bị đóng giữa chừng: promise không resolve → chốt chặn ở trên bắt.
    src.start();
  });
}

/**
 * TTS tiếng Việt hai tầng cho Trợ lý Phật học:
 * 1. SERVER TTS (ưu tiên): Gemini TTS / OpenAI TTS trả về audio base64 →
 *    phát qua Web Audio (dự phòng HTMLAudio) — giọng tiếng Việt tự nhiên
 *    bất kể máy người dùng, đúng giọng người dùng đã chọn. TIMEOUT 4s:
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
    const unlock = () => primeBrowserAudio();
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
    // Cắt buffer đang phát qua Web Audio: dừng đúng source đang kêu (nghe
    // tắt ngay) mà GIỮ nguyên AudioContext, để lượt phát sau không phải
    // xin quyền phát lại từ đầu.
    if (activeSource) {
      try {
        activeSource.stop();
      } catch {
        /* noop */
      }
      activeSource = null;
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
      synth.resume();
      primeBrowserAudio();
      setEngine("browser");

      // Cảnh báo nếu máy không có giọng tiếng Việt: đọc tiếng Việt bằng
      // giọng nước ngoài nghe rất khó hiểu, và nhiều WebView đọc sai dấu.
      // Ghi log rõ ràng tốt hơn là im lặng không giải thích.
      if (!noVietnameseVoiceWarned) {
        const hasVi = synth
          .getVoices()
          .some((v) => v.lang?.toLowerCase().startsWith("vi"));
        if (!hasVi) {
          noVietnameseVoiceWarned = true;
          console.warn(
            "[TTS] Thiết bị không có giọng tiếng Việt — chất lượng đọc sẽ kém.",
          );
        }
      }

      const pref = getVoice(voiceId);

      // Chọn giọng vi ĐÚNG GIỚI TÍNH người dùng chọn, chờ voices tải nếu chưa.
      // VẤN ĐỀ: trước đây hàm này được gọi LẠI cho từng chunk trong cùng
      // một lượt đọc, mỗi lần `getVoices()` trả về một thứ tự khác nhau
      // (Chrome sắp xếp không ổn định) → câu đầu nghe giọng A, câu sau đổi
      // sang giọng B, nghe như "tự thay đổi giọng". Chốt giọng MỘT LẦN rồi
      // dùng lại cho cả lượt đọc.
      let pinnedVoice: SpeechSynthesisVoice | null = null;
      const pickVoice = (): SpeechSynthesisVoice | null => {
        if (pinnedVoice) return pinnedVoice;
        const voices = synth.getVoices();
        const viVoices = voices.filter((v) =>
          v.lang?.toLowerCase().startsWith("vi"),
        );
        const pool = viVoices.length > 0 ? viVoices : voices;
        if (pool.length === 0) return null;
        // ƯU TIÊN GIỚI TÍNH — fix "chọn nam nghe nữ":
        const genderFirst = pool.find((v) =>
          pref.male
            ? /male|nam(?!h)|nam-phong/i.test(v.name) &&
              !/female|nữ/i.test(v.name)
            : /female|nữ|hoa|linh/i.test(v.name),
        );
        // Sau đó mới đến giọng khớp mẫu tên của giọng đã chọn
        pinnedVoice = genderFirst ?? pool.find((v) => pref.browser.test(v.name)) ?? pool[0];
        return pinnedVoice;
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
      let chunkGuard = 0;
      let stallGuard = 0;
      let finished = false;
      const clearGuards = () => {
        if (chunkGuard) window.clearTimeout(chunkGuard);
        if (stallGuard) window.clearTimeout(stallGuard);
        chunkGuard = 0;
        stallGuard = 0;
      };
      // onDone ĐÚNG MỘT LẦN — bất kể đi đến đâu. Vòng đàm thoại treo vài
      // giây sau mỗi câu trả lời chính là do onDone không chạy: mic không
      // bao giờ mở lại, trạng thái kẹt “đang nói”.
      const finish = () => {
        if (finished) return;
        finished = true;
        clearGuards();
        setSpeaking(false);
        onDone?.();
      };
      const speakNext = () => {
        if (stopFlagRef.current) {
          finish();
          return;
        }
        if (idx >= chunks.length) {
          finish();
          return;
        }
        const chunk = chunks[idx++];
        let errorRetries = 0;
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = "vi-VN";
        // Cao độ/pace RIÊNG cho từng mẫu giọng (xem AI_VOICES) — trước đây
        // dùng công thức cứng nên 4 mẫu nữ nghe y hệt nhau, người dùng tưởng
        // giọng không đổi.
        u.rate = pref.rate;
        u.pitch = pref.pitch;
        u.volume = 1;
        const vi = pickVoice();
        if (vi) u.voice = vi;
        const advance = () => {
          clearGuards();
          speakNext();
        };
        u.onend = advance;
        u.onerror = () => {
          if (errorRetries < 1) {
            errorRetries++;
            idx--;
            clearGuards();
            synth.cancel();
            synth.resume();
            window.setTimeout(speakNext, 180);
            return;
          }
          finish();
        };
        synth.speak(u);
        // Một số WebView Android tạm dừng synth sau khi nhận mic.
        synth.resume();
        // CHỐT CHẶN 1: Chrome/WebView đôi khi NUỐT lệnh đọc — `speak()` được
        // gọi nhưng synth không phát gì và onend không bắn. Sau 1,2s mà
        // không có gì phát ra thì coi như đã đọc xong phần này.
        stallGuard = window.setTimeout(() => {
          if (synth.speaking || synth.pending) return;
          advance();
        }, 1200);
        // CHỐT CHẶN 2: trần thời gian theo độ dài câu. onend có thể không
        // bắn khi tab bị ẩn/treo giữa lúc đang đọc.
        chunkGuard = window.setTimeout(
          advance,
          Math.max(5000, chunk.length * 110) + 3000,
        );
      };

      setSpeaking(true);
      // Voices có thể tải trễ (Chrome) — thử phát sau 250ms nếu rỗng
      const tryStart = (attempt: number) => {
        if (stopFlagRef.current || finished) {
          finish();
          return;
        }
        if (synth.getVoices().length === 0 && attempt < 8) {
          window.setTimeout(() => tryStart(attempt + 1), 250);
          return;
        }
        // Chrome/WebView đôi khi bỏ qua lệnh ngay sau cancel().
        window.setTimeout(speakNext, 80);
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
      // Bỏ đường dẫn trước khi đọc to: đọc "https slash slash..." rất khó nghe,
      // người dùng vẫn thấy và bấm được link trong hội thoại.
      const clean = text
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      if (!clean) {
        opts.onDone?.();
        return;
      }

      let settled = false; // đảm bảo onDone chỉ chạy đúng một lần
      let audioWatchdog = 0;
      const finishWith = (fn?: () => void) => {
        window.clearTimeout(audioWatchdog);
        if (settled) return;
        settled = true;
        interruptRef.current = null;
        setSpeaking(false);
        try {
          fn?.();
        } catch {
          // `fn` thường là webSpeak. Nếu nó ném lỗi, onDone vẫn PHẢI chạy —
          // nếu không, vòng đàm thoại kẹt vĩnh viễn ở trạng thái “đang nói”
          // và micro không bao giờ mở lại được nữa.
          opts.onDone?.();
        }
      };
      // Đăng ký hủy có kiểm soát: stop() giữa chừng sẽ gọi onDone một lần
      interruptRef.current = () => {
        if (settled) return;
        finishWith(() => opts.onDone?.());
      };

      // 1. Lấy âm thanh. ƯU TIÊN BỘ NHỚ ĐỆM: đã tổng hợp sẵn thì phát ngay,
      //    không gọi mạng — đây là đường chính của nút đọc lại, bấm là có
      //    tiếng tức thì. Timeout 9s khi phải gọi máy chủ: TTS mất vài giây
      //    và có thể hết hạn mức, đó là lý do trước đây luc nghe duoc luc
      //    khong, lau lau moi tra loi.
      const key = cacheKey(clean, opts.voice, opts.male);
      let src = audioCache.get(key) ?? null;
      // Chỉ gọi máy chủ khi CHƯA có trong đệm.
      if (!src) {
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
              timeoutId = window.setTimeout(() => resolve(null), 9_000);
            }),
          ]);
          window.clearTimeout(timeoutId);

          if (res && !stopFlagRef.current) {
            // Gemini trả PCM thô → bọc WAV; mp3/WAV dùng nguyên bản
            src = /L16|pcm/i.test(res.mime)
              ? `data:audio/wav;base64,${pcmToWav(res.audioBase64)}`
              : `data:${res.mime};base64,${res.audioBase64}`;
            cachePut(key, src);
          }
        } catch {
          window.clearTimeout(timeoutId);
        }
      }

      if (src) {
        setEngine("server");
        setSpeaking(true);
        // Đã có đủ âm thanh: báo giao diện biết lượt phát bắt đầu.
        opts.onStart?.();

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
            audio.preload = "auto";
            audio.volume = 1;
            audio.setAttribute("playsinline", "true");
            audioRef.current = audio;
            audio.onended = () => {
              window.clearTimeout(audioWatchdog);
              audioRef.current = null;
              finishWith(() => opts.onDone?.());
            };
            audio.onerror = () => {
              window.clearTimeout(audioWatchdog);
              audioRef.current = null;
              finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
            };
            unlockSharedCtx();
            await audio.play();
            // Chốt chặn: một số WebView phát xong nhưng không bắn onended —
            // không có chốt chặn thì vòng đàm thoại kẹt vĩnh viễn ở trạng
            // thái "đang nói" và người dùng không nghe thấy gì cả.
            const estMs = Math.max(8_000, clean.length * 90);
            audioWatchdog = window.setTimeout(() => {
              if (audioRef.current !== audio) return;
              audioRef.current = null;
              try {
                audio.pause();
              } catch {
                /* noop */
              }
              finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
            }, estMs);
            return;
          } catch {
            window.clearTimeout(audioWatchdog);
            audioRef.current = null;
            /* HTMLAudio cũng lỗi → Web Speech */
          }
        finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
        return;
      }

      // Không có src (máy chủ hết hạn mức / lỗi / timeout) — kết thúc có kiểm
      // soát: đang dừng thì báo xong, không thì rời về giọng trình duyệt.
      if (stopFlagRef.current) {
        finishWith(() => opts.onDone?.());
      } else {
        finishWith(() => webSpeak(clean, opts.voice, opts.onDone));
      }
    },
    [speakAction, webSpeak],
  );

  /**
   * Tải sẵn âm thanh của một câu — chạy nền, KHÔNG phát gì.
   *
   * Gọi ngay khi câu trả lời vừa có, để khi người dùng bấm nút loa thì âm
   * thanh đã sẵn sàng: bấm là có tiếng ngay, không phải chờ mạng.
   */
  const prefetchSpeech = useCallback(
    (text: string, opts?: { voice?: string | null; male?: boolean }) => {
      const clean = text
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      if (!clean) return;
      const key = cacheKey(clean, opts?.voice, opts?.male);
      if (audioCache.has(key)) return;
      void speakAction({
        text: clean.slice(0, 2400),
        voice: opts?.voice ?? undefined,
        male: opts?.male,
        ...getDeviceMeta(),
      })
        .then((res) => {
          if (!res) return;
          const src = /L16|pcm/i.test(res.mime)
            ? `data:audio/wav;base64,${pcmToWav(res.audioBase64)}`
            : `data:${res.mime};base64,${res.audioBase64}`;
          cachePut(key, src);
        })
        .catch(() => {
          /* hết hạn mức / lỗi mạng — bấm nút sẽ tự đọc bình thường */
        });
    },
    [speakAction],
  );

  return {
    speak,
    speakBrowser: webSpeak,
    stop,
    prime: primeBrowserAudio,
    prefetch: prefetchSpeech,
    speaking,
    engine,
  };
}
