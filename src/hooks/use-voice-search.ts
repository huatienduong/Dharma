import { api } from "@/convex/_generated/api";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import {
  isMicRecordingSupported,
  startMicRecording,
  stopMicRecording,
  type MicClip,
} from "@/lib/micRecorder";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Nghe câu hỏi bằng giọng nói (tiếng Việt)                             */
/* ------------------------------------------------------------------ */

/*
 * Ba tầng, tầng nào cũng đủ dùng:
 *  1. Web Speech cho văn bản tạm (người dùng thấy mình đang nói gì).
 *  2. Whisper chép lại từ âm thanh — chính xác hơn hẳn bản nghe trình duyệt.
 *  3. Model ngôn ngữ sửa nốt dấu tiếng Việt (chạy trên máy chủ).
 * Nếu trình duyệt không có Web Speech (Firefox, một số WebView) thì bỏ
 * tầng 1: chỉ ghi âm rồi chép — vẫn cho ra câu đúng dấu.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Ngưỡng coi là "đang nói" (RMS 0–1). */
const VOICE_ON = 0.045;
/** Im lặng liên tục bao lâu thì coi như nói xong (ms). */
const SILENCE_STOP_MS = 1100;
/** Chặn mic sớm tối đa bao lâu (ms). */
const MAX_RECORD_MS = 30_000;

