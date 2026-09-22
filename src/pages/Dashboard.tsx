import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { loadLocalWatch } from "@/lib/localProgress";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useAction, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { Eye, Loader2, Mic, Search as SearchIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Talk = Doc<"dhammaTalks">;
type YtRow = { _id: string; youtubeId: string; title: string; teacher: string; channelName: string; publishedAt: string; durationSec: number; viewCount?: number };
type SearchResponse = { items: YtRow[]; nextPageToken?: string };

const HOME_RECOMMENDATION_QUERY = "pháp thoại Phật giáo Theravada";

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  const [localWatch, setLocalWatch] = useState(() => loadLocalWatch());
  const [ytResults, setYtResults] = useState<YtRow[] | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [related, setRelated] = useState<YtRow[]>([]);
  const searchQ = search.trim();
  const talks = useQuery(api.dhamma.list, { limit: 2000 });
  const loading = talks === undefined;
  const ytSearch = useAction(anyApi.youtubeSync.search);
  const ytRelated = useAction(anyApi.youtubeSync.related);

  useEffect(() => { saveUiState("dashboard-search", search); }, [search]);
  useEffect(() => {
    const refresh = () => setLocalWatch(loadLocalWatch());
    refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => window.clearInterval(timer);
  }, [current]);
  useEffect(() => { const stop = trackScroll("dashboard"); return stop; }, []);
  useEffect(() => { if (!loading) restoreScroll("dashboard"); }, [loading]);

  useEffect(() => {
    if (!searchQ) { setYtResults(null); setNextPage(undefined); return; }
    let cancelled = false;
    setYtLoading(true);
    const timer = window.setTimeout(() => {
      ytSearch({ q: searchQ })
        .then((result: SearchResponse) => { if (!cancelled) { setYtResults(result.items); setNextPage(result.nextPageToken); } })
        .catch(() => { if (!cancelled) setYtResults(null); })
        .finally(() => { if (!cancelled) setYtLoading(false); });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ]);

  useEffect(() => {
    let cancelled = false;
    const youtubeId = current?.youtubeId ?? "";
    const title = current?.title ?? HOME_RECOMMENDATION_QUERY;
    ytRelated({ youtubeId, title })
      .then((result: SearchResponse) => { if (!cancelled) setRelated(result.items); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.youtubeId, current?.title]);

  const loadMore = () => {
    if (!nextPage || loadingMore || !searchQ) return;
    setLoadingMore(true);
    ytSearch({ q: searchQ, pageToken: nextPage })
      .then((result: SearchResponse) => { setYtResults((previous) => [...(previous ?? []), ...result.items]); setNextPage(result.nextPageToken); })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  };

  const rowToTalk = (row: YtRow): Talk => ({
    _id: row._id || row.youtubeId, youtubeId: row.youtubeId, title: row.title,
    teacher: row.teacher || row.channelName, channelName: row.channelName,
    publishedAt: row.publishedAt, durationSec: row.durationSec, viewCount: row.viewCount,
    syncedAt: Date.now(),
  }) as unknown as Talk;
  const hasActiveVideo = Boolean(current);

  return (
    <AppShell title={"VIDEO"} hideTitle>
      <AutoSync />
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-3 shadow-sm sm:-mx-5 sm:px-5">
        {!hasActiveVideo && <SearchRow value={search} onChange={setSearch} />}
        <DockPlayer className={cn(hasActiveVideo && "mt-1")} />
      </div>

      {!searchQ && related.length > 0 && (
        <section className="mb-6" aria-label="Đề xuất pháp thoại Phật giáo Theravada">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Đề xuất Theravada</h2>
            <span className="text-xs text-muted-foreground">Video</span>
          </div>
          <div className="space-y-1">
            {related.map((row) => <TalkRow key={row.youtubeId} title={row.title} youtubeId={row.youtubeId} durationSec={row.durationSec} viewCount={row.viewCount} active={current?.youtubeId === row.youtubeId} onClick={() => play(rowToTalk(row))} />)}
          </div>
        </section>
      )}

      {searchQ && (
        <section aria-label="Kết quả tìm kiếm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><SearchIcon className="h-4 w-4 text-destructive" />{t("results")}</h2>
            <span className="text-xs text-muted-foreground">{ytLoading ? "…" : ytResults ? `${ytResults.length} ${t("articles")}` : ""}</span>
          </div>
          {ytLoading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="flex gap-4"><Skeleton className="aspect-video w-40 shrink-0 rounded-lg sm:w-60" /><div className="flex-1 space-y-2 pt-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div> : !ytResults || ytResults.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center"><SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{t("noResults")}</p></div> : <><div className="space-y-1">{ytResults.map((row) => <TalkRow key={row.youtubeId} title={row.title} youtubeId={row.youtubeId} durationSec={row.durationSec} viewCount={row.viewCount} progressSec={localProgressByTalk(localWatch, row.youtubeId, row.durationSec)} completed={localCompletedByTalk(localWatch, row.youtubeId)} active={current?.youtubeId === row.youtubeId} onClick={() => play(rowToTalk(row))} />)}</div>{nextPage && <div className="mt-5 flex justify-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-border/60 px-5 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-60">{loadingMore ? "Đang tải…" : "Xem thêm kết quả"}</button></div>}</>}
        </section>
      )}
    </AppShell>
  );
}

function SearchRow({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const hasText = value.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!listening) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") stop(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [listening, stop]);
  return <div className="flex w-full items-center justify-center" role="search"><div className="flex w-full max-w-2xl items-center gap-2.5"><div className={cn("group flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border/70 bg-muted/80 px-3.5 shadow-sm transition-all duration-200", listening || hasText ? "border-destructive/30 bg-muted ring-2 ring-destructive/10" : "hover:border-border/80")} onClick={() => inputRef.current?.focus()}><input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onChange(""); }} placeholder="Tìm trên Dharma" aria-label="Tìm pháp thoại" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />{hasText && <button type="button" onClick={() => onChange("")} aria-label="Xóa từ khóa" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm"><SearchIcon className="h-4 w-4" /></span></div>{micSupported ? <button type="button" onClick={() => listening ? stop() : start(onChange)} aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background shadow-sm transition", listening ? "bg-destructive/10 text-destructive ring-2 ring-destructive/10" : "hover:bg-accent")}><Mic className="h-5 w-5" /></button> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground/50"><Loader2 className="h-5 w-5" /></span>}</div></div>;
}

function localProgressByTalk(rows: ReturnType<typeof loadLocalWatch>, youtubeId: string, durationSec: number) { const row = rows.find((item) => item.youtubeId === youtubeId); return row && !row.completed && row.positionSec > 5 && durationSec > 0 ? row.positionSec : undefined; }
function localCompletedByTalk(rows: ReturnType<typeof loadLocalWatch>, youtubeId: string) { return rows.find((item) => item.youtubeId === youtubeId)?.completed ?? false; }

export function TalkRow({ title, youtubeId, durationSec, viewCount, progressSec, completed, active, onClick }: { title: string; youtubeId: string; durationSec: number; viewCount?: number; progressSec?: number; completed?: boolean; active?: boolean; onClick(): void }) {
  const percent = progressSec && durationSec > 0 ? Math.min(100, (progressSec / durationSec) * 100) : undefined;
  return <button type="button" onClick={onClick} className={cn("group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-accent/60 sm:gap-4", active && "bg-accent ring-1 ring-destructive/40")}><span className="relative block w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-60"><span className="block aspect-video w-full"><img src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" /></span><span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">{formatTime(durationSec)}</span>{completed && <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">Đã xem</span>}{active && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-destructive">Đang phát</span>}{percent !== undefined && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40"><span className="block h-full bg-destructive" style={{ width: `${percent}%` }} /></span>}</span><span className="flex min-w-0 flex-1 flex-col pt-0.5"><span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">{title}</span><span className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Eye className="h-3.5 w-3.5" /><span className="tabular-nums">{formatCount(viewCount ?? 0)} lượt xem</span></span></span></button>;
}

function AutoSync() { const sync = useAction(api.youtubeSync.syncLatest); useEffect(() => { const key = "dhamma-last-autosync"; const run = () => { const last = Number(localStorage.getItem(key) ?? 0); if (Date.now() - last < 30 * 60 * 1000) return; sync({ pages: 2 }).then(() => localStorage.setItem(key, String(Date.now()))).catch(() => undefined); }; run(); const timer = window.setInterval(run, 30 * 60 * 1000); return () => window.clearInterval(timer); }, [sync]); return null; }
