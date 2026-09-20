import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronDown,
  Maximize,
  Minimize,
  RotateCcw,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
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

/* ------------------------------------------------------------------ */
/* YouTube IFrame API                                                  */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
            onError?: (e: { data: 2 | 5 | 100 | 101 | 150 }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(sec: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

let ytApiPromise: Promise<YTNamespace> | null = null;
type YTNamespace = NonNullable<Window["YT"]>;

function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "1.234 lượt xem" -> "1,2 Tr" · "1,5 N" · "230 N" */
export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} Tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} Tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")} N`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/* Types + Context                                                     */
/* ------------------------------------------------------------------ */

export interface PlayerTalk {
  _id: Id<"dhammaTalks">;
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
  viewCount?: number;
}

interface PlayerContextValue {
  current: PlayerTalk | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  play(talk: PlayerTalk): void;
  toggle(): void;
  seek(sec: number): void;
  close(): void;
  replay(): void;
  /** true khi video đang ở chế độ "rời đi" (thu nhỏ thành thẻ mini) */
  isExpanded: boolean;
  setExpanded(v: boolean): void;
  /** true khi video đang chiếm toàn màn hình (Fullscreen API) */
  isFullscreen: boolean;
  toggleFullscreen(): void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer phải dùng bên trong <PlayerProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

const SAVE_INTERVAL_MS = 10_000;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const savedProgress = useQuery(
    api.dhamma.myProgress,
    isAuthenticated ? {} : "skip",
  );
  const saveProgress = useMutation(api.dhamma.saveProgress);
  const resetProgress = useMutation(api.dhamma.resetProgress);

  const ytTargetRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  /* ----- Đồng bộ trạng thái fullscreen (thoát bằng Esc/nút hệ thống) ----- */
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const [current, setCurrent] = useState<PlayerTalk | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  /** true = thẻ mini; false = video dock trên cùng trang (inline) */
  const [expanded, setExpanded] = useState(true);
  const [showFallback, setShowFallback] = useState(false);

  const pendingSeekRef = useRef<number | null>(null);
  const talkRef = useRef<PlayerTalk | null>(null);
  const savedForTalkRef = useRef<Map<string, number>>(new Map());
  const [queued, setQueued] = useState<PlayerTalk | null>(null);

