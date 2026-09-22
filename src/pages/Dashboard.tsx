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

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  useEffect(() => { saveUiState("dashboard-search", search); }, [search]);
  const [localWatch, setLocalWatch] = useState(() => loadLocalWatch());
  useEffect(() => { const refresh = () => setLocalWatch(loadLocalWatch()); refresh(); const iv = window.setInterval(refresh, 4000); return () => window.clearInterval(iv); }, [current]);
  const logo = useQuery(anyApi.appLogo.get);
  const talks = useQuery(api.dhamma.list, { limit: 2000 });
  const loading = talks === undefined;
  const [ytResults, setYtResults] = useState<YtRow[] | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const ytSearch = useAction(anyApi.youtubeSync.search);
  const searchQ = search.trim();

  useEffect(() => {
    if (searchQ.length === 0) { setYtResults(null); setNextPage(undefined); return; }
    let cancelled = false;
    setYtLoading(true);
    const timeout = window.setTimeout(() => {
      ytSearch({ q: searchQ }).then((r: { items: YtRow[]; nextPageToken?: string }) => { if (!cancelled) { setYtResults(r.items); setNextPage(r.nextPageToken); } }).catch(() => { if (!cancelled) setYtResults(null); }).finally(() => { if (!cancelled) setYtLoading(false); });
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ]);

  const loadMore = () => {
    if (!nextPage || loadingMore || searchQ.length === 0) return;
    setLoadingMore(true);
    ytSearch({ q: searchQ, pageToken: nextPage }).then((r: { items: YtRow[]; nextPageToken?: string }) => { setYtResults((prev) => [...(prev ?? []), ...r.items]); setNextPage(r.nextPageToken); }).catch(() => undefined).finally(() => setLoadingMore(false));
  };

  const [related, setRelated] = useState<YtRow[]>([]);
  const ytRelated = useAction(anyApi.youtubeSync.related);
  const relatedKey = current?.youtubeId ?? "";
  const relatedTitle = current?.title ?? "";
  useEffect(() => {
    if (!relatedKey) { setRelated([]); return; }
    let cancelled = false;
    ytRelated({ youtubeId: relatedKey, title: relatedTitle }).then((r: { items: YtRow[] }) => { if (!cancelled) setRelated(r.items); }).catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedKey, relatedTitle]);

  useEffect(() => { const stop = trackScroll("dashboard"); return () => stop(); }, []);
  useEffect(() => { if (!loading) restoreScroll("dashboard"); }, [loading]);
  const hasActiveVideo = Boolean(current);
  const isIdle = !hasActiveVideo && searchQ.length === 0;
  const rowToTalk = (r: YtRow): Talk => ({ _id: r._id, youtubeId: r.youtubeId, title: r.title, teacher: r.teacher || r.channelName, channelName: r.channelName, publishedAt: r.publishedAt, durationSec: r.durationSec, viewCount: r.viewCount, syncedAt: Date.now() }) as unknown as Talk;

  return (
    <AppShell title={t("talksTitle")} hideTitle>
      <AutoSync />
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-3 shadow-sm sm:-mx-5 sm:px-5">
        {!hasActiveVideo && <SearchRow value={search} onChange={setSearch} />}
        <DockPlayer className={cn(hasActiveVideo && "mt-1")} />
      </div>
      {isIdle && (
        <div className="flex flex-col items-center px-2 pb-16 pt-10 sm:pt-16">
          {logo?.url ? <img src={logo.url} alt="Dharma" className="h-32 w-32 rounded-full object-cover shadow-lg sm:h-36 sm:w-36" /> : <span className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-lg sm:h-36 sm:w-36">D</span>}
          <div className="mt-10 w-full max-w-2xl rounded-3xl border border-border/60 bg-card px-6 py-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">Thử tìm kiếm để bắt đầu</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">Hãy bắt đầu tìm kiếm pháp thoại — chúng tôi sẽ gợi ý những bài giảng phù hợp với bạn.</p>
          </div>
        </div>
      )}
      {!isIdle && <>
        {related.length > 0 && !searchQ && <section className="mb-6" aria-label="Pháp thoại liên quan"><h2 className="mb-3 text-lg font-semibold tracking-tight">Pháp thoại liên quan</h2><div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{related.map((r) => <TalkRow key={r.youtubeId} title={r.title} youtubeId={r.youtubeId} durationSec={r.durationSec} viewCount={r.viewCount} active={current?.youtubeId === r.youtubeId} onClick={() => play(rowToTalk(r))} />)}</div></section>}
        {searchQ.length > 0 && <section aria-label="Kết quả tìm kiếm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><SearchIcon className="h-4 w-4 text-destructive" />{t("results")}</h2><span className="text-xs text-muted-foreground">{ytLoading ? "…" : ytResults ? `${ytResults.length} ${t("articles")}` : ""}</span></div>{ytLoading ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex gap-4"><Skeleton className="aspect-video w-60 shrink-0 rounded-lg" /><div className="flex-1 space-y-2 pt-1"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div> : !ytResults || ytResults.length === 0 ? <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center"><SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{t("noResults")}</p></div> : <><div className="space-y-1">{ytResults.map((r) => <TalkRow key={r.youtubeId} title={r.title} youtubeId={r.youtubeId} durationSec={r.durationSec} viewCount={r.viewCount} progressSec={localProgressByTalk(localWatch, r.youtubeId, r.durationSec)} completed={localCompletedByTalk(localWatch, r.youtubeId)} active={current?.youtubeId === r.youtubeId} onClick={() => play(rowToTalk(r))} />)}</div>{nextPage && <div className="mt-5 flex justify-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border border-border/60 px-5 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60">{loadingMore ? "Đang tải…" : "Xem thêm kết quả"}</button></div>}</>}</section>}
      </>}
    </AppShell>
  );
}

function SearchRow({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const hasText = value.trim().length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stop]);

  return (
    <div className="flex w-full items-center justify-center" role="search">
      <div className="flex w-full max-w-2xl items-center gap-2.5">
        <div
          className={cn(
            "group flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border/70 bg-muted/80 px-3.5 shadow-sm transition-all duration-200",
            listening || hasText
              ? "border-destructive/30 bg-muted ring-2 ring-destructive/10"
              : "hover:border-border/80",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onChange("");
            }}
            placeholder="Tìm trên Dharma"
            aria-label="Tìm pháp thoại"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          {hasText && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Xóa từ khóa"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {micSupported ? (
          <button
            type="button"
            onClick={() => (listening ? stop() : start((text) => onChange(text)))}
            aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"}
            title={listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-foreground shadow-sm transition-all duration-200",
              listening
                ? "border-destructive/30 bg-destructive/10 text-destructive shadow-md ring-2 ring-destructive/10"
                : "hover:bg-accent",
            )}
          >
            {listening ? (
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-50" />
                <Mic className="relative h-5 w-5" />
              </span>
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground/50 shadow-sm">
            <Loader2 className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

function localProgressByTalk(rows: ReturnType<typeof loadLocalWatch>, youtubeId: string, durationSec: number) { const row = rows.find((p) => p.youtubeId === youtubeId); return row && !row.completed && row.positionSec > 5 && durationSec > 0 ? row.positionSec : undefined; }
function localCompletedByTalk(rows: ReturnType<typeof loadLocalWatch>, youtubeId: string) { return rows.find((p) => p.youtubeId === youtubeId)?.completed ?? false; }

export function TalkRow({ title, youtubeId, durationSec, viewCount, progressSec, completed, active, onClick }: { title: string; youtubeId: string; durationSec: number; viewCount?: number; progressSec?: number; completed?: boolean; active?: boolean; onClick(): void }) {
  const pct = progressSec && durationSec > 0 ? Math.min(100, (progressSec / durationSec) * 100) : undefined;
  return <button type="button" onClick={onClick} className={cn("group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-accent/60 sm:gap-4", active && "bg-accent ring-1 ring-destructive/40")}>
    <span className="relative block w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-60"><span className="block aspect-video w-full"><img src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" /></span><span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">{formatTime(durationSec)}</span>{completed && <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">Đã xem</span>}{active && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-destructive">Đang phát</span>}{pct !== undefined && <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40"><span className="block h-full bg-destructive" style={{ width: `${pct}%` }} /></span>}</span>
    <span className="flex min-w-0 flex-1 flex-col pt-0.5"><span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">{title}</span><span className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground"><Eye className="h-3.5 w-3.5" /><span className="tabular-nums">{formatCount(viewCount ?? 0)} {"lượt xem"}</span></span></span>
  </button>;
}

function AutoSync() {
  const sync = useAction(api.youtubeSync.syncLatest);
  useEffect(() => { const LAST_KEY = "dhamma-last-autosync"; const run = () => { const last = Number(localStorage.getItem(LAST_KEY) ?? 0); if (Date.now() - last < 30 * 60 * 1000) return; sync({ pages: 2 }).then(() => { localStorage.setItem(LAST_KEY, String(Date.now())); }).catch(() => {}); }; run(); const iv = window.setInterval(run, 30 * 60 * 1000); return () => window.clearInterval(iv); }, [sync]);
  return null;
}
