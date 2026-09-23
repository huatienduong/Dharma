import { AppShell } from "@/components/AppShell";
import { NewsCard, NewsReader, useBuddhistNews } from "@/components/NewsFeed";
import { TalkRow } from "@/pages/Dashboard";
import { DockPlayer, usePlayer } from "@/lib/player";
import { searchDirect } from "@/lib/youtubeDirect";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import type { Doc } from "@/convex/_generated/dataModel";
import { anyApi } from "convex/server";
import { useAction } from "convex/react";
import { ChevronRight, Loader2 } from "lucide-react";
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

export default function Home() {
  const navigate = useNavigate();
  const { play, current } = usePlayer();
  const { items: news, loading: newsLoading } = useBuddhistNews();
  const [reader, setReader] = useState<(typeof news)[number] | null>(null);
  const [videos, setVideos] = useState<YtRow[] | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const searchVideos = useAction(anyApi.youtubeSync.search);
  const startedRef = useRef(false);

  useEffect(() => {
    const stop = trackScroll("home");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("home");
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

  return (
    <AppShell title="Trang chủ" hideTitle>
      {current && (
        <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
          <DockPlayer />
        </div>
      )}

      {/* ---------------- Tin tức Phật giáo Theravāda ---------------- */}
      <section className="mt-1">
        <header className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Tin tức</h2>
          <button
            type="button"
            onClick={() => navigate("/news")}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {newsLoading && topNews.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted/60" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted/60" />
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
          <p className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Chưa có tin tức.
          </p>
        )}
      </section>

      {/* ---------------- Video nổi bật ---------------- */}
      <section className="mt-8">
        <header className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Video nổi bật</h2>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {videoLoading && videos === null ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="aspect-video w-40 shrink-0 animate-pulse rounded-lg bg-muted/60 sm:w-60" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-2/5 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="space-y-1">
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
          <p className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Chưa nạp được video.
          </p>
        )}
      </section>

      {reader && <NewsReader item={reader} onClose={() => setReader(null)} />}
    </AppShell>
  );
}
