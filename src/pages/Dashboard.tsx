import { AppShell } from "@/components/AppShell";
import type { Doc } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { relatedDirect, searchDirect } from "@/lib/youtubeDirect";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useAction } from "convex/react";
import { anyApi } from "convex/server";
import { Film, Eye, Mic, Search as SearchIcon, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Talk = Doc<"dhammaTalks">;
type YtRow = { _id: string; youtubeId: string; title: string; teacher: string; channelName: string; publishedAt: string; durationSec: number; viewCount?: number };
type SearchResponse = { items: YtRow[]; nextPageToken?: string };
const HOME_QUERY = "pháp thoại Phật giáo Theravada";
const SUGGESTED_COUNT = 50; // số video đề xuất giáo lý Theravada hiển thị
const SEARCH_DEBOUNCE_MS = 350; // phản hồi tìm kiếm nhanh

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  const [results, setResults] = useState<YtRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [related, setRelated] = useState<YtRow[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState(false);
  const query = search.trim();
  const searchVideos = useAction(anyApi.youtubeSync.search);
  const relatedVideos = useAction(anyApi.youtubeSync.related);

  useEffect(() => { saveUiState("dashboard-search", search); }, [search]);
  useEffect(() => { const stop = trackScroll("dashboard"); return stop; }, []);

  // FIX "không hiển thị dữ liệu" + TỐC ĐỘ: chỉ thử Convex 1 lần (không
  // chờ retry nhiều tầng), lỗi → fallback client gọi thẳng nguồn công cộng
  // (race song song) để video LUÔN hiện, trong ~1-2 giây thay vì 30s+.
  const searchWithRetry = useCallback(async (args: { q: string; pageToken?: string }): Promise<SearchResponse> => {
    try {
      return await searchVideos(args) as SearchResponse;
    } catch {
      return searchDirect(args.q);
    }
  }, [searchVideos]);

  const relatedWithRetry = useCallback(async (args: { youtubeId: string; title: string }): Promise<SearchResponse> => {
    try {
      const r = await relatedVideos(args) as SearchResponse;
      if (r.items.length > 0) return r;
      throw new Error("empty");
    } catch {
      return relatedDirect(args.youtubeId, args.title, SUGGESTED_COUNT);
    }
  }, [relatedVideos]);

  useEffect(() => {
    if (!query) { setResults(null); setNextPage(undefined); return; }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchWithRetry({ q: query }).then((r: SearchResponse) => { if (!cancelled) { setResults(r.items); setNextPage(r.nextPageToken); } }).catch(() => { if (!cancelled) setResults(null); }).finally(() => { if (!cancelled) setLoading(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchWithRetry]);

  // Danh sách 50 video đề xuất giáo lý Theravada — luôn hiển thị ở mục VIDEO
  // (khi không có từ khóa tìm kiếm). Skeleton khi nạp, thông báo khi lỗi.
  useEffect(() => {
    let cancelled = false;
    if (query) return;
    setRelatedLoading(true);
    setRelatedError(false);
    relatedWithRetry({ youtubeId: current?.youtubeId ?? "", title: current?.title ?? HOME_QUERY })
      .then((r: SearchResponse) => { if (!cancelled) setRelated(r.items.slice(0, SUGGESTED_COUNT)); })
      .catch(() => { if (!cancelled) { setRelated([]); setRelatedError(true); } })
      .finally(() => { if (!cancelled) setRelatedLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, current?.youtubeId, current?.title, relatedWithRetry]);

  useEffect(() => { if (!loading) restoreScroll("dashboard"); }, [loading]);

  const loadMore = () => {
    if (!nextPage || loadingMore || !query) return;
    setLoadingMore(true);
    searchWithRetry({ q: query, pageToken: nextPage }).then((r: SearchResponse) => { setResults((old) => [...(old ?? []), ...r.items]); setNextPage(r.nextPageToken); }).catch(() => undefined).finally(() => setLoadingMore(false));
  };
  const toTalk = (row: YtRow): Talk => ({ _id: row._id || row.youtubeId, youtubeId: row.youtubeId, title: row.title, teacher: row.teacher || row.channelName, channelName: row.channelName, publishedAt: row.publishedAt, durationSec: row.durationSec, viewCount: row.viewCount, syncedAt: Date.now() }) as unknown as Talk;
  const openVideo = (row: YtRow) => { setSearch(""); setResults(null); setNextPage(undefined); play(toTalk(row)); };
  const hasVideo = Boolean(current);
  // Không bao giờ lặp lại chính video đang phát trong danh sách liên quan
  const relatedShown = useMemo(
    () => related.filter((row) => row.youtubeId !== current?.youtubeId),
    [related, current?.youtubeId],
  );

  return (
    <AppShell title="VIDEO" hideTitle>
      {/* Video 100% trực tiếp từ YouTube API — không dùng kho cục bộ */}
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-3 shadow-sm sm:-mx-5 sm:px-5">
        {!hasVideo && <SearchRow value={search} onChange={setSearch} />}
        <DockPlayer className={cn(hasVideo && "mt-1")} />
      </div>

      {/* Khi ĐANG XEM một video → mục VIDEO hiển thị VIDEO LIÊN QUAN của video
          đó (bấm vào là chuyển ngay, danh sách tự đổi theo video mới).
          Trang chủ vẫn giữ 50 video đề xuất — KHÔNG tiêu đề, KHÔNG đếm số lượng.
          Skeleton khi nạp · thông báo lỗi + nút thử lại khi thất bại. */}
      {!query && hasVideo && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-4">
          <h2 className="flex shrink-0 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Film className="h-3.5 w-3.5" />
            Video liên quan
          </h2>
          <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground/80">
            Cùng chủ đề với «{current?.title}»
          </p>
        </div>
      )}
      {!query && relatedLoading && (
        <div
          className="space-y-3"
          aria-label={hasVideo ? "Đang nạp video liên quan" : "Đang nạp video đề xuất"}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="aspect-video w-40 shrink-0 rounded-lg sm:w-60" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!query && !relatedLoading && relatedError && relatedShown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {hasVideo
              ? "Không nạp được video liên quan lần này — kiểm tra kết nối mạng rồi thử lại."
              : "Không nạp được video đề xuất lần này — kiểm tra kết nối mạng rồi thử lại."}
          </p>
          <button
            type="button"
            onClick={() => {
              setRelatedError(false);
              setRelatedLoading(true);
              relatedWithRetry({ youtubeId: current?.youtubeId ?? "", title: current?.title ?? HOME_QUERY })
                .then((r: SearchResponse) => setRelated(r.items.slice(0, SUGGESTED_COUNT)))
                .catch(() => setRelatedError(true))
                .finally(() => setRelatedLoading(false));
            }}
            className="mt-4 rounded-full border border-border/60 px-5 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Thử lại
          </button>
        </div>
      )}
      {!query && !relatedLoading && relatedShown.length > 0 && (
        <section
          className="mb-6"
          aria-label={hasVideo ? "Video liên quan" : "Video đề xuất giáo lý Theravada"}
        >
          <div className="space-y-1">
            {relatedShown.map((row) => <TalkRow key={row.youtubeId} title={row.title} youtubeId={row.youtubeId} durationSec={row.durationSec} viewCount={row.viewCount} active={current?.youtubeId === row.youtubeId} onClick={() => openVideo(row)} />)}
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
  // Đồng bộ bố cục SearchToolbar: [micro] [ô nhập] ...... [kính lúp]
  return <div className="flex w-full items-center justify-center" role="search"><div className="flex w-full max-w-2xl items-center gap-2.5"><div className={cn("flex h-12 min-w-0 flex-1 items-center rounded-full border border-border/70 bg-muted/80 pl-2 pr-2 shadow-sm", (listening || hasText) && "border-destructive/30 ring-2 ring-destructive/10")} onClick={() => inputRef.current?.focus()}>{supported ? <button type="button" onClick={(e) => { e.stopPropagation(); listening ? stop() : start(onChange); }} aria-label="Tìm bằng giọng nói" className={cn("mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition", listening ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground")}>{listening ? <span className="relative flex h-4 w-4 items-center justify-center"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" /><Mic className="relative h-4 w-4" /></span> : <Mic className="h-4 w-4" />}</button> : null}<input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onChange(""); }} aria-label="Tìm video" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none" />{hasText && <button type="button" onClick={() => onChange("")} aria-label="Xóa từ khóa" className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>}<button type="button" aria-label="Tìm" onClick={() => { if (hasText) onChange(value); }} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition", hasText ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground" : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground")}><SearchIcon className="h-4 w-4" /></button></div></div></div>;
}

export function TalkRow({ title, youtubeId, durationSec, viewCount, progressSec, completed, active, onClick }: { title: string; youtubeId: string; durationSec: number; viewCount?: number; progressSec?: number; completed?: boolean; active?: boolean; onClick: () => void }) {
  const percent = progressSec && durationSec > 0 ? Math.min(100, (progressSec / durationSec) * 100) : undefined;
  return <button type="button" onClick={onClick} className={cn("group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-accent/60 sm:gap-4", active && "bg-accent ring-1 ring-destructive/40")}><span className="relative block w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-60"><span className="block aspect-video w-full"><img src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" /></span><span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">{formatTime(durationSec)}</span>{completed && <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">Đã xem</span>}{active && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-destructive">Đang phát</span>}{percent !== undefined && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40"><span className="block h-full bg-destructive" style={{ width: `${percent}%` }} /></span>}</span><span className="flex min-w-0 flex-1 flex-col pt-0.5"><span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">{title}</span><span className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Eye className="h-3.5 w-3.5" /><span className="tabular-nums">{formatCount(viewCount ?? 0)} lượt xem</span></span></span></button>;
}