  /* ----- Tạo player MỘT LẦN ngay khi app mở -----
     - Khung chứa iframe luôn mounted (nằm ngoài mọi điều kiện render).
     - Node con tạm được tạo bằng DOM API: React chỉ quản lý host trống,
       iframe sống bên trong node tạm → an toàn với re-render/StrictMode.
     - origin thật của trang (YouTube từ chối phát nếu origin sai). */
  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      const host = ytTargetRef.current;
      if (!host || playerRef.current) return;
      const mount = document.createElement("div");
      host.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          controls: 0, // TẮT TOÀN BỘ UI YouTube — chỉ còn khung hình video
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            const S = window.YT!.PlayerState;
            if (e.data === S.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
              const st = pendingSeekRef.current;
              if (st != null && playerRef.current) {
                playerRef.current.seekTo(st, true);
                pendingSeekRef.current = null;
              }
            } else if (e.data === S.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
              const t = talkRef.current;
              if (t && playerRef.current) {
                try {
                  persistProgress(
                    t,
                    playerRef.current.getCurrentTime(),
                    playerRef.current.getDuration(),
                  );
                } catch {
                  /* noop */
                }
              }
            } else if (e.data === S.BUFFERING) {
              setIsBuffering(true);
            } else if (e.data === S.ENDED) {
              const t = talkRef.current;
              const dur = playerRef.current?.getDuration() ?? 0;
              if (t && dur > 0) persistProgress(t, dur, dur);
              // Thoát fullscreen nếu đang bật
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => {});
              }
              talkRef.current = null;
              setCurrent(null);
              setIsPlaying(false);
              setIsBuffering(false);
              setPosition(0);
              setDuration(0);
              setExpanded(true);
            }
          },
          onError: () => {
            setShowFallback(true);
            setIsPlaying(false);
            setIsBuffering(false);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* player chưa sẵn sàng */
      }
      playerRef.current = null;
      setPlayerReady(false);
      if (ytTargetRef.current) ytTargetRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    talkRef.current = current;
  }, [current]);

  /* ----- Phát một pháp thoại (tiếp tục từ vị trí đã lưu) ----- */
  const play = useCallback(
    (talk: PlayerTalk) => {
      setShowFallback(false);
      // Mới phát → luôn mở video dock phía trên (không nổi đè nội dung)
      setExpanded(true);
      setCurrent(talk);
      setPosition(0);
      setDuration(talk.durationSec > 0 ? talk.durationSec : 0);

      const resumeSec = savedForTalkRef.current.get(talk.youtubeId) ?? 0;
      pendingSeekRef.current = resumeSec > 5 ? resumeSec : null;

      if (!playerReady || !playerRef.current) {
        setQueued(talk);
        return;
      }
      playerRef.current.loadVideoById(talk.youtubeId);
      playerRef.current.playVideo();
    },
    [playerReady],
  );

  useEffect(() => {
    if (playerReady && queued) {
      const t = queued;
      setQueued(null);
      play(t);
    }
  }, [playerReady, queued, play]);

  /* ----- Vòng lặp 500ms: cập nhật vị trí ----- */
  useEffect(() => {
    if (!current) return;
    const iv = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const pos = p.getCurrentTime();
        const dur = p.getDuration();
        if (Number.isFinite(pos)) setPosition(pos);
        if (Number.isFinite(dur) && dur > 0) setDuration(dur);
        if (talkRef.current && Number.isFinite(pos)) {
          savedForTalkRef.current.set(talkRef.current.youtubeId, pos);
        }
      } catch {
        /* player đang khởi tạo */
      }
    }, 500);
    return () => window.clearInterval(iv);
  }, [current]);

  /* ----- Lưu tiến trình (chỉ server khi đăng nhập — không còn bản cục bộ) ----- */
  const persistProgress = useCallback(
    (t: PlayerTalk, positionSec: number, durationSec: number) => {
      if (positionSec < 3) return;
      if (isAuthenticated) {
        void saveProgress({
          youtubeId: t.youtubeId,
          positionSec,
          durationSec,
        }).catch(() => {
          /* bỏ qua lỗi mạng tạm thời */
        });
      }
    },
    [isAuthenticated, saveProgress],
  );

  /* ----- Vòng lặp 10s: lưu tiến trình khi đang phát ----- */
  useEffect(() => {
    if (!current) return;
    const iv = window.setInterval(() => {
      const p = playerRef.current;
      const t = talkRef.current;
      if (!p || !t || !isPlaying) return;
      try {
        persistProgress(t, p.getCurrentTime(), p.getDuration());
      } catch {
        /* bỏ qua */
      }
    }, SAVE_INTERVAL_MS);
    return () => window.clearInterval(iv);
  }, [current, isPlaying, persistProgress]);

  /* ----- Lưu lần cuối khi ẩn trang / unmount ----- */
  useEffect(() => {
    const handler = () => {
      const p = playerRef.current;
      const t = talkRef.current;
      if (!p || !t) return;
      try {
        persistProgress(t, p.getCurrentTime(), p.getDuration());
      } catch {
        /* noop */
      }
    };
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      handler();
    };
  }, [persistProgress]);

  /* ----- Nạp tiến trình đã lưu từ Convex (duy nhất — không còn bản cục bộ) ----- */
  useEffect(() => {
    const map = new Map<string, number>();
    if (savedProgress) {
      for (const row of savedProgress) {
        map.set(row.youtubeId, row.positionSec);
      }
    }
    savedForTalkRef.current = map;
  }, [savedProgress]);

  /* ----- Điều khiển ----- */
  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === window.YT!.PlayerState.PLAYING) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }, []);

  const seek = useCallback((sec: number) => {
    playerRef.current?.seekTo(Math.max(0, sec), true);
    setPosition(Math.max(0, sec));
  }, []);

  const close = useCallback(() => {
    const p = playerRef.current;
    const t = talkRef.current;
    if (p && t) {
      try {
        persistProgress(t, p.getCurrentTime(), p.getDuration());
      } catch {
        /* noop */
      }
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    p?.pauseVideo();
    talkRef.current = null;
    setCurrent(null);
    setPosition(0);
    setDuration(0);
    setExpanded(true);
    setShowFallback(false);
  }, [persistProgress]);

  const replay = useCallback(() => {
    const t = talkRef.current ?? current;
    if (!t) return;
    if (isAuthenticated) void resetProgress({ youtubeId: t.youtubeId });
    savedForTalkRef.current.delete(t.youtubeId);
    play(t);
  }, [current, isAuthenticated, play, resetProgress]);

  /* ----- Toàn màn hình: Fullscreen API trên khung chứa ----- */
  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }, []);

  /* ----- Media Session: điều khiển từ màn hình khóa ----- */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.teacher,
      album: "Dharma",
    });
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [current, toggle]);

  /* ----- Tiêu đề tab khi nghe nền ----- */
  useEffect(() => {
    const base = "Dharma — Giới - Định - Tuệ";
    document.title = current && isPlaying ? `▶ ${current.title}` : base;
  }, [current, isPlaying]);

  /* ----- Thu nhỏ về thẻ mini bằng phím Esc (khi đang dock) ----- */
  useEffect(() => {
    if (!current || expanded || isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, expanded, isFullscreen]);

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
      close,
      replay,
      isExpanded: !expanded, // true khi đang thẻ mini (thu nhỏ)
      setExpanded: (v: boolean) => setExpanded(!v),
      isFullscreen,
      toggleFullscreen,
    }),
    [
      current,
      isPlaying,
      isBuffering,
      position,
      duration,
      play,
      toggle,
      seek,
      close,
      replay,
      expanded,
      isFullscreen,
      toggleFullscreen,
    ],
  );

  const showPlayer = current != null;

  return (
    <PlayerContext.Provider value={value}>
      {children}

      {/* ----- Lớp trình phát DOCK: nằm trong luồng trang, KHÔNG nổi đè.
            Khi có video, một khoảng trống chiếm chỗ phía trên trang
            (placeholder) và iframe được neo vào đó bằng position sticky
            — mọi nội dung đều nằm dưới, không bị che hay thao tác khó. ----- */}
      {showPlayer && !expanded && (
        <>
          {/* Khoảng đệm chiếm chỗ (16:9 + thanh điều khiển) để nội dung
              không bị trình phát che — cuộn theo trang bình thường */}
          <div aria-hidden className="h-0" />

          <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
            <div className="pointer-events-auto mx-auto w-full max-w-5xl px-3 pt-2 sm:px-5 lg:pt-6">
              <div
                ref={wrapperRef}
                className="overflow-hidden rounded-xl border border-border/70 bg-black shadow-lg"
              >
                <div className="relative aspect-video w-full">
                  {/* Khung chứa iframe — host luôn trống trong JSX */}
                  <div ref={ytTargetRef} className="absolute inset-0 h-full w-full" />
                  {/* Lớp phủ chặn mọi click vào UI/logo YouTube */}
                  <div className="absolute inset-0" aria-hidden />
                </div>
                <PlayerBar
                  title={current.title}
                  teacher={current.teacher}
                  channelName={current.channelName}
                  isBuffering={isBuffering}
                  isPlaying={isPlaying}
                  position={position}
                  duration={duration}
                  onSeek={seek}
                  onToggle={toggle}
                  onReplay={replay}
                  onCollapse={() => setExpanded(false)}
                  onClose={close}
                  fullscreen={isFullscreen}
                  onFullscreen={toggleFullscreen}
                />
              </div>
              {showFallback && (
                <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                  Video này không cho phép phát nhúng. Vui lòng chọn video khác.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ----- Thẻ mini khi thu nhỏ ----- */}
      {showPlayer && expanded && (
        <MiniPlayerCard
          title={current.title}
          isBuffering={isBuffering}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onSeek={seek}
          onToggle={toggle}
          onClose={close}
          onExpand={() => setExpanded(true)}
          showFallback={showFallback}
        />
      )}

      {/* ----- Khung chứa iframe khi ẩn / chưa có video — LUÔN mounted.
            Khi trình phát dock đang hiển thị, iframe đã sống trong dock ở
            trên; React giữ 2 host (dock + ẩn) nhưng chỉ MỘT host có player:
            ta di chuyển node bằng appendChild khi chuyển chế độ. ----- */}
      {!showPlayer && (
        <div
          aria-hidden
          className="fixed left-[-9999px] top-[-9999px] h-[180px] w-[320px] overflow-hidden opacity-0"
        >
          <div ref={ytTargetRef} className="h-full w-full" />
        </div>
      )}
    </PlayerContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Thanh điều khiển nằm NGAY DƯỚI video (phong cách YouTube thu gọn)   */
/* ------------------------------------------------------------------ */

function PlayerBar({
  title,
  teacher,
  channelName,
  isBuffering,
  isPlaying,
  position,
  duration,
  onSeek,
  onToggle,
  onReplay,
  onCollapse,
  onClose,
  fullscreen,
  onFullscreen,
}: {
  title: string;
  teacher: string;
  channelName: string;
  isBuffering: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  onSeek(sec: number): void;
  onToggle(): void;
  onReplay(): void;
  onCollapse(): void;
  onClose(): void;
  fullscreen: boolean;
  onFullscreen(): void;
}) {
  return (
    <div className="bg-card border-t border-border/60">
      {/* Thanh tua */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="w-11 shrink-0 tabular-nums text-xs text-muted-foreground">
          {formatTime(position)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          value={Math.floor(position)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--gold)]"
          aria-label="Tua theo thời gian"
        />
        <span className="w-11 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>

      {/* Hàng điều khiển: xem lại · phát · thu nhỏ · toàn màn hình · đóng */}
      <div className="flex items-center gap-1 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-tight">{title}</h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {isBuffering
              ? "Đang tải…"
              : teacher === channelName
                ? teacher
                : `${teacher} · ${channelName}`}
          </p>
        </div>

        <button
          type="button"
          onClick={onReplay}
          title="Xem lại từ đầu"
          aria-label="Xem lại từ đầu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition hover:scale-105 hover:opacity-95"
          aria-label={isPlaying ? "Tạm dừng" : "Phát"}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4.5 w-4.5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={onCollapse}
          title="Thu nhỏ"
          aria-label="Thu nhỏ trình phát"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onFullscreen}
          title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          {fullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Đóng trình phát"
          aria-label="Đóng trình phát"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ mini (khi thu nhỏ)                                              */
/* ------------------------------------------------------------------ */

export function MiniPlayerCard({
  title,
  isBuffering,
  isPlaying,
  position,
  duration,
  onSeek,
  onToggle,
  onClose,
  onExpand,
  showFallback,
}: {
  title: string;
  isBuffering: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  onSeek(sec: number): void;
  onToggle(): void;
  onClose(): void;
  onExpand(): void;
  showFallback?: boolean;
}) {
  return (
    <div className="fixed bottom-[4.25rem] right-4 z-[95] w-[min(20rem,calc(100vw-2rem))] animate-in slide-in-from-bottom-2 fade-in lg:bottom-4">
      <div className="overflow-hidden rounded-xl border border-border bg-popover/95 shadow-xl backdrop-blur">
        {/* Một hàng: nút phát · tiêu đề · thời gian · mở rộng · đóng */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="min-w-0 flex-1 text-left"
            title="Mở trình phát"
          >
            <p className="truncate text-sm font-medium leading-snug">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {isBuffering ? "Đang tải…" : isPlaying ? "Đang phát" : "Tạm dừng"}
            </p>
          </button>
          <button
            type="button"
            onClick={onExpand}
            title="Mở trình phát"
            aria-label="Mở trình phát"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M4 4h7v2.5H8.9l4.6 4.6-1.4 1.4-4.6-4.6V11H4zm13.5 10.7-4.6-4.6 1.4-1.4 4.6 4.6V11H20v7h-7v-2.5h2.1l-4.6-4.6 1.4-1.4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Đóng trình phát"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tua nhanh: tap dải tiến trình để tua tới đó */}
        <button
          type="button"
          onClick={(e) => {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * duration);
          }}
          className="block h-1.5 w-full bg-muted"
          aria-label="Tua theo tiến trình"
        >
          <span
            className="block h-full bg-gold transition-[width] duration-500"
            style={{
              width: `${
                duration > 0 ? Math.min(100, (position / duration) * 100) : 0
              }%`,
            }}
          />
        </button>
      </div>
      {showFallback && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Video này không cho phép phát nhúng. Vui lòng chọn video khác.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiện ích hiển thị tiến trình trên thẻ pháp thoại                    */
/* ------------------------------------------------------------------ */

export function ProgressPill({
  positionSec,
  durationSec,
  completed,
}: {
  positionSec: number;
  durationSec: number;
  completed: boolean;
}) {
  if (completed) {
    return (
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
        Đã xem
      </span>
    );
  }
  if (positionSec > 5 && durationSec > 0) {
    const pct = Math.min(95, Math.round((positionSec / durationSec) * 100));
    return (
      <span className="tabular-nums text-[11px] text-muted-foreground">
        Còn {formatTime(Math.max(0, durationSec - positionSec))} · {pct}%
      </span>
    );
  }
  return null;
}
