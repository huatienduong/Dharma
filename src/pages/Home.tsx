import { AppShell } from "@/components/AppShell";
import { NewsCard, NewsReader, useBuddhistNews } from "@/components/NewsFeed";
import { TalkRow } from "@/pages/Dashboard";
import { DockPlayer, usePlayer } from "@/lib/player";
import { searchDirect } from "@/lib/youtubeDirect";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import {
  loadLocalSession,
  loadLocalSuttaProgress,
  type LocalSession,
} from "@/lib/localProgress";
import { getSutta } from "@/data/suttas";
import {
  BookOpen,
  BookMarked,
  CalendarDays,
  ChevronRight,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  Loader2,
  MessagesSquare,
  MonitorPlay,
  Newspaper,
  Play,
  Scale,
  Search,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { anyApi } from "convex/server";
import { useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

type Talk = Doc<"dhammaTalks">;
type YtRow = {
  _id: string;
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
  viewCount?: number;
};

/* Truy vấn video Phật giáo Theravāda — ưu tiên mới nhất */
const VIDEO_QUERY = "pháp thoại Phật giáo Theravada nguyên thủy mới nhất";
const VIDEO_COUNT = 12;
const NEWS_COUNT = 6;

function newestFirst(rows: YtRow[]): YtRow[] {
  return [...rows]
    .sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    })
    .slice(0, VIDEO_COUNT);
}

/* ---------------- Lưới chức năng kiểu app dịch vụ ---------------- */

const QUICK_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
  tile: string; // màu ô icon
}[] = [
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay, tile: "bg-orange-500" },
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen, tile: "bg-green-500" },
  { to: "/meditation", label: "Thiền định", icon: Flower2, tile: "bg-amber-500" },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked, tile: "bg-emerald-500" },
  { to: "/vinaya", label: "Luật tạng", icon: Scale, tile: "bg-yellow-500" },
  { to: "/abhidhamma", label: "Luận tạng", icon: Layers, tile: "bg-teal-500" },
  { to: "/calendar", label: "Lịch Phật giáo", icon: CalendarDays, tile: "bg-blue-500" },
  { to: "/lookup", label: "Tra cứu", icon: Globe2, tile: "bg-indigo-500" },
];

const EXTRA_ROW: { to: string; label: string; icon: typeof Newspaper }[] = [
  { to: "/news", label: "Tin tức", icon: Newspaper },
  { to: "/history", label: "Lịch sử Phật giáo", icon: Hourglass },
  { to: "/watched", label: "Lịch sử xem", icon: History },
];

/* ----------------------- Trang chủ ----------------------- */

