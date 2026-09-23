import { AppShell } from "@/components/AppShell";
import type { Doc } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { loadLocalWatch, type LocalWatchRow } from "@/lib/localProgress";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useAction, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { Eye, Mic, Search as SearchIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Talk = Doc<"dhammaTalks">;
type YtRow = { _id: string; youtubeId: string; title: string; teacher: string; channelName: string; publishedAt: string; durationSec: number; viewCount?: number };
type SearchResponse = { items: YtRow[]; nextPageToken?: string };
const HOME_QUERY = "pháp thoại Phật giáo Theravada";
const SUGGESTED_COUNT = 50; // số video đề xuất giáo lý Theravada hiển thị

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  const [localWatch, setLocalWatch] = useState<LocalWatchRow[]>(() => loadLocalWatch());
  const [results, setResults] = useState<YtRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [related, setRelated] = useState<YtRow[]>([]);
  const query = search.trim();
  const searchVideos = useAction(anyApi.youtubeSync.search);
  const relatedVideos = useAction(anyApi.youtubeSync.related);

  useEffect(() => { saveUiState("dashboard-search", search); }, [search]);
  useEffect(() => { const refresh = () => setLocalWatch(loadLocalWatch()); refresh(); const id = window.setInterval(refresh, 4000); return () => window.clearInterval(id); }, [current]);
  useEffect(() => { const stop = trackScroll("dashboard"); return stop; }, []);

  useEffect(() => {
    if (!query) { setResults(null); setNextPage(undefined); return; }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchVideos({ q: query }).then((r: SearchResponse) => { if (!cancelled) { setResults(r.items); setNextPage(r.nextPageToken); } }).catch(() => { if (!cancelled) setResults(null); }).finally(() => { if (!cancelled) setLoading(false); });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Danh sách 50 video đề xuất giáo lý Theravada — luôn hiển thị ở mục VIDEO
  // (khi không có từ khóa tìm kiếm).
  useEffect(() => {
    let cancelled = false;
    if (query) return;
    relatedVideos({ youtubeId: current?.youtubeId ?? "", title: current?.title ?? HOME_QUERY })
      .then((r: SearchResponse) => { if (!cancelled) setRelated(r.items.slice(0, SUGGESTED_COUNT)); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, current?.youtubeId, current?.title]);

  useEffect(() => { if (!loading) restoreScroll("dashboard"); }, [loading]);

  const loadMore = () => {
    if (!nextPage || loadingMore || !query) return;
    setLoadingMore(true);
    searchVideos({ q: query, pageToken: nextPage }).then((r: SearchResponse) => { setResults((old) => [...(old ?? []), ...r.items]); setNextPage(r.nextPageToken); }).catch(() => undefined).finally(() => setLoadingMore(false));
  };
  const toTalk = (row: YtRow): Talk => ({ _id: row._id || row.youtubeId, youtubeId: row.youtubeId, title: row.title, teacher: row.teacher || row.channelName, channelName: row.channelName, publishedAt: row.publishedAt, durationSec: row.durationSec, viewCount: row.viewCount, syncedAt: Date.now() }) as unknown as Talk;
  const openVideo = (row: YtRow) => { setSearch(""); setResults(null); setNextPage(undefined); play(toTalk(row)); };
  const hasVideo = Boolean(current);

  return (
    <AppShell title="VIDEO" hideTitle>
      {/* Video 100% trực tiếp từ YouTube API — không dùng kho cục bộ */}
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-3 shadow-sm sm:-mx-5 sm:px-5">
        {!hasVideo && <SearchRow value={search} onChange={setSearch} />}
        <DockPlayer className={cn(hasVideo && "mt-1")} />
      </div>

      {/* 50 video đề xuất — KHÔNG tiêu đề, KHÔNG đếm số lượng */}
      {!query && related.length > 0 && (
        <section className="mb-6" aria-label="Video đề xuất giáo lý Theravada">
          <div className="space-y-1">
            {related.map((row) => <TalkRow key={row.youtubeId} title={row.title} youtubeId={row.youtubeId} durationSec={row.durationSec} viewCount={row.viewCount} active={current?.youtubeId === row.youtubeId} onClick={() => openVideo(row)} />)}
          </div>
        </section>
      )}

      {query && <SearchResults loading={loading} results={results} nextPage={nextPage} loadingMore={loadingMore} loadMore={loadMore} noResults={t("noResults")} onOpen={openVideo} />}
    </AppShell>
  );
}

function SearchResults({ loading, results, nextPage, loadingMore, loadMore, noResults, onOpen }: { loading: boolean; results: YtRow[] | null; nextPage?: string; loadingMore: boolean; loadMore: () => void; noResults: string; onOpen: (row: YtRow) => void }) {
  return <section aria-label="Kết quả tìm kiếm">{loading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex gap-4"><Skeleton className="aspect-video w-40 shrink-0 rounded-lg sm:w-60" /><div className="flex-1 space-y-2 pt-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div> : !results || results.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center"><SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{noResults}</p></div> : <><div className="space-y-1">{results.map((row) => <TalkRow key={row.youtubeId} title={row.title} youtubeId={row.youtubeId} durationSec={row.durationSec} viewCount={row.viewCount} onClick={() => onOpen(row)} />)}</div>{nextPage && <div className="mt-5 flex justify-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-border/60 px-5 py-2 text-sm transition hover:bg-accent disabled:opacity-60">{loadingMore ? "Đang tải…" : "Xem thêm kết quả"}</button></div>}</>}</section>;
}

function SearchRow({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { supported, listening, start, stop } = useVoiceSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = value.trim().length > 0;
  return <div className="flex w-full items-center justify-center" role="search"><div className="flex w-full max-w-2xl items-center gap-2.5"><div className={cn("flex h-12 min-w-0 flex-1 items-center rounded-full border border-border/70 bg-muted/80 pl-4 pr-2 shadow-sm", (listening || hasText) && "border-destructive/30 ring-2 ring-destructive/10")} onClick={() => inputRef.current?.focus()}><input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onChange(""); }} aria-label="Tìm video" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />{hasText && <button type="button" onClick={() => onChange("")} aria-label="Xóa từ khóa" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>}<div className="flex shrink-0 items-center gap-1.5 pl-1.5">{supported ? <button type="button" onClick={() => listening ? stop() : start(onChange)} aria-label="Tìm bằng giọng nói" className={cn("flex h-8 w-8 items-center justify-center rounded-full border transition", listening ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground")}>{listening ? <span className="relative flex h-4 w-4 items-center justify-center"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" /><Mic className="relative h-4 w-4" /></span> : <Mic className="h-4 w-4" />}</button> : null}<button type="button" aria-label="Tìm" onClick={() => { if (hasText) onChange(value); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"><SearchIcon className="h-4 w-4" /></button></div></div></div></div>;
}

function localProgressByTalk(rows: LocalWatchRow[], id: string, duration: number) { const row = rows.find((item) => item.youtubeId === id); return row && !row.completed && row.positionSec > 5 && duration > 0 ? row.positionSec : undefined; }
function localCompletedByTalk(rows: LocalWatchRow[], id: string) { return rows.find((item) => item.youtubeId === id)?.completed ?? false; }

export function TalkRow({ title, youtubeId, durationSec, viewCount, progressSec, completed, active, onClick }: { title: string; youtubeId: string; durationSec: number; viewCount?: number; progressSec?: number; completed?: boolean; active?: boolean; onClick: () => void }) {
  const percent = progressSec && durationSec > 0 ? Math.min(100, (progressSec / durationSec) * 100) : undefined;
  return <button type="button" onClick={onClick} className={cn("group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-accent/60 sm:gap-4", active && "bg-accent ring-1 ring-destructive/40")}><span className="relative block w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-60"><span className="block aspect-video w-full"><img src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" /></span><span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">{formatTime(durationSec)}</span>{completed && <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">Đã xem</span>}{active && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-destructive">Đang phát</span>}{percent !== undefined && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40"><span className="block h-full bg-destructive" style={{ width: `${percent}%` }} /></span>}</span><span className="flex min-w-0 flex-1 flex-col pt-0.5"><span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">{title}</span><span className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Eye className="h-3.5 w-3.5" /><span className="tabular-nums">{formatCount(viewCount ?? 0)} lượt xem</span></span></span></button>;
}


