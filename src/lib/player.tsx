import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { loadLocalWatch, saveLocalWatch } from "@/lib/localProgress";
import { ChevronDown, RotateCcw, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
  /** true khi đang ở chế độ overlay toàn màn hình */
  isExpanded: boolean;
  setExpanded(v: boolean): void;
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
  const playerRef = useRef<YTPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const [current, setCurrent] = useState<PlayerTalk | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const pendingSeekRef = useRef<number | null>(null);
  const talkRef = useRef<PlayerTalk | null>(null);
  const savedForTalkRef = useRef<Map<string, number>>(new Map());
  const [queued, setQueued] = useState<PlayerTalk | null>(null);

  /* ----- Tạo player MỘT LẦN ngay khi app mở -----
     FIX LỖI KHÔNG PHÁT ĐƯỢC VIDEO:
     1. Khung chứa iframe (ytTargetRef) giờ LUÔN mounted từ lần render đầu
        (nằm ngoài mọi điều kiện) — trước đây nó chỉ render khi có video,
        nên effect tạo player chạy với ref=null và player không bao giờ
        được khởi tạo → bấm phát chỉ xếp hàng vô hạn.
     2. Truyền origin thật của trang cho playerVars.origin — YouTube từ
        chối phát (lỗi 127.0.0.1:0) nếu origin sai khi chạy qua proxy dev.
     3. seekTo sau khi video đã thực sự phát (onStateChange PLAYING lần
        đầu) thay vì ngay sau loadVideoById — seek sớm bị YouTube bỏ qua. */
  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      const host = ytTargetRef.current;
      if (!host || playerRef.current) return;
      // FIX: YT.Player THAY THẾ node được truyền bằng iframe. Nếu truyền
      // trực tiếp div do React quản lý, React sẽ va chạm với iframe khi
      // re-render (và StrictMode remount có thể gắn player vào node chết).
      // → Truyền một node con tạm tạo bằng DOM API: React chỉ quản lý
      //   `host` (luôn trống trong JSX), iframe sống bên trong node tạm.
      const mount = document.createElement("div");
      host.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e) => {
            const S = window.YT!.PlayerState;
            if (e.data === S.PLAYING) {
              setIsPlaying(true);
              setIsBuffering(false);
              // Đã phát thật → tua tới vị trí lưu (nếu chưa tua)
              const st = pendingSeekRef.current;
              if (st != null && playerRef.current) {
                playerRef.current.seekTo(st, true);
                pendingSeekRef.current = null;
              }
            } else if (e.data === S.PAUSED) {
              setIsPlaying(false);
              setIsBuffering(false);
              // LƯU NGAY khi tạm dừng — không chờ vòng 10s/đóng tab
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
              if (t && dur > 0) {
                persistProgress(t, dur, dur);
              }
              talkRef.current = null;
              setCurrent(null);
              setIsPlaying(false);
              setIsBuffering(false);
              setPosition(0);
              setDuration(0);
              setExpanded(false);
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
      // Dọn node tạm + iframe (an toàn cả khi StrictMode chạy lại effect
      // trên cùng host — lần chạy sau sẽ tạo node tạm mới)
      if (ytTargetRef.current) ytTargetRef.current.innerHTML = "";
    };
    // saveProgress là hàm ổn định từ useMutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    talkRef.current = current;
  }, [current]);

  /* ----- Phát một pháp thoại (tiếp tục từ vị trí đã lưu) ----- */
  const play = useCallback(
    (talk: PlayerTalk) => {
      setShowFallback(false);
      // Bắt đầu phát mới (chưa có gì đang phát) -> mở trình phát lớn
      if (talkRef.current === null) setExpanded(true);
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
      // seek sẽ được thực hiện trong onStateChange(PLAYING)
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

  /* ----- Lưu tiến trình (server khi đăng nhập + local cho MỌI người) ----- */
  const persistProgress = useCallback(
    (t: PlayerTalk, positionSec: number, durationSec: number) => {
      if (positionSec < 3) return; // quá đầu video thì chưa cần lưu
      // 1. Luôn lưu cục bộ — khách xem vẫn "dừng ở đâu quay lại đúng đoạn đó"
      saveLocalWatch({
        youtubeId: t.youtubeId,
        title: t.title,
        teacher: t.teacher,
        channelName: t.channelName,
        publishedAt: t.publishedAt,
        positionSec,
        durationSec,
      });
      // 2. Server (chỉ khi đăng nhập)
      if (isAuthenticated) {
        void saveProgress({
          youtubeId: t.youtubeId,
          positionSec,
          durationSec,
        }).catch(() => {
          /* giữ bản local làm dự phòng */
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
        /* bỏ qua lỗi mạng tạm thời */
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

  /* ----- Nạp tiến trình đã lưu từ Convex ----- */
  /* ----- Nạp "tiếp tục xem" GỘP local + server (mục mới hơn thắng) ----- */
  useEffect(() => {
    const map = new Map<string, number>();
    const times = new Map<string, number>();
    // Local trước (nền tảng cho khách + dự phòng offline)
    for (const row of loadLocalWatch()) {
      map.set(row.youtubeId, row.positionSec);
      times.set(row.youtubeId, row.updatedAt);
    }
    // Server đè khi bản ghi mới hơn (đăng nhập / đa thiết bị)
    if (savedProgress) {
      for (const row of savedProgress) {
        const prev = times.get(row.youtubeId) ?? 0;
        if (row.updatedAt >= prev) {
          map.set(row.youtubeId, row.positionSec);
          times.set(row.youtubeId, row.updatedAt);
        }
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
    p?.pauseVideo();
    talkRef.current = null;
    setCurrent(null);
    setPosition(0);
    setDuration(0);
    setExpanded(false);
    setShowFallback(false);
  }, [persistProgress]);

  const replay = useCallback(() => {
    const t = talkRef.current ?? current;
    if (!t) return;
    if (isAuthenticated) void resetProgress({ youtubeId: t.youtubeId });
    savedForTalkRef.current.delete(t.youtubeId);
    play(t);
  }, [current, isAuthenticated, play, resetProgress]);

  /* ----- Media Session: điều khiển từ màn hình khóa ----- */
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.teacher,
      album: "Dhamma Stream",
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
    const base = "Dhamma Stream — Pháp thoại Theravada";
    document.title = current && isPlaying ? `▶ ${current.title}` : base;
  }, [current, isPlaying]);

  /* ----- Escape thoát chế độ toàn màn hình ----- */
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

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
      isExpanded: expanded,
      setExpanded,
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
    ],
  );

  /* ----- Vị trí khung video theo chế độ (inline style, DOM không đổi).
     MỞ RỘNG: chỉ chiếm nửa trên màn hình — dưới đó vẫn lướt được danh sách
     (backdrop không chặn, chỉ là lớp mờ nhẹ phía sau video). ----- */
  const slotStyle: CSSProperties = expanded
    ? {
        left: "50%",
        top: "1rem",
        transform: "translateX(-50%)",
        width: "min(94vw, 52rem)",
        aspectRatio: "16 / 9",
        borderRadius: "0.75rem",
      }
    : {
        right: "1.25rem",
        bottom: "8.4rem",
        width: "9rem",
        aspectRatio: "16 / 9",
        borderRadius: "0.75rem",
      };

  const showPlayer = current != null;

  return (
    <PlayerContext.Provider value={value}>
      {children}

      {/* Lớp trình phát cố định: iframe YouTube sống ở đây suốt phiên,
          nên âm thanh không bao giờ bị ngắt khi chuyển chế độ hay tab */}
      {showPlayer && (
        <>
          {/* Lớp mờ nhẹ khi mở rộng — KHÔNG chặn tương tác, danh sách dưới
              vẫn lướt được khi đang xem video */}
          {expanded && (
            <div
              className="pointer-events-none fixed inset-0 z-[93] bg-gradient-to-b from-black/45 via-black/15 to-transparent"
              aria-hidden
            />
          )}

          {/* Thẻ thông tin mini (chỉ hiện khi thu nhỏ) */}
          {!expanded && (
            <MiniPlayerCard
              title={current.title}
              isBuffering={isBuffering}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              onSeek={seek}
              onToggle={toggle}
              onClose={close}
              showFallback={showFallback}
              youtubeId={current.youtubeId}
            />
          )}

          {/* Bảng điều khiển khi mở rộng (ngay dưới khung video) */}
          {expanded && (
            <ExpandedControls
              title={current.title}
              teacher={current.teacher}
              channelName={current.channelName}
              isBuffering={isBuffering}
              isPlaying={isPlaying}
              position={position}
              duration={duration}
              onSeek={seek}
              onToggle={toggle}
              onClose={close}
              onReplay={replay}
              onMinimize={() => setExpanded(false)}
              showFallback={showFallback}
              youtubeId={current.youtubeId}
            />
          )}
        </>
      )}

      {/* Lớp chứa iframe — LUÔN mounted ngay từ đầu (không nằm trong điều
          kiện nào) để player khởi tạo được khi app vừa mở. Khi không có
          video thì ẩn ngoài màn hình. Cấu trúc con giữ ổn định vì YouTube
          thay thế node ref bằng iframe. */}
      <div
        className="fixed z-[97] overflow-hidden bg-black shadow-2xl transition-all duration-300"
        style={
          showPlayer
            ? slotStyle
            : {
                left: "-9999px",
                top: "-9999px",
                width: "320px",
                height: "180px",
                opacity: 0,
                pointerEvents: "none",
              }
        }
        aria-hidden={!showPlayer}
      >
        {/* Khung chứa iframe — host luôn trống trong JSX, node tạm cho
            YouTube được tạo bằng DOM API trong effect (an toàn với React) */}
        <div ref={ytTargetRef} className="h-full w-full" />
        {/* Click để mở rộng khi ở chế độ mini */}
        {showPlayer && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute inset-0 h-full w-full cursor-pointer"
            aria-label="Mở trình phát toàn màn hình"
          />
        )}
      </div>
    </PlayerContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Mini player card (được Dashboard cũng dùng được)                    */
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
  showFallback,
  youtubeId,
}: {
  title: string;
  isBuffering: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  onSeek(sec: number): void;
  onToggle(): void;
  onClose(): void;
  showFallback?: boolean;
  youtubeId?: string;
}) {
  return (
    <div className="fixed bottom-[4.25rem] right-4 z-[95] w-[min(20rem,calc(100vw-2rem))] animate-in slide-in-from-bottom-2 fade-in lg:bottom-4">
      <div className="overflow-hidden rounded-xl border border-border bg-popover/95 shadow-xl backdrop-blur">
        {/* Một hàng duy nhất: nút phát · tiêu đề · thời gian · đóng */}
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-snug">{title}</p>
            <p className="truncate text-[11px] tabular-nums text-muted-foreground">
              {isBuffering ? "Đang tải…" : isPlaying ? "Đang phát" : "Tạm dừng"}
              {" · "}
              {formatTime(position)} / {formatTime(duration)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, position - 15))}
            className="shrink-0 rounded-full px-1.5 py-1 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Lùi 15 giây"
          >
            −15s
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
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-gold transition-[width] duration-500"
            style={{
              width: `${
                duration > 0 ? Math.min(100, (position / duration) * 100) : 0
              }%`,
            }}
          />
        </div>
      </div>
      {showFallback && youtubeId && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Video này không cho phép phát nhúng.{" "}
          <a
            className="underline"
            href={`https://www.youtube.com/watch?v=${youtubeId}`}
            target="_blank"
            rel="noreferrer"
          >
            Xem trên YouTube
          </a>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bảng điều khiển mở rộng                                             */
/* ------------------------------------------------------------------ */

function ExpandedControls({
  title,
  teacher,
  channelName,
  isBuffering,
  isPlaying,
  position,
  duration,
  onSeek,
  onToggle,
  onClose,
  onReplay,
  onMinimize,
  showFallback,
  youtubeId,
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
  onClose(): void;
  onReplay(): void;
  onMinimize(): void;
  showFallback: boolean;
  youtubeId: string;
}) {
  return (
    <div className="fixed left-1/2 z-[96] w-[min(94vw,52rem)] -translate-x-1/2" style={{ top: "calc(1rem + min(94vw, 52rem) * 9 / 16 + 0.5rem)" }}>
      <div className="rounded-xl border border-border bg-popover/95 px-4 py-3 shadow-2xl backdrop-blur">
        {/* Hàng 1: tiêu đề + nút nhỏ (xem lại, thu nhỏ, đóng) */}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="truncate text-[11px] text-muted-foreground">
              {isBuffering ? "Đang tải…" : teacher === channelName ? teacher : `${teacher} · ${channelName}`}
            </p>
            </div>
          <button
            type="button"
            onClick={onReplay}
            title="Xem lại từ đầu"
            aria-label="Xem lại từ đầu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            title="Thu nhỏ"
            aria-label="Thu nhỏ trình phát"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Đóng trình phát"
            aria-label="Đóng trình phát"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>        {/* Hàng 2: thanh tua chiếm trọn chiều rộng + mốc thời gian 2 đầu */}
        <div className="mt-2.5 flex items-center gap-2.5">
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

        {/* Hàng 3: cụm điều khiển căn giữa — lùi 15 · phát (to) · tới 15 */}
        <div className="mt-2 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, position - 15))}
            className="flex h-9 items-center rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Lùi 15 giây"
          >
            −15s
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 hover:opacity-95"
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => onSeek(position + 15)}
            className="flex h-9 items-center rounded-full px-3 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Tới 15 giây"
          >
            +15s
          </button>
        </div>

        {showFallback && (
          <p className="mt-2.5 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            Video này không cho phép phát nhúng.{" "}
            <a
              className="underline"
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem trên YouTube
            </a>
          </p>
        )}
      </div>
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
