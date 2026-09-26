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
  const levelRef = useRef({ on: false, quiet: 0, started: 0 });
  const busyRef = useRef(false);
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
      void stopMicRecording();
    };
  }, []);

  /**
   * Chốt phiên nghe: dừng ghi âm, chép bằng Whisper rồi sửa chính tả.
   * Không bao giờ để người dùng mất câu nói vì bước này lỗi — luôn gọi
   * callback với bản tốt nhất trong tay.
   */
  const finish = useCallback(
    async (browserText: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const clip = await stopMicRecording();
        const fallback = browserText.trim();
        if (!clip?.base64) {
          if (fallback) onFinalRef.current?.(fallback);
          return;
        }
        setRefining(true);
        // Chép được thì luôn ưu tiên bản máy chủ: nó có dấu đầy đủ.
        const text = await transcribeClip(clip, fallback);
        if (text) onFinalRef.current?.(text);
      } finally {
        setRefining(false);
        setInterim("");
        setListening(false);
        busyRef.current = false;
      }
    },
    [transcribeClip],
  );

  const stop = useCallback(() => {
    if (recordOnlyRef.current) {
      const started = levelRef.current.started;
      levelRef.current = { on: false, quiet: 0, started };
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

      // Ghi âm song song: đây là nguồn văn bản chính xác nhất.
      const meter = (level: number) => {
        const state = levelRef.current;
        if (!state.started) state.started = Date.now();
        if (level >= VOICE_ON) {
          state.on = true;
          state.quiet = 0;
        } else if (state.on) {
          state.quiet += 50;
        }
        const spokenMs = Date.now() - state.started;
        if (state.on && state.quiet >= SILENCE_STOP_MS) {
          // Người dùng nói xong → chốt phiên.
          state.on = false;
          state.quiet = 0;
          void finish(finalTextRef.current);
        } else if (spokenMs >= MAX_RECORD_MS) {
          state.on = false;
          state.quiet = 0;
          void finish(finalTextRef.current);
        }
      };
      levelRef.current = { on: false, quiet: 0, started: 0 };
      void startMicRecording(meter);

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
    [finish],
  );

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
