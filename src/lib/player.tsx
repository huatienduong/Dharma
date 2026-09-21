/* ------------------------------------------------------------------ */
/* Trình phát video TOÀN CỤC — dock trong luồng trang (không nổi đè),  */
/* thẻ mini khi thu nhỏ, toàn màn hình qua Fullscreen API.             */
/* Trình phát YouTube đã tắt toàn bộ UI (controls/logo/info) và có     */
/* lớp chặn click → chỉ còn hình ảnh video thuần.                      */
/* ------------------------------------------------------------------ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLocation } from "react-router";
import { cn } from "@/lib/utils";

export type PlayerTalk = {
  _id: string;
  youtubeId: string;
  title: string;
  teacher?: string;
  channelName?: string;
  publishedAt?: string;
  durationSec: number;
};

type PlayerContextValue = {
  current: PlayerTalk | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  play: (talk: PlayerTalk) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  replay: () => void;
  close: () => void;
  isExpanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

/* --------------------------- helpers ------------------------------ */

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(Math.floor(n));
}

/* -------------------- các trang có giao diện riêng ------------------ */
/* Trình phát tự thu thành thẻ mini trên các trang này để không đè lên  */
/* bố cục riêng của chúng (phòng xem cùng có player riêng, trợ lý       */
/* Phật học full-screen, các trang đọc cần không gian tối đa).          */

