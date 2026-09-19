import { AppShell } from "@/components/AppShell";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatCount, formatTime, usePlayer } from "@/lib/player";
import { APP_VERSION } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  Clock,
  Eye,
  History,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Talk = Doc<"dhammaTalks">;

type ProgressRow = {
  talkId: Id<"dhammaTalks">;
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt: number;
};

const PAGE_SIZE = 24;

export default function Dashboard() {
  const { play, current } = usePlayer();

  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const progress = useQuery(api.dhamma.myProgress, {});

  // Trang đầu (luôn nạp) + trang kế tiếp khi bấm "Tải thêm".
  // FIX: tăng threshold để mọi trang đầu (kể cả 499-video) kích hoạt việc nạp
  // trang offset=24 ngay; trước đây callback chạy trước khi currentPage đủ lớn
  // nên list thay đổi mà callback không bao giờ chạy lại → Tải thêm "kẹt".
  const firstPage = useQuery(api.dhamma.list, {
    limit: PAGE_SIZE,
    offset: 0,
  });
  const nextPage = useQuery(
    api.dhamma.list,
    offset > 0 ? { limit: PAGE_SIZE, offset } : "skip",
  );

  const talks = useMemo(() => {
    const a = firstPage ?? [];
    const b = nextPage ?? [];
    const seen = new Set<string>();
    const out: Talk[] = [];
    for (const t of [...a, ...b]) {
      if (seen.has(t.youtubeId)) continue;
      seen.add(t.youtubeId);
      out.push(t);
    }
    return out;
  }, [firstPage, nextPage]);

  const loading = firstPage === undefined;
  // Còn nạp được nữa khi: chưa tải trang kế, hoặc trang kế trả về đủ một trang
  const canLoadMore =
    !loading && (nextPage === undefined || nextPage.length === PAGE_SIZE);

  // Đã xem: từ tiến trình
  const watched = useMemo(
    () => (progress ?? []).slice(0, 10),
    [progress],
  );

  // Liên quan: cùng giảng sư với video đang phát (loại video đang phát)
  const related = useMemo(() => {
    if (!current) return [];
    return talks
      .filter(
        (t) =>
          t.youtubeId !== current.youtubeId &&
          (t.teacher === current.teacher || t.channelName === current.channelName),
      )
      .slice(0, 8);
  }, [talks, current]);

  // Lọc tìm kiếm (tiêu đề + giảng sư)
  const searchQ = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!searchQ) return talks;
    return talks.filter(
      (t) =>
        t.title.toLowerCase().includes(searchQ) ||
        t.teacher.toLowerCase().includes(searchQ),
    );
  }, [talks, searchQ]);

  // Hero: bài mới nhất (chỉ khi không tìm kiếm)
  const hero = !searchQ ? filtered[0] : undefined;
  const rest = searchQ ? filtered : filtered.slice(1);



  return (
    <AppShell
      title="Pháp thoại Theravāda"
      subtitle="Đề xuất thuyết giảng từ các vị giảng sư Phật giáo Nguyên thủy"
      actions={<SyncButton />}
    >
      {/* ---------- Thanh tìm kiếm (kèm giọng nói) ---------- */}
      <div className="mb-6 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm pháp thoại, giảng sư…"
            className="h-10 w-full rounded-full border border-border/70 bg-card/80 pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <VoiceSearchButton onResult={(text) => setSearch(text)} />
      </div>

      {/* ---------- Hero + Tiếp tục xem ---------- */}
      {!searchQ && (
        <section className="mb-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          {hero ? (
            <button
              type="button"
              onClick={() => play(hero)}
              className="group relative overflow-hidden rounded-2xl border border-border/60 text-left shadow-md transition hover:shadow-lg"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted sm:aspect-[21/9]">
                <img
                  src={`https://i.ytimg.com/vi/${hero.youtubeId}/maxresdefault.jpg`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${hero.youtubeId}/hqdefault.jpg`;
                  }}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <Badge className="mb-2 border border-gold/60 bg-black/40 text-gold">
                    <Sparkles className="mr-1 h-3 w-3" /> Đề xuất hôm nay
                  </Badge>
                  <h1 className="line-clamp-2 text-lg font-bold leading-snug text-white sm:text-2xl">
                    {hero.title}
                  </h1>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/80 sm:text-sm">
                    <span>{hero.teacher}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(hero.durationSec)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {formatCount(hero.viewCount ?? 0)} lượt xem
                    </span>
                  </p>
                </div>
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 backdrop-blur transition group-hover:scale-110 group-hover:bg-primary/90">
                  <Play className="ml-1 h-7 w-7 fill-white text-white" />
                </span>
              </div>
            </button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-6">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          )}

          {/* Cột phải: Tiếp tục xem */}
          <aside>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-4 w-4" />
              Tiếp tục xem
            </h2>
            {progress === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : watched.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-4 text-center text-xs leading-relaxed text-muted-foreground">
                Chưa có tiến trình xem.
                <br />
                Hãy mở một pháp thoại — ứng dụng sẽ tự ghi nhớ vị trí bạn
                dừng lại.
              </div>
            ) : (
              <ul className="space-y-2">
                {watched.map((p) => (
                  <TalkRow
                    key={String(p.talkId)}
                    title={p.title}
                    teacher={p.teacher}
                    youtubeId={p.youtubeId}
                    durationSec={p.durationSec}
                    viewCount={undefined}
                    progressSec={p.positionSec}
                    completed={p.completed}
                    active={current?.youtubeId === p.youtubeId}
                    onClick={() =>
                      play({
                        _id: p.talkId,
                        youtubeId: p.youtubeId,
                        title: p.title,
                        teacher: p.teacher,
                        channelName: p.channelName,
                        publishedAt: p.publishedAt,
                        durationSec: p.durationSec,
                      })
                    }
                  />
                ))}
              </ul>
            )}
          </aside>
        </section>
      )}

      {/* ---------- Liên quan: cùng giảng sư với đang phát ---------- */}
      {related.length > 0 && !searchQ && (
        <section className="mb-6" aria-label="Pháp thoại liên quan">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0 text-gold" />
            <span className="shrink-0">Liên quan ·</span>
            <span className="truncate normal-case">{current?.teacher}</span>
          </h2>
          <div className="grid grid-cols-1 gap-x-5 gap-y-1 md:grid-cols-2">
            {related.map((t) => (
              <TalkRow
                key={t._id}
                title={t.title}
                teacher={t.teacher}
                youtubeId={t.youtubeId}
                durationSec={t.durationSec}
                viewCount={t.viewCount}
                active={current?.youtubeId === t.youtubeId}
                onClick={() => play(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Danh sách chính ---------- */}
      <section aria-label="Pháp thoại đề xuất">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {searchQ && (
              <>
                <Search className="h-4 w-4 text-gold" /> Kết quả tìm kiếm
              </>
            )}
          </h2>
          <span className="text-xs text-muted-foreground">
            {loading ? "…" : `${filtered.length} bài`}
          </span>
        </div>

        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[5.25rem] w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Không tìm thấy pháp thoại nào phù hợp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-1 md:grid-cols-2">
            {rest.map((t) => (
              <TalkRow
                key={t._id}
                title={t.title}
                teacher={t.teacher}
                youtubeId={t.youtubeId}
                durationSec={t.durationSec}
                viewCount={t.viewCount}
                progressSec={progressByTalk(progress, t)}
                completed={completedByTalk(progress, t)}
                active={current?.youtubeId === t.youtubeId}
                onClick={() => play(t)}
              />
            ))}
          </div>
        )}

        {/* Cổng cuộn tự động: chạm tới là nạp trang kế tiếp */}
        {canLoadMore && !searchQ && (
          <div
            ref={sentinelRef}
            className="mt-6 flex items-center justify-center py-2 text-muted-foreground"
          >
            {nextPage === undefined && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
        )}
      </section>

      {/* ---------- Chân trang: chỉ nhà phát triển + phiên bản ---------- */}
      <footer className="mt-14 border-t border-border/60 pt-5 text-center text-xs text-muted-foreground">
        <p>
          Nhà phát triển:{" "}
          <span className="font-medium text-foreground/80">
            Hứa Tiến Dương
          </span>{" "}
          · Phiên bản {APP_VERSION}
        </p>
      </footer>
    </AppShell>
  );
}

/* ---------------------- helpers tiến trình ---------------------- */

function progressByTalk(
  progress: ProgressRow[] | undefined,
  t: Talk,
): number | undefined {
  const row = progress?.find((p) => p.youtubeId === t.youtubeId);
  return row && !row.completed && row.positionSec > 5
    ? row.positionSec
    : undefined;
}

function completedByTalk(
  progress: ProgressRow[] | undefined,
  t: Talk,
): boolean {
  return (
    progress?.find((p) => p.youtubeId === t.youtubeId)?.completed ?? false
  );
}

/* ------------------------------------------------------------------ */
/* Hàng pháp thoại: thumbnail TRÁI — tiêu đề/thời lượng/lượt xem PHẢI  */
/* ------------------------------------------------------------------ */

export function TalkRow({
  title,
  teacher,
  youtubeId,
  durationSec,
  viewCount,
  progressSec,
  completed,
  active,
  onClick,
}: {
  title: string;
  teacher?: string;
  youtubeId: string;
  durationSec: number;
  viewCount?: number;
  progressSec?: number;
  completed?: boolean;
  active?: boolean;
  onClick(): void;
}) {
  const pct =
    progressSec && durationSec > 0
      ? Math.min(100, (progressSec / durationSec) * 100)
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-stretch gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-border/60 hover:bg-accent/40",
        active && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Thumbnail bên trái */}
      <span className="relative block w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
        <span className="block aspect-video w-full">
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </span>
        {/* Thời lượng đè lên thumbnail */}
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(durationSec)}
        </span>
        {completed && (
          <span className="absolute left-1 top-1 rounded bg-primary px-1 py-0.5 text-[9px] font-medium text-primary-foreground">
            Đã xem
          </span>
        )}
        {active && (
          <span className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-gold">
            Đang phát
          </span>
        )}
        {pct !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>

      {/* Thông tin bên phải: tiêu đề + thời lượng + lượt xem */}
      <span className="min-w-0 flex-1 py-0.5">
        <span className="line-clamp-2 block text-sm font-medium leading-snug group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{formatTime(durationSec)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span className="tabular-nums">
              {formatCount(viewCount ?? 0)} lượt xem
            </span>
          </span>
        </span>
        {teacher && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/70">
            {teacher}
          </span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Nút đồng bộ pháp thoại mới từ YouTube                               */
/* ------------------------------------------------------------------ */

function SyncButton() {
  const sync = useAction(api.youtubeSync.syncLatest);
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await sync({ pages: 4 });
          toast.success(
            `Đã đồng bộ: +${res.inserted} mới, cập nhật ${res.updated}`,
          );
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Đồng bộ thất bại. Kiểm tra YOUTUBE_API_KEY.",
          );
        } finally {
          setBusy(false);
        }
      }}
      className="gap-2"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      Đồng bộ
    </Button>
  );
}
