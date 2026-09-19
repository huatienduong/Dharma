import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Web Speech API — tìm kiếm bằng giọng nói                            */
/* ------------------------------------------------------------------ */

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

/**
 * Hook tìm kiếm giọng nói (tiếng Việt).
 * - `supported`: trình duyệt có hỗ trợ Web Speech API không.
 * - `listening`: đang nghe hay không.
 * - `start(onFinal)`: bắt đầu nghe; khi người dùng dừng nói sẽ gọi
 *   `onFinal(transcript)` với câu nhận diện cuối cùng.
 */
export function useVoiceSearch() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      recRef.current?.abort();
      recRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* đã dừng */
    }
  }, []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      // Hủy phiên trước (nếu còn) — không chờ onend
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }

      finalTextRef.current = "";
      onFinalRef.current = onFinal;

      const rec = new Ctor();
      rec.lang = "vi-VN";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => setListening(true);
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            finalTextRef.current += r[0].transcript;
          }
        }
      };
      rec.onerror = () => {
        setListening(false);
        recRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
        const text = finalTextRef.current.trim();
        if (text) onFinalRef.current?.(text);
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
    [],
  );

  return { supported, listening, start, stop };
}
