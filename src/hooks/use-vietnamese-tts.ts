import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TTS tiếng Việt hai tầng cho Trợ lý Pháp:
 * 1. SERVER TTS (ưu tiên): Gemini TTS / OpenAI TTS trả về audio base64 →
 *    phát qua <Audio> — giọng tiếng Việt tự nhiên bất kể máy người dùng.
 * 2. FALLBACK: Web Speech API cải tiến — chunk câu dài, chờ voices tải,
 *    chọn giọng vi tốt nhất (Google vi-VN nếu có).
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
    (text: string, onDone?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onDone?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      setEngine("browser");

      // Chọn giọng vi tốt nhất, chờ voices tải nếu chưa
      const pickVoice = () => {
        const voices = synth.getVoices();
        const viVoices = voices.filter((v) =>
          v.lang?.toLowerCase().startsWith("vi"),
        );
        // Ưu tiên Google vi-VN (nếu có), sau đó bất kỳ giọng vi nào
        return (
          viVoices.find((v) => /google/i.test(v.name)) ?? viVoices[0]
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
    async (text: string, onDone?: () => void) => {
      stopFlagRef.current = false;
      const clean = text.trim();
      if (!clean) {
        onDone?.();
        return;
      }

      // 1. Thử server TTS
      try {
        const res = await speakAction({ text: clean.slice(0, 2400) });
        if (res && !stopFlagRef.current) {
          const audio = new Audio(`data:${res.mime};base64,${res.audioBase64}`);
          audioRef.current = audio;
          setEngine("server");
          setSpeaking(true);
          audio.onended = () => {
            setSpeaking(false);
            audioRef.current = null;
            onDone?.();
          };
          audio.onerror = () => {
            setSpeaking(false);
            audioRef.current = null;
            // Server audio lỗi → rơi về Web Speech
            webSpeak(clean, onDone);
          };
          await audio.play().catch(() => {
            setSpeaking(false);
            webSpeak(clean, onDone);
          });
          return;
        }
      } catch {
        /* không có khóa TTS hoặc lỗi server → fallback */
      }

      // 2. Fallback Web Speech
      webSpeak(clean, onDone);
    },
    [speakAction, webSpeak],
  );

  return { speak, stop, speaking, engine };
}
