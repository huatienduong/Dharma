/* ------------------------------------------------------------------ */
/* Trình phát video TOÀN CỤC — kiến trúc 2 surface:                     */
/*   • DockPlayer: nằm TRONG trang (Dashboard/Lịch sử xem), ngay dưới   */
/*     thanh tìm kiếm → logo & tìm kiếm luôn ở trên, không bị đẩy xuống */
/*   • MiniPlayer: thẻ nhỏ fixed góc phải khi thu nhỏ hoặc ở trang khác  */
/* Bàn giao: khi chuyển surface, video tự nạp tiếp đúng giây đang xem. */
/* YouTube UI tắt toàn bộ (controls/logo/info) + lớp chặn click.        */
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
  type RefObject,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLocation } from "react-router";
import { saveLocalWatch } from "@/lib/localProgress";
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
/* Ở các trang này video tự thu thành thẻ mini (trang Phòng xem cùng có  */
/* player riêng, Trợ lý Phật học full-screen, các trang đọc cần rộng).   */

const MINI_ROUTES = [
  "/assistant",
  "/suttas",
  "/vinaya",
  "/meditation",
  "/calendar",
  "/dictionary",
  "/settings",
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

/* ------------------------------------------------------------------ */
/* Surface: một trình phát YouTube độc lập (dock hoặc mini).            */
/* Mỗi surface giữ iframe luôn mounted trong chính vùng DOM của nó —    */
/* iframe KHÔNG bao giờ bị di chuyển (di chuyển = video tự tải lại).    */
/* ------------------------------------------------------------------ */

type SurfaceKind = "dock" | "mini";

type SurfaceHandle = {
  load(videoId: string): void;
  play(): void;
  pause(): void;
  seek(sec: number): void;
  time(): { position: number; duration: number };
  unloadCaptions(): void;
  containerEl(): HTMLElement | null;
  onState?: (state: number) => void;
};

type SurfaceEntry = { sid: number; handle: SurfaceHandle };

type RegistryApi = {
  /** Đăng ký surface, trả về sid để unregister đúng */
  register(kind: SurfaceKind, handle: SurfaceHandle): number;
  unregister(kind: SurfaceKind, sid: number): void;
};

const RegistryContext = createContext<RegistryApi | null>(null);

let surfaceSidCounter = 0;

function useYtSurface(
  kind: SurfaceKind,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const registry = useContext(RegistryContext);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const handleRef = useRef<SurfaceHandle | null>(null);
  const [ready, setReady] = useState(false);

  if (!handleRef.current) {
    handleRef.current = {
      load: (id) => {
        try {
          playerRef.current?.loadVideoById(id);
        } catch {
          /* chưa sẵn sàng */
        }
      },
      play: () => {
        try {
          playerRef.current?.playVideo();
        } catch {
          /* bỏ qua */
        }
      },
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* bỏ qua */
        }
      },
      seek: (sec) => {
        try {
          playerRef.current?.seekTo(Math.max(0, sec), true);
        } catch {
          /* bỏ qua */
        }
      },
      time: () => {
        try {
          const p = playerRef.current;
          if (!p) return { position: 0, duration: 0 };
          return { position: p.getCurrentTime() ?? 0, duration: p.getDuration() ?? 0 };
        } catch {
          return { position: 0, duration: 0 };
        }
      },
      unloadCaptions: () => {
        try {
          playerRef.current?.unloadModule("captions");
        } catch {
          /* bỏ qua */
        }
      },
      containerEl: () => containerRef.current,
    };
  }

  /* Khởi tạo player MỘT LẦN cho surface này */
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
            },
            onStateChange: (e: { data: number }) => {
              handleRef.current?.onState?.(e.data);
            },
          },
        });
      } catch {
        /* API chưa sẵn sàng — thử lại ở lần mount sau */
      }
    });
    return () => {
      disposed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* bỏ qua */
      }
      playerRef.current = null;
    };
  }, []);

  /* Đăng ký surface vào registry của provider */
  useEffect(() => {
    if (!ready || !registry || !handleRef.current) return;
    const sid = registry.register(kind, handleRef.current);
    return () => registry.unregister(kind, sid);
  }, [ready, kind, registry]);

  return hostRef;
}