export function useVoiceSearch() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [refining, setRefining] = useState(false);
  /** Văn bản tạm để người dùng biết đang nói được gì. */
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const finalTextRef = useRef("");
  /** true = không có Web Speech: chỉ ghi âm, tự chốt khi im lặng. */
  const recordOnlyRef = useRef(false);
  /**
   * Mốc thời gian của phiên nghe đang chạy. Mọi tín hiệu (chữ từ trình duyệt,
   * mức âm lượng) chỉ cập nhật các mốc này; quyết định "nói xong" do một
   * đồng hồ đọc chúng. Nhờ vậy việc tự gửi không phụ thuộc vào tần số đo
   * âm lượng — trước đây bộ đo có thể chết (rAF bị treo trên điện thoại)
   * là người dùng nói xong mà không bao giờ gửi được.
   */
  const sessionRef = useRef({
    loudSince: 0,
    lastLoudAt: 0,
    lastActivityAt: 0,
    heardSomething: false,
    watchdog: 0,
    autoRestarts: 0,
  });
  const busyRef = useRef(false);
  /** Giữ `start` để `finish` có thể mở lại phiên nghe khi nghe hụt. */
  const startRef = useRef<((onFinal: (text: string) => void) => void) | null>(
    null,
  );
  const transcribe = useAction(api.aiChat.transcribe);

  /**
   * Chép một clip đã ghi sẵn (dùng cho chế độ đàm thoại, nơi vòng nghe do
   * trang quản lý chứ không qua hook này). Luôn trả về chuỗi dùng được:
   * thất bại thì lùi về bản trình duyệt.
   */
  const transcribeClip = useCallback(
    async (clip: MicClip | null, browserText: string): Promise<string> => {
      const fallback = browserText.trim();
      if (!clip?.base64) return fallback;
      setRefining(true);
      try {
        const res = await transcribe({
          audioBase64: clip.base64,
          audioMime: clip.mime,
          browserText: fallback || undefined,
          ...getDeviceMeta(),
        });
        return res.ok && res.text.trim() ? res.text.trim() : fallback;
      } catch {
        return fallback;
      } finally {
        setRefining(false);
      }
    },
    [transcribe],
  );

  useEffect(() => {
    setSupported(
      getRecognitionCtor() !== null || isMicRecordingSupported(),
    );
    return () => {
      recRef.current?.abort();
      recRef.current = null;
      // Dọn đồng hồ tự gửi để không chốt câu sau khi đã rời trang.
      if (sessionRef.current.watchdog) {
        window.clearInterval(sessionRef.current.watchdog);
        sessionRef.current.watchdog = 0;
      }
      void stopMicRecording();
    };
  }, []);

  /** Bỏ đồng hồ theo dõi của phiên nghe (khi đã chốt hoặc huỷ). */
  const stopWatchdog = useCallback(() => {
    const s = sessionRef.current;
    if (s.watchdog) {
      window.clearInterval(s.watchdog);
      s.watchdog = 0;
    }
  }, []);

  /**
   * Chốt phiên nghe: dừng ghi âm, chép bằng Whisper rồi sửa chính tả.
   * Không bao giờ để người dùng mất câu nói vì bước này lỗi — luôn gọi
   * callback với bản tốt nhất trong tay.
   *
   * Nếu cuối cùng vẫn rỗng (nghe trúng tiếng ồn, mic bị chặn), tự mở lại
   * phiên nghe một lần để người dùng chỉ cần nói tiếp, không phải bấm lại
   * nút micro.
   */
  const finish = useCallback(
    async (browserText: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      stopWatchdog();
      // Người dùng đã mở mic nhưng không nói gì: tắt luôn, khỏi bắt họ nói
      // lại rồi mới báo "chưa nghe rõ".
      const spoke = sessionRef.current.heardSomething;
      let heard = "";
      try {
        const clip = await stopMicRecording();
        const fallback = browserText.trim();
        if (!clip?.base64) {
          heard = fallback;
        } else {
          setRefining(true);
          // Chép được thì luôn ưu tiên bản máy chủ: nó có dấu đầy đủ.
          heard = await transcribeClip(clip, fallback);
        }
      } catch {
        heard = browserText.trim();
      } finally {
        setRefining(false);
        setInterim("");
        setListening(false);
        busyRef.current = false;
      }
      if (heard) {
        onFinalRef.current?.(heard);
        return;
      }
      if (!spoke) return;
      // Không nghe được gì: báo ngắn gọn và mở lại mic một lần.
      onFinalRef.current?.("");
      const s = sessionRef.current;
      if (s.autoRestarts < 1) {
        s.autoRestarts += 1;
        window.setTimeout(() => {
          const again = onFinalRef.current;
          if (again) startRef.current?.(again);
        }, 400);
      }
    },
    [stopWatchdog, transcribeClip],
  );

  const stop = useCallback(() => {
    if (recordOnlyRef.current) {
      void finish(finalTextRef.current);
      return;
    }
    try {
      recRef.current?.stop();
    } catch {
      /* đã dừng */
    }
  }, [finish]);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      if (busyRef.current) return;
      const Ctor = getRecognitionCtor();
      // Không có nguồn nghe nào → không bật nút cho dở dang.
      if (!Ctor && !isMicRecordingSupported()) return;
      onFinalRef.current = onFinal;
      finalTextRef.current = "";
      setInterim("");

      // Hủy phiên trước (nếu còn) — không chờ onend
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
      void stopMicRecording();

      const s = sessionRef.current;
      stopWatchdog();
      s.loudSince = 0;
      s.lastLoudAt = 0;
      s.lastActivityAt = Date.now();
      s.heardSomething = false;
      s.autoRestarts = 0;

      // Ghi âm song song: đây là nguồn văn bản chính xác nhất.
      const meter = (level: number) => {
        const now = Date.now();
        if (level >= VOICE_ON) {
          if (!s.loudSince) s.loudSince = now;
          s.lastLoudAt = now;
          s.heardSomething = true;
        }
      };
      void startMicRecording(meter);

      // ĐỒNG HỒ TỰ GỬI: chốt câu khi đã nghe thấy gì đó rồi im lặng đủ lâu,
      // hoặc kể cả khi bộ đo âm lượng không còn chạy. Nhờ vậy "nói xong"
      // luôn dẫn tới một tin nhắn được gửi đi.
      s.watchdog = window.setInterval(() => {
        if (busyRef.current) return;
        const now = Date.now();
        const heard = finalTextRef.current.trim();
        if (heard) s.heardSomething = true;
        // Trần chặn mic: dù đang nói hay không, quá lâu cũng phải chốt.
        if (now - s.lastActivityAt >= MAX_RECORD_MS) {
          stopWatchdog();
          void finish(heard);
          return;
        }
        if (!s.heardSomething) return;
        // Đo bằng mức âm lượng khi có; nếu bộ đo chết (điện thoại bị treo,
        // app bị đưa ra sau) thì đo bằng thời gian im lặng của chữ nhận
        // được — nhờ đó câu nói vẫn được gửi đúng lúc người dùng dứt lời.
        const quietFor = s.loudSince ? now - s.lastLoudAt : now - s.lastActivityAt;
        if (quietFor >= SILENCE_STOP_MS) {
          stopWatchdog();
          void finish(heard);
        }
      }, 250);

      // Tầng 1 không có → chỉ ghi âm, dựa vào đo mức để tự chốt.
      if (!Ctor) {
        recordOnlyRef.current = true;
        setListening(true);
        return;
      }
      recordOnlyRef.current = false;

      const rec = new Ctor();
      rec.lang = "vi-VN";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => setListening(true);
      rec.onresult = (e) => {
        let pending = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalTextRef.current += r[0].transcript;
          else pending += r[0].transcript;
        }
        sessionRef.current.lastActivityAt = Date.now();
        sessionRef.current.heardSomething = true;
        setInterim(pending);
      };
      rec.onerror = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
        const text = finalTextRef.current.trim();
        // Bản trình duyệt rỗng thì vẫn thử chép từ âm thanh đã ghi.
        void finish(text);
      };

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        // Một số trình duyệt ném lỗi nếu start quá sớm — bỏ qua
        setListening(false);
        recRef.current = null;
      }
    },
    [finish, stopWatchdog],
  );

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  return {
    supported,
    listening,
    refining,
    interim,
    start,
    stop,
    transcribeClip,
  };
}