const MINI_ROUTES = [
  "/watch",
  "/assistant",
  "/suttas",
  "/vinaya",
  "/meditation",
  "/calendar",
  "/dictionary",
  "/settings",
  "/profile",
];

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(sec: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  loadVideoById(id: string): void;
  destroy(): void;
  unMute(): void;
  setVolume(v: number): void;
  unloadModule(name: string): void;
};

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  /* -------- trạng thái -------- */
  const [current, setCurrent] = useState<PlayerTalk | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [isBuffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setExpanded] = useState(true);
  const [isFullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);

  /* -------- ref -------- */
  const hostRef = useRef<HTMLDivElement | null>(null); // node iframe luôn mounted
  const shellRef = useRef<HTMLDivElement | null>(null); // khung bọc ngoài (fullscreen)
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const captionsRef = useRef<number | null>(null);
  const pendingRef = useRef<PlayerTalk | null>(null);

  /* ------------------- khởi tạo iframe MỘT LẦN ------------------- */
  useEffect(() => {
    let disposed = false;
    void loadYouTubeApi().then(() => {
      if (disposed || !hostRef.current || playerRef.current) return;
      try {
        playerRef.current = new window.YT!.Player(hostRef.current, {
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            rel: 0,
            playsinline: 1,
            cc_load_policy: 0,
            hl: "vi",
          },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              e.target.unMute();
              e.target.setVolume(100);
              setReady(true);
              const pending = pendingRef.current;
              if (pending) {
                pendingRef.current = null;
                playerRef.current?.loadVideoById(pending.youtubeId);
              }
            },
            onStateChange: (e: { data: number }) => {
              const S = window.YT!.PlayerState;
              if (e.data === S.PLAYING) {
                setPlaying(true);
                setBuffering(false);
              } else if (e.data === S.PAUSED) {
                setPlaying(false);
              } else if (e.data === S.BUFFERING) {
                setBuffering(true);
              } else if (e.data === S.ENDED) {
                setPlaying(false);
                if (document.fullscreenElement) void document.exitFullscreen();
              }
            },
          },
        });
      } catch {
        /* YouTube API chưa sẵn sàng — thử lại ở lần phát tiếp theo */
      }
    });
    return () => {
      disposed = true;
    };
  }, []);

  /* -------- polling tiến trình 1s -------- */
  useEffect(() => {
    if (!current || !ready) return;
    pollRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setPosition(p.getCurrentTime() ?? 0);
        setDuration(p.getDuration() ?? 0);
      } catch {
        /* iframe chưa phản hồi — bỏ qua tick */
      }
    }, 1000);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [current, ready]);

  /* -------- tắt phụ đề định kỳ (YouTube có thể tự bật lại) -------- */
  useEffect(() => {
    if (!current) return;
    captionsRef.current = window.setInterval(() => {
      try {
        playerRef.current?.unloadModule("captions");
      } catch {
        /* bỏ qua */
      }
    }, 4000);
    return () => {
      if (captionsRef.current !== null) window.clearInterval(captionsRef.current);
      captionsRef.current = null;
    };
  }, [current]);

  /* -------- đồng bộ trạng thái fullscreen -------- */
  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* -------- auto mini trên trang có giao diện riêng -------- */
  useEffect(() => {
    if (!current) return;
    if (MINI_ROUTES.some((r) => path === r || path.startsWith(`${r}/`))) {
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  }, [path, current]);

  /* --------------------------- actions --------------------------- */
  const play = useCallback((talk: PlayerTalk) => {
    setCurrent(talk);
    setPosition(0);
    setDuration(Math.max(0, talk.durationSec ?? 0));
    const p = playerRef.current;
    if (p) {
      try {
        p.loadVideoById(talk.youtubeId);
        p.playVideo();
      } catch {
        pendingRef.current = talk;
      }
    } else {
      pendingRef.current = talk;
    }
  }, []);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* bỏ qua */
    }
  }, [isPlaying]);

  const seek = useCallback((sec: number) => {
    try {
      playerRef.current?.seekTo(Math.max(0, sec), true);
      setPosition(sec);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const replay = useCallback(() => {
    try {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
      setPosition(0);
    } catch {
      /* bỏ qua */
    }
  }, []);

  const close = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* bỏ qua */
    }
    setCurrent(null);
    setPosition(0);
    setDuration(0);
    setExpanded(true);
    if (document.fullscreenElement) void document.exitFullscreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    const el = shellRef.current;
    if (!el) return;
    void el.requestFullscreen?.().catch(() => {
      /* trình duyệt chặn — bỏ qua */
    });
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      isPlaying,
      isBuffering,
      position,
      duration,
      play,
      toggle,
      seek,
      replay,
      close,
      isExpanded,
      setExpanded,
      isFullscreen,
      toggleFullscreen,
    }),
    [current, isPlaying, isBuffering, position, duration, play, toggle, seek, replay, close, isExpanded, isFullscreen, toggleFullscreen],
  );

  /* -------- ẩn player (không unmount — giữ iframe sống) -------- */
  const mode: "docked" | "mini" | "hidden" = !current
    ? "hidden"
    : isExpanded
      ? "docked"
      : "mini";

  return (
    <PlayerContext.Provider value={value}>
      {/* Shell render TRƯỚC children: ở chế độ dock, video nổi ở đầu trang
          (trên thanh tìm kiếm + danh sách) thay vì đáy trang. */}
      <div
        ref={shellRef}
        className={cn(
          "z-30",
          mode === "docked" && "relative w-full lg:pl-60",
          mode === "mini" &&
            "fixed bottom-[4.6rem] right-4 z-[95] w-[min(20rem,calc(100vw-2rem))] lg:bottom-4",
          mode === "hidden" &&
            "pointer-events-none fixed left-[-9999px] top-[-9999px] w-72 opacity-0",
        )}
      >
        {/* Container căn giữa — chỉ có tác dụng bố cục ở chế độ dock.
            Chế độ khác dùng display:contents để node vẫn tồn tại. */}
        <div
          className={cn(
            mode === "docked"
              ? "mx-auto w-full max-w-5xl px-3 pt-2 sm:px-5"
              : "contents",
          )}
        >
          <div
            className={cn(
              "overflow-hidden bg-black shadow-2xl",
              mode === "docked" && "rounded-2xl ring-1 ring-black/20",
              mode === "mini" && "rounded-xl ring-1 ring-black/30",
              isFullscreen && "flex h-screen w-screen items-center justify-center rounded-none",
            )}
          >
            <div
              className={cn(
                "yt-frame relative w-full",
                (mode === "docked" || mode === "mini") && "aspect-video",
                isFullscreen && "h-full w-full max-w-none",
              )}
            >
              {/* Node iframe luôn mounted — mọi chế độ dùng chung một iframe */}
              <div ref={hostRef} className="absolute inset-0" />
              {/* Lớp chặn click: YouTube logo / watermark / thông tin không thể thao tác */}
              <div className="absolute inset-0 z-10" />
            </div>

            {/* ---------- Bảng điều khiển riêng của app ---------- */}
            {mode !== "hidden" && !isFullscreen && (
              <div className="flex items-center gap-1 border-t border-white/10 bg-zinc-950 px-2 py-1.5">
                <span className="px-1.5 text-[11px] tabular-nums text-white/70">
                  {formatTime(position)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.floor(duration))}
                  value={Math.min(position, Math.floor(duration) || 0)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Tua video"
                  className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-400 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                  style={{
                    background: `linear-gradient(to right, rgb(251 191 36) ${
                      duration > 0 ? (position / Math.max(1, duration)) * 100 : 0
                    }%, rgba(255,255,255,0.2) ${
                      duration > 0 ? (position / Math.max(1, duration)) * 100 : 0
                    }%)`,
                  }}
                />
                <span className="px-1.5 text-[11px] tabular-nums text-white/70">
                  {formatTime(duration)}
                </span>
                <CtlButton onClick={replay} title="Xem lại từ đầu">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 5V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" />
                  </svg>
                </CtlButton>
                <CtlButton onClick={toggle} title={isPlaying ? "Tạm dừng" : "Phát"}>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </CtlButton>
                <CtlButton
                  onClick={() => setExpanded(false)}
                  title="Thu nhỏ"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z" />
                  </svg>
                </CtlButton>
                <CtlButton onClick={toggleFullscreen} title="Toàn màn hình">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                </CtlButton>
                <CtlButton onClick={close} title="Đóng trình phát">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </CtlButton>
              </div>
            )}

            {/* Điều khiển tối giản khi toàn màn hình */}
            {isFullscreen && (
              <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                <CtlButton onClick={toggle} title={isPlaying ? "Tạm dừng" : "Phát"} big>
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </CtlButton>
                <span className="text-xs tabular-nums text-white/80">
                  {formatTime(position)} / {formatTime(duration)}
                </span>
                <span className="flex-1" />
                <CtlButton onClick={toggleFullscreen} title="Thoát toàn màn hình" big>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                </CtlButton>
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </PlayerContext.Provider>
  );
}

function CtlButton({
  children,
  onClick,
  title,
  big,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95",
        big ? "h-9 w-9" : "h-7 w-7",
      )}
    >
      {children}
    </button>
  );
}