/* ------------------------------------------------------------------ */
/* Provider — điều phối playback giữa các surface                       */
/* ------------------------------------------------------------------ */

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
  const [surfaceVersion, setSurfaceVersion] = useState(0);
  const [dockRegistered, setDockRegistered] = useState(false);

  /* -------- refs -------- */
  const surfacesRef = useRef<Partial<Record<SurfaceKind, SurfaceEntry>>>({});
  const ownerSidRef = useRef(0); // surface đang giữ video
  const lastPosRef = useRef(0); // giây dừng gần nhất (dùng khi bàn giao)
  const lastWatchSaveRef = useRef(0); // chống ghi lịch sử cục bộ dồn dập
  const currentRef = useRef<PlayerTalk | null>(null);
  const durationRef = useRef(0);

  const ownerEntry = useCallback((): SurfaceEntry | undefined => {
    const sid = ownerSidRef.current;
    if (!sid) return undefined;
    for (const k of ["dock", "mini"] as const) {
      const e = surfacesRef.current[k];
      if (e && e.sid === sid) return e;
    }
    return undefined;
  }, []);

  /* -------- registry API -------- */
  const registryApi = useMemo<RegistryApi>(
    () => ({
      register: (kind, handle) => {
        handle.onState = (state) => {
          const S = window.YT?.PlayerState;
          if (!S) return;
          if (ownerEntry()?.handle !== handle) return;
          if (state === S.PLAYING) {
            setPlaying(true);
            setBuffering(false);
          } else if (state === S.PAUSED) {
            setPlaying(false);
          } else if (state === S.BUFFERING) {
            setBuffering(true);
          } else if (state === S.ENDED) {
            setPlaying(false);
            if (document.fullscreenElement) void document.exitFullscreen();
          }
        };
        const sid = ++surfaceSidCounter;
        surfacesRef.current[kind] = { sid, handle };
        if (kind === "dock") setDockRegistered(true);
        setSurfaceVersion((v) => v + 1);
        return sid;
      },
      unregister: (kind, sid) => {
        const e = surfacesRef.current[kind];
        if (e && e.sid === sid) {
          if (ownerSidRef.current === sid) ownerSidRef.current = 0;
          delete surfacesRef.current[kind];
          if (kind === "dock") setDockRegistered(false);
          setSurfaceVersion((v) => v + 1);
        }
      },
    }),
    [ownerEntry],
  );

  /* -------- chế độ mong muốn -------- */
  const pathIsMini = MINI_ROUTES.some(
    (r) => path === r || path.startsWith(`${r}/`),
  );
  const desiredKind: SurfaceKind | null = !current
    ? null
    : pathIsMini || !isExpanded
      ? "mini"
      : "dock";

  /* Tự mở dock trên trang thường, tự thu mini trên trang có giao diện riêng */
  useEffect(() => {
    if (!current) return;
    setExpanded(!pathIsMini);
  }, [pathIsMini, current]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  /* -------- Bàn giao surface: nạp video vào surface mong muốn -------- */
  useEffect(() => {
    if (!current || !desiredKind) return;
    let reg = surfacesRef.current[desiredKind];
    // Trang không render DockPlayer (vd Lịch sử xem) → phát trong mini
    if (!reg && desiredKind === "dock") reg = surfacesRef.current.mini;
    if (!reg || ownerSidRef.current === reg.sid) return;
    const resumeAt = lastPosRef.current;
    for (const k of ["dock", "mini"] as const) {
      if (k !== desiredKind) surfacesRef.current[k]?.handle.pause();
    }
    ownerSidRef.current = reg.sid;
    setPlaying(false);
    reg.handle.load(current.youtubeId);
    // Đảm bảo phát: surface mới có thể chưa “visible” lúc load
    window.setTimeout(() => reg.handle.play(), 700);
    if (resumeAt > 5) {
      window.setTimeout(() => reg.handle.seek(resumeAt), 900);
    }
  }, [current, desiredKind, surfaceVersion]);

  /* -------- polling tiến trình 1s -------- */
  useEffect(() => {
    if (!current) return;
    const id = window.setInterval(() => {
      const e = ownerEntry();
      if (!e) return;
      try {
        const t = e.handle.time();
        if (t.duration > 0) setDuration(t.duration);
        setPosition(t.position);
        lastPosRef.current = t.position;
        // Lịch sử xem + tiến trình lưu CỤC BỘ trên thiết bị (mỗi 5s)
        if (t.duration > 0 && t.position > 3) {
          const now = Date.now();
          if (now - lastWatchSaveRef.current > 5000) {
            lastWatchSaveRef.current = now;
            saveLocalWatch({
              youtubeId: current.youtubeId,
              title: current.title,
              teacher: current.teacher,
              channelName: current.channelName,
              publishedAt: current.publishedAt,
              positionSec: t.position,
              durationSec: t.duration,
            });
          }
        }
      } catch {
        /* bỏ qua tick */
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [current, ownerEntry]);

  /* -------- tắt phụ đề định kỳ -------- */
  useEffect(() => {
    if (!current) return;
    const id = window.setInterval(() => {
      ownerEntry()?.handle.unloadCaptions();
    }, 4000);
    return () => window.clearInterval(id);
  }, [current, ownerEntry]);

  /* -------- đồng bộ fullscreen -------- */
  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* --------------------------- actions --------------------------- */
  const play = useCallback((talk: PlayerTalk) => {
    lastPosRef.current = 0;
    setPosition(0);
    setDuration(Math.max(0, talk.durationSec ?? 0));
    setPlaying(false);
    setCurrent(talk); // attach effect sẽ nạp video vào surface phù hợp
  }, []);

  const toggle = useCallback(() => {
    const h = ownerEntry()?.handle;
    if (!h) return;
    if (isPlaying) h.pause();
    else h.play();
  }, [isPlaying, ownerEntry]);

  const seek = useCallback(
    (sec: number) => {
      ownerEntry()?.handle.seek(sec);
      setPosition(sec);
      lastPosRef.current = sec;
    },
    [ownerEntry],
  );

  const replay = useCallback(() => {
    const h = ownerEntry()?.handle;
    if (!h) return;
    h.seek(0);
    h.play();
    setPosition(0);
    lastPosRef.current = 0;
  }, [ownerEntry]);

  const close = useCallback(() => {
    // Lưu lần cuối vị trí dừng vào lịch sử cục bộ trước khi đóng
    const talk = currentRef.current;
    if (talk && lastPosRef.current > 3) {
      saveLocalWatch({
        youtubeId: talk.youtubeId,
        title: talk.title,
        teacher: talk.teacher,
        channelName: talk.channelName,
        publishedAt: talk.publishedAt,
        positionSec: lastPosRef.current,
        durationSec: durationRef.current || 0,
      });
    }
    for (const k of ["dock", "mini"] as const) {
      surfacesRef.current[k]?.handle.pause();
    }
    ownerSidRef.current = 0;
    lastPosRef.current = 0;
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
    const el = ownerEntry()?.handle.containerEl();
    if (!el) return;
    void el.requestFullscreen?.().catch(() => {
      /* trình duyệt chặn — bỏ qua */
    });
  }, [ownerEntry]);

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

  return (
    <RegistryContext.Provider value={registryApi}>
      <PlayerContext.Provider value={value}>
        {children}
        <MiniPlayer
          active={
            Boolean(current) &&
            (desiredKind === "mini" || !dockRegistered)
          }
        />
      </PlayerContext.Provider>
    </RegistryContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* DockPlayer — đặt TRONG trang (Dashboard/Lịch sử xem) ngay dưới       */
/* thanh tìm kiếm. Logo & tìm kiếm luôn nằm trên video.                 */
/* ------------------------------------------------------------------ */

export function DockPlayer({ className }: { className?: string }) {
  const location = useLocation();
  const {
    current,
    isExpanded,
    isPlaying,
    position,
    duration,
    seek,
    toggle,
    replay,
    close,
    setExpanded,
    isFullscreen,
    toggleFullscreen,
  } = usePlayer();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useYtSurface("dock", containerRef);

  const pathIsMini = MINI_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  const active = Boolean(current) && isExpanded && !pathIsMini;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className, !active && "hidden")}
    >
      <div
        className={cn(
          "overflow-hidden bg-black shadow-2xl",
          !isFullscreen && "rounded-2xl ring-1 ring-black/20",
          isFullscreen &&
            "flex h-screen w-screen items-center justify-center rounded-none",
        )}
      >
        <div
          className={cn(
            "yt-frame relative aspect-video w-full",
            isFullscreen && "h-full w-full max-w-none",
          )}
        >
          <div ref={hostRef} className="absolute inset-0" />
          {/* Lớp chặn click: logo/watermark/thông tin YouTube không thể thao tác */}
          <div className="absolute inset-0 z-10" />
        </div>

        {!isFullscreen ? (
          <div className="flex items-center gap-1 border-t border-border/60 bg-card px-2 py-1.5">
            <span className="px-1.5 text-[11px] tabular-nums text-muted-foreground">
              {formatTime(position)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(duration))}
              value={Math.min(position, Math.floor(duration) || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Tua video"
              className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--gold)] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]"
              style={{
                background: `linear-gradient(to right, var(--gold) ${
                  duration > 0 ? (position / Math.max(1, duration)) * 100 : 0
                }%, rgba(255,255,255,0.2) ${
                  duration > 0 ? (position / Math.max(1, duration)) * 100 : 0
                }%)`,
              }}
            />
            <span className="px-1.5 text-[11px] tabular-nums text-muted-foreground">
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
            <CtlButton onClick={() => setExpanded(false)} title="Thu nhỏ">
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
        ) : (
          <FullscreenControls
            position={position}
            duration={duration}
            onSeek={seek}
            isPlaying={isPlaying}
            onToggle={toggle}
            onExit={toggleFullscreen}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MiniPlayer — thẻ nhỏ fixed (provider tự render)                      */
/* ------------------------------------------------------------------ */

function MiniPlayer({ active }: { active: boolean }) {
  const { isPlaying, position, duration, toggle, seek, close, setExpanded, isFullscreen, toggleFullscreen } =
    usePlayer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useYtSurface("mini", containerRef);

  return (
    <div
      ref={containerRef}
      className={cn(
        isFullscreen
          ? "fixed inset-0 z-[300] flex h-screen w-screen items-center justify-center bg-black"
          : "fixed bottom-[4.6rem] right-4 z-[95] w-[min(20rem,calc(100vw-2rem))] lg:bottom-4",
        !active && "hidden",
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-black shadow-2xl",
          !isFullscreen && "rounded-xl ring-1 ring-black/30",
          isFullscreen && "flex h-full w-full items-center justify-center",
        )}
      >
        <div
          className={cn(
            "yt-frame relative aspect-video w-full",
            isFullscreen && "h-full w-full max-w-none",
          )}
        >
          <div ref={hostRef} className="absolute inset-0" />
          <div className="absolute inset-0 z-10" />
        </div>

        {!isFullscreen ? (
          <div className="flex items-center gap-0.5 border-t border-border/60 bg-card px-1.5 py-1">
            <span className="px-1 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(position)} / {formatTime(duration)}
            </span>
            <span className="min-w-0 flex-1" />
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
            <CtlButton onClick={() => setExpanded(true)} title="Mở rộng">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M3 5h8v2H5v6H3V5zm18 14h-8v-2h6v-6h2v8z" />
              </svg>
            </CtlButton>
            <CtlButton onClick={toggleFullscreen} title="Toàn màn hình">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </CtlButton>
            <CtlButton onClick={close} title="Đóng">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </CtlButton>
          </div>
        ) : (
          <FullscreenControls
            position={position}
            duration={duration}
            onSeek={seek}
            isPlaying={isPlaying}
            onToggle={toggle}
            onExit={toggleFullscreen}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Điều khiển chung khi toàn màn hình                                   */
/* ------------------------------------------------------------------ */

function FullscreenControls({
  position,
  duration,
  onSeek,
  isPlaying,
  onToggle,
  onExit,
}: {
  position: number;
  duration: number;
  onSeek: (sec: number) => void;
  isPlaying: boolean;
  onToggle: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
      <CtlButton
        big
        onClick={onToggle}
        title={isPlaying ? "Tạm dừng" : "Phát"}
      >
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
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(duration))}
        value={Math.min(position, Math.floor(duration) || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Tua video"
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--gold)]"
      />
      <span className="text-xs tabular-nums text-white/80">
        {formatTime(position)} / {formatTime(duration)}
      </span>
      <CtlButton big onClick={onExit} title="Thoát toàn màn hình">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
        </svg>
      </CtlButton>
    </div>
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
      aria-label={title}        className={cn(
          "flex shrink-0 items-center justify-center rounded-full transition hover:bg-accent active:scale-95",
          big
            ? "h-9 w-9 text-foreground"
            : "h-7 w-7 text-foreground/80 hover:text-foreground",
        )}
    >
      {children}
    </button>
  );
}
