import { AppShell } from "@/components/AppShell";
import {
  AUDIO_FEED_QUERIES,
  AUDIO_KIND_LABEL,
  ytThumb,
  type AudioKind,
} from "@/data/audio";
import { searchDirect, type DirectYtRow } from "@/lib/youtubeDirect";
import { useAction } from "convex/react";
import { anyApi } from "convex/server";
import {
  ChevronDown,
  Headphones,
  ListMusic,
  Loader2,
  Music,
  Pause,
  Play,
  Radio,
  Search as SearchIcon,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* NGHE — nguồn YouTube API, trình phát audio độc lập                  */
/* • Mở trang: tải song song 3 nhóm (Kinh tụng / Nhạc thiền / Pháp âm)  */
/*   qua YouTube Data API (Convex action, fallback nguồn công cộng).    */
/* • Bấm bài → phát NGHE thuần âm thanh bằng YouTube IFrame API ẩn      */
/*   (video vẫn chạy nền màn hình tắt). Giao diện riêng kiểu player     */
/*   nhạc: khung đang phát lớn + danh sách bên dưới.                    */
/* ------------------------------------------------------------------ */

type Row = {
  id: string;
  youtubeId: string;
  title: string;
  author: string;
  kind: AudioKind;
  durationSec: number;
};

const rowToTrack = (r: DirectYtRow, kind: AudioKind): Row => ({
  id: r.youtubeId,
  youtubeId: r.youtubeId,
  title: r.title,
  author: r.channelName || r.teacher,
  kind,
  durationSec: r.durationSec ?? 0,
});

function fmt(sec: number): string {
  if (!sec || sec <= 0) return "--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/* ================= Trình phát nghe (YouTube audio-only) ================= */

type PlayState = "idle" | "loading" | "playing" | "paused";

function useYtAudio() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<unknown>(null);
  const [state, setState] = useState<PlayState>("idle");
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    // Nạp IFrame API một lần cho cả phiên
    const w = window as unknown as {
      YT?: unknown;
      onYouTubeIframeAPIReady?: () => void;
    };
    let cancelled = false;

    const mount = () => {
      if (cancelled || !hostRef.current || playerRef.current) return;
      const YT = w.YT as {
        Player: new (
          el: HTMLElement,
          opts: Record<string, unknown>,
        ) => unknown;
      };
      playerRef.current = new YT.Player(hostRef.current, {
        height: "180",
        width: "320",
        playerVars: { playsinline: 1, controls: 0, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            if (pendingRef.current) {
              const p = playerRef.current as {
                loadVideoById: (id: string) => void;
              };
              p.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e: { data: number }) => {
            // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (e.data === 1) {
              setState("playing");
              const p = playerRef.current as {
                getDuration: () => number;
              };
              setDur(p.getDuration() || 0);
            } else if (e.data === 2) setState("paused");
            else if (e.data === 3) setState("loading");
            else if (e.data === 0) setState("paused");
          },
        },
      });
    };

    if (w.YT && (w.YT as { Player?: unknown }).Player) {
      mount();
    } else {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        mount();
      };
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    // Đồng bộ vị trí phát
    const timer = window.setInterval(() => {
      const p = playerRef.current as
        | { getCurrentTime?: () => number; getDuration?: () => number }
        | null;
      if (p?.getCurrentTime) {
        setPos(p.getCurrentTime() || 0);
        const d = p.getDuration?.() || 0;
        setDur((prev) => (Math.abs(prev - d) > 0.5 ? d : prev));
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const load = useCallback((youtubeId: string) => {
    const p = playerRef.current as
      | { loadVideoById?: (id: string) => void; cueVideoById?: (id: string) => void }
      | null;
    if (!p) {
      pendingRef.current = youtubeId;
      setState("loading");
      return;
    }
    if (readyRef.current) {
      p.loadVideoById?.(youtubeId);
      setState("loading");
    } else {
      pendingRef.current = youtubeId;
      setState("loading");
    }
  }, []);

  const toggle = useCallback(() => {
    const p = playerRef.current as
      | { playVideo?: () => void; pauseVideo?: () => void }
      | null;
    if (!p) return;
    if (state === "playing") p.pauseVideo?.();
    else p.playVideo?.();
  }, [state]);

  const seek = useCallback((sec: number) => {
    const p = playerRef.current as { seekTo?: (s: number, a: boolean) => void } | null;
    p?.seekTo?.(sec, true);
    setPos(sec);
  }, []);

  return { hostRef, load, toggle, seek, state, pos, dur };
}

/* ============================== Trang ============================== */

const KIND_ORDER: AudioKind[] = ["chant", "music", "dharma"];

export default function Listen() {
  const yt = useYtAudio();
  const searchAction = useAction(anyApi.youtubeSync.search);

  const [feed, setFeed] = useState<Record<AudioKind, Row[]>>({
    chant: [],
    music: [],
    dharma: [],
  });
  const [loadingKinds, setLoadingKinds] = useState<Set<AudioKind>>(
    () => new Set(KIND_ORDER),
  );
  const [kind, setKind] = useState<AudioKind>("chant");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Row[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<Row | null>(null);
  const [queue, setQueue] = useState<Row[]>([]);
  const [listOpen, setListOpen] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Nạp feed YouTube theo nhóm (song song) ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all(
        KIND_ORDER.map(async (k) => {
          const rows: Row[] = [];
          // Gộp nhiều truy vấn YouTube API của nhóm — khử trùng lặp
          const seen = new Set<string>();
          const results = await Promise.allSettled(
            AUDIO_FEED_QUERIES[k].map((q) =>
              searchAction({ q }).catch(() => searchDirect(q)),
            ),
          );
          for (const r of results) {
            if (r.status !== "fulfilled") continue;
            const items = (r.value as { items?: DirectYtRow[] }).items ?? [];
            for (const it of items.slice(0, 14)) {
              if (seen.has(it.youtubeId)) continue;
              seen.add(it.youtubeId);
              rows.push(rowToTrack(it, k));
            }
          }
          if (!cancelled) {
            setFeed((prev) => ({ ...prev, [k]: rows }));
            setLoadingKinds((prev) => {
              const next = new Set(prev);
              next.delete(k);
              return next;
            });
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Tìm kiếm YouTube ---------- */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const r =
          (await searchAction({ q }).catch(() => searchDirect(q))) as {
            items?: DirectYtRow[];
          };
        if (!cancelled) setSearchResults((r.items ?? []).map((it) => rowToTrack(it, kind)));
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, kind, searchAction]);

  const rows: Row[] = useMemo(
    () => (query.trim() ? (searchResults ?? []) : feed[kind]),
    [query, searchResults, feed, kind],
  );

  /* ---------- Điều khiển phát ---------- */
  const playTrack = useCallback(
    (track: Row) => {
      setNowPlaying(track);
      setQueue(rows);
      yt.load(track.youtubeId);
    },
    [rows, yt],
  );

  const playAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      const t = queue[index];
      setNowPlaying(t);
      yt.load(t.youtubeId);
    },
    [queue, yt],
  );

  const curIndex = nowPlaying ? queue.findIndex((t) => t.id === nowPlaying.id) : -1;

  const playing = yt.state === "playing";
  const loading = yt.state === "loading";

  return (
    <AppShell title="Nghe" hideTitle>
      {/* ================= KHUNG ĐANG PHÁT (độc lập) ================= */}
      <section className="ds-card mb-4 overflow-hidden">
        {/* Nền mờ từ ảnh bài đang phát */}
        <div className="relative">
          {nowPlaying && (
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center opacity-25 blur-xl"
              style={{ backgroundImage: `url(${ytThumb(nowPlaying.youtubeId)})` }}
            />
          )}
          <div className="relative px-5 pb-5 pt-6">
            {/* Ảnh đĩa + thông tin */}
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-secondary shadow-[0_8px_24px_rgba(63,50,33,0.25)] sm:h-32 sm:w-32">
                {nowPlaying ? (
                  <img
                    src={ytThumb(nowPlaying.youtubeId)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-gold">
                    <Headphones className="h-10 w-10" strokeWidth={1.5} />
                  </span>
                )}
                {playing && (
                  <span className="absolute bottom-1.5 right-1.5 flex h-6 items-end gap-0.5 rounded-full bg-black/55 px-1.5 py-1">
                    <i className="h-1.5 w-0.5 animate-pulse rounded-full bg-gold [animation-delay:0ms]" />
                    <i className="h-2.5 w-0.5 animate-pulse rounded-full bg-gold [animation-delay:150ms]" />
                    <i className="h-2 w-0.5 animate-pulse rounded-full bg-gold [animation-delay:300ms]" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                  Đang phát
                </p>
                <p className="mt-1 line-clamp-2 text-[17px] font-extrabold leading-snug">
                  {nowPlaying?.title ?? "Chọn một bài để bắt đầu nghe"}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {nowPlaying?.author ?? "Kinh tụng · Nhạc thiền · Pháp âm"}
                </p>
                {nowPlaying && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Nguồn YouTube · nghe trực tiếp
                  </p>
                )}
              </div>
            </div>

            {/* Thanh tiến trình */}
            <div className="mt-4 flex items-center gap-2.5">
              <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                {fmt(yt.pos)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.floor(yt.dur))}
                value={Math.min(yt.pos, Math.floor(yt.dur) || 0)}
                onChange={(e) => yt.seek(Number(e.target.value))}
                aria-label="Tua bài nghe"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, var(--gold) ${
                    yt.dur > 0 ? (yt.pos / yt.dur) * 100 : 0
                  }%, var(--muted) ${yt.dur > 0 ? (yt.pos / yt.dur) * 100 : 0}%)`,
                }}
              />
              <span className="w-10 text-[10px] tabular-nums text-muted-foreground">
                {fmt(yt.dur)}
              </span>
            </div>

            {/* Nút điều khiển trung tâm */}
            <div className="mt-3 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => playAt(curIndex - 1)}
                disabled={curIndex <= 0}
                aria-label="Bài trước"
                className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 transition hover:bg-accent disabled:opacity-35"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={yt.toggle}
                aria-label={playing ? "Tạm dừng" : "Phát"}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(180,83,9,0.4)] transition hover:bg-primary/90 active:scale-95"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : playing ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 translate-x-[2px]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => playAt(curIndex + 1)}
                disabled={curIndex < 0 || curIndex >= queue.length - 1}
                aria-label="Bài sau"
                className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 transition hover:bg-accent disabled:opacity-35"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Host ẩn của YouTube IFrame API — chỉ lấy âm thanh */}
            <div className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
              <div ref={yt.hostRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ================= THANH TÌM + TAB NHÓM ================= */}
      <div className="mb-3 space-y-2.5">
        <div className="ds-card flex items-center gap-2.5 px-4 py-2.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kinh tụng, nhạc thiền, pháp âm trên YouTube…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
              className="text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!query.trim() && (
          <div className="flex flex-wrap gap-2">
            {KIND_ORDER.map((k) => {
              const active = kind === k;
              const Icon =
                k === "chant" ? Headphones : k === "music" ? Music : Radio;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(166,124,46,0.35)]"
                      : "bg-card text-muted-foreground shadow-[0_1px_3px_rgba(63,50,33,0.08)] hover:bg-accent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {AUDIO_KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= DANH SÁCH ================= */}
      <section className="ds-card overflow-hidden">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <ListMusic className="h-4 w-4 text-gold" />
          <span className="flex-1 text-sm font-bold">
            {query.trim() ? `Kết quả cho “${query.trim()}”` : AUDIO_KIND_LABEL[kind]}
          </span>
          <span className="text-xs text-muted-foreground">{rows.length} bài</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              listOpen && "rotate-180",
            )}
          />
        </button>

        {listOpen && (
          <div ref={listRef} className="max-h-[60vh] divide-y divide-border/50 overflow-y-auto">
            {searching || (!query.trim() && loadingKinds.has(kind)) ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải từ YouTube…
              </div>
            ) : rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? "Không tìm thấy kết quả."
                  : "Chưa tải được nội dung — thử lại sau."}
              </p>
            ) : (
              rows.map((t) => {
                const active = nowPlaying?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => playTrack(t)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent/60",
                      active && "bg-secondary/70",
                    )}
                  >
                    <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <img
                        src={ytThumb(t.youtubeId)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {active && playing && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Pause className="h-4 w-4 text-white" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px] font-semibold",
                          active && "text-primary",
                        )}
                      >
                        {t.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {t.author} · {fmt(t.durationSec)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-gold",
                      )}
                    >
                      {active && playing ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 translate-x-[1px]" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </section>

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
        Nội dung nghe lấy trực tiếp từ YouTube Data API — phát bằng trình phát
        âm thanh riêng của ứng dụng, tiếp tục nghe cả khi tắt màn hình.
      </p>
    </AppShell>
  );
}
