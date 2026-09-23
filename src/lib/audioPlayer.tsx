import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AudioTrack } from "@/data/audio";
import { formatTime } from "@/lib/player";

/* ------------------------------------------------------------------ */
/* TRÌNH PHÁT AUDIO ĐỘC LẬP — nghe kinh / nhạc thiền                   */
/* Tách hoàn toàn khỏi trình phát video (player.tsx): riêng state,     */
/* riêng element <audio>, riêng thanh điều khiển.                      */
/* ------------------------------------------------------------------ */

type AudioPlayerValue = {
  current: AudioTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  play: (track: AudioTrack) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  close: () => void;
  /** true khi đã bấm play ít nhất một lần — dùng để mount AudioBar */
  hasHistory: boolean;
};

const AudioPlayerContext = createContext<AudioPlayerValue | null>(null);

export function useAudioPlayer(): AudioPlayerValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);

  // Tạo một element audio duy nhất cho cả phiên
  useEffect(() => {
    const el = new Audio();
    el.preload = "metadata";
    audioRef.current = el;

    const onTime = () => setPosition(el.currentTime);
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onEnd = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWait = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWait);
    el.addEventListener("playing", onPlaying);

    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWait);
      el.removeEventListener("playing", onPlaying);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((track: AudioTrack) => {
    const el = audioRef.current;
    if (!el) return;
    setHasHistory(true);
    if (current?.id !== track.id) {
      el.src = track.url;
      el.load();
      setCurrent(track);
      setPosition(0);
      setDuration(0);
      setIsBuffering(true);
      void el.play().catch(() => setIsPlaying(false));
      return;
    }
    // Cùng bài — chỉ play/pause
    if (el.paused) void el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [current]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) void el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [current]);

  const seek = useCallback((sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    try {
      el.currentTime = Math.max(0, Math.min(sec, el.duration || sec));
      setPosition(el.currentTime);
    } catch {
      /* seek trước khi metadata sẵn sàng — bỏ qua */
    }
  }, []);

  const close = useCallback(() => {
    const el = audioRef.current;
    if (el) el.pause();
    setCurrent(null);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{ current, isPlaying, isBuffering, position, duration, play, toggle, seek, close, hasHistory }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export { formatTime };
