import { api } from "@/convex/_generated/api";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import {
  startMicRecording,
  stopMicRecording,
  type MicClip,
} from "@/lib/micRecorder";
import { useAction } from "convex/react";
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
 * - `refining`: đang chép lại bằng Whisper (bước làm văn bản chính xác hơn).
 * - `start(onFinal)`: bắt đầu nghe; khi người dùng dừng nói sẽ gọi
 *   `onFinal(transcript)` với câu đã được chép lại.
 */
export function useVoiceSearch() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [refining, setRefining] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const finalTextRef = useRef("");
  const transcribe = useAction(api.aiChat.transcribe);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      recRef.current?.abort();
      recRef.current = null;
      void stopMicRecording();
    };
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* đã dừng */
    }
  }, []);

  /**
   * Chép lại bằng Whisper; thất bại thì giữ bản trình duyệt.
   * Không bao giờ để người dùng mất câu nói vì bước này lỗi.
   */
  const refine = useCallback(
    async (browserText: string, clip: MicClip | null): Promise<string> => {
      if (!clip?.base64) return browserText;
      setRefining(true);
      try {
        const res = await transcribe({
          audioBase64: clip.base64,
          audioMime: clip.mime,
          ...getDeviceMeta(),
        });
        if (res.ok && res.text.trim().length >= 2) return res.text.trim();
      } catch {
        /* giữ bản trình duyệt */
      } finally {
        setRefining(false);
      }
      return browserText;
    },
    [transcribe],
  );

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
      void stopMicRecording();

      finalTextRef.current = "";
      onFinalRef.current = onFinal;
      // Ghi âm song song để có bản chép chính xác từ Whisper.
      void startMicRecording();

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
        if (!text) {
          void stopMicRecording();
          return;
        }
        void stopMicRecording().then((clip) =>
          refine(text, clip).then((finalText) => {
            if (finalText) onFinalRef.current?.(finalText);
          }),
        );
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
    [refine],
  );

  return { supported, listening, refining, start, stop, refine };
}