export default function Home() {
  const navigate = useNavigate();
  const { play, current } = usePlayer();
  const { items: news, loading: newsLoading } = useBuddhistNews();
  const [reader, setReader] = useState<(typeof news)[number] | null>(null);
  const [videos, setVideos] = useState<YtRow[] | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchVideos = useAction(anyApi.youtubeSync.search);
  const startedRef = useRef(false);

  /* Tiến trình cục bộ: phiên xem dở + kinh đang đọc dở */
  const [session, setSession] = useState<LocalSession | null>(null);
  const [readingSutta, setReadingSutta] = useState<{
    id: string;
    title: string;
    percent: number;
  } | null>(null);

  useEffect(() => {
    const stop = trackScroll("home");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("home");
    // Nạp tiến trình sau khi mount (localStorage — tránh lệch SSR)
    setSession(loadLocalSession());
    const rows = loadLocalSuttaProgress()
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((r) => r.percent > 0 && r.percent < 100);
    const top = rows[0];
    if (top) {
      const s = getSutta(top.docId);
      if (s) {
        setReadingSutta({ id: s.id, title: s.title, percent: top.percent });
        return;
      }
    }
    setReadingSutta(null);
  }, []);

  /* Video nổi bật — API YouTube (qua máy chủ), fallback nguồn công cộng */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const r = (await searchVideos({ q: VIDEO_QUERY })) as { items?: YtRow[] };
        if (cancelled) return;
        if (r.items && r.items.length > 0) {
          setVideos(newestFirst(r.items));
          return;
        }
        throw new Error("empty");
      } catch {
        try {
          const r = await searchDirect(VIDEO_QUERY);
          if (!cancelled) setVideos(newestFirst(r.items as YtRow[]));
        } catch {
          if (!cancelled) setVideos([]);
        }
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchVideos]);

  const toTalk = useCallback(
    (row: YtRow): Talk =>
      ({
        _id: row._id || row.youtubeId,
        youtubeId: row.youtubeId,
        title: row.title,
        teacher: row.teacher || row.channelName,
        channelName: row.channelName,
        publishedAt: row.publishedAt,
        durationSec: row.durationSec,
        viewCount: row.viewCount,
        syncedAt: Date.now(),
      }) as unknown as Talk,
    [],
  );

  const topNews = useMemo(() => news.slice(0, NEWS_COUNT), [news]);

  const submitSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    navigate(`/suttas?q=${encodeURIComponent(q)}`);
  }, [query, navigate]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Chào buổi sáng";
    if (h < 14) return "Chào buổi trưa";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  return (
    <AppShell title="Trang chủ" hideTitle>
      {current && (
        <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
          <DockPlayer />
        </div>
      )}

      {/* ---------------- Thanh tìm kiếm pill ---------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="mb-4"
        role="search"
      >
        <div className="flex h-12 items-center gap-3 rounded-full bg-card px-4 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_14px_rgba(16,24,40,0.06)] transition focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kinh, pháp thoại, thuật ngữ…"
            aria-label="Tìm kiếm toàn ứng dụng"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </form>

      {/* ---------------- Thẻ chào mừng ---------------- */}
      <section className="ds-card relative mb-5 overflow-hidden px-5 py-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 text-[7rem] leading-none text-primary/10"
        >
          ☸
        </span>
        <p className="text-[13px] font-medium text-muted-foreground">
          {greeting} 🙏
        </p>
        <h1 className="mt-1 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">
          Học Phật pháp mỗi ngày
          <br className="hidden sm:block" /> theo truyền thống Theravāda
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/meditation")}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Flower2 className="h-4 w-4" /> Thiền ngay
          </button>
          <button
            type="button"
            onClick={() => navigate("/assistant")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground transition hover:bg-accent active:scale-[0.98]"
          >
            <MessagesSquare className="h-4 w-4" /> Hỏi Trợ lý
          </button>
        </div>
      </section>

      {/* ---------------- Lưới chức năng 8 mục ---------------- */}
      <section className="ds-card mb-6 px-3 py-5">
        <div className="grid grid-cols-4 gap-y-5">
          {QUICK_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2 px-1 text-center transition active:scale-95"
              >
                <span className={`ds-tile h-[52px] w-[52px] ${item.tile}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mx-1 mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
          {EXTRA_ROW.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/70 px-2 py-2.5 text-[11px] font-medium text-foreground/80 transition hover:bg-accent active:scale-[0.98]"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------- Tiến trình của tôi ---------------- */}
      {(session || readingSutta) && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-lg font-extrabold tracking-tight">
            Tiến trình của tôi
          </h2>
          <div className="ds-card p-4">
            {session && (
              <button
                type="button"
                onClick={() =>
                  // Trình phát tự khôi phục đúng đoạn đang xem dở (localStorage)
                  void play({
                    _id: session.youtubeId,
                    youtubeId: session.youtubeId,
                    title: session.title,
                    teacher: session.teacher,
                    channelName: session.channelName,
                    publishedAt: session.publishedAt,
                    durationSec: session.durationSec,
                  })
                }
                className="flex w-full items-center gap-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Play className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {session.title || "Video đang xem dở"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Xem dở — bấm để tiếp tục
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
            {session && readingSutta && (
              <div className="my-3 border-t border-border/60" />
            )}
            {readingSutta && (
              <button
                type="button"
                onClick={() => navigate(`/suttas/${readingSutta.id}`)}
                className="flex w-full items-center gap-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {readingSutta.title}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-green-500"
                      style={{ width: `${readingSutta.percent}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {readingSutta.percent}%
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ---------------- Tin tức Phật giáo Theravāda ---------------- */}
      <section className="mb-8">
        <header className="mb-2.5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">Tin tức</h2>
          <button
            type="button"
            onClick={() => navigate("/news")}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            Thêm <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        {newsLoading && topNews.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ds-card space-y-2 p-3">
                <div className="aspect-video w-full animate-pulse rounded-xl bg-muted/70" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        ) : topNews.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topNews.map((it) => (
              <NewsCard key={it.id} item={it} onOpen={setReader} compact />
            ))}
          </div>
        ) : (
          <p className="ds-card p-6 text-center text-sm text-muted-foreground">
            Chưa có tin tức.
          </p>
        )}
      </section>

      {/* ---------------- Video nổi bật ---------------- */}
      <section className="mb-4">
        <header className="mb-2.5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">
            Video nổi bật
          </h2>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            Thêm <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        {videoLoading && videos === null ? (
          <div className="ds-card space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="aspect-video w-40 shrink-0 animate-pulse rounded-xl bg-muted/70 sm:w-60" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="ds-card p-2 sm:p-3">
            {videos.map((row) => (
              <TalkRow
                key={row.youtubeId}
                title={row.title}
                youtubeId={row.youtubeId}
                durationSec={row.durationSec}
                viewCount={row.viewCount}
                active={current?.youtubeId === row.youtubeId}
                onClick={() => play(toTalk(row))}
              />
            ))}
          </div>
        ) : (
          <p className="ds-card p-6 text-center text-sm text-muted-foreground">
            Chưa nạp được video.
          </p>
        )}
      </section>

      {reader && <NewsReader item={reader} onClose={() => setReader(null)} />}
    </AppShell>
  );
}
