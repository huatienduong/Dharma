import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { APP_VERSION } from "@/lib/version";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  Eye,
  Play,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();

  const [search, setSearch] = useState("");

  // Tiến trình người dùng đã đăng nhập (server)
  const progress = useQuery(api.dhamma.myProgress, {});

  // Tải TOÀN BỘ kho pháp thoại một lần (không phân trang — khắc phục
  // triệt để lỗi nút Tải thêm không nạp video). Nút Đồng bộ trên header
  // sẽ kéo thêm video mới từ các kênh YouTube vào kho chung.
  const talks = useQuery(api.dhamma.list, { limit: 2000 });

  const loading = talks === undefined;

  // Liên quan: cùng giảng sư với video đang phát (loại video đang phát)
  const related = useMemo(() => {
    if (!current || !talks) return [];
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
    if (!searchQ) return talks ?? [];
    return (talks ?? []).filter(
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
      title={t("talksTitle")}
      subtitle={t("talksSubtitle")}
    >
      {/* Đồng bộ tự động ngầm — ẩn khỏi giao diện */}
      <AutoSync />
      {/* ---------- Thanh tìm kiếm dùng chung: mic trái · kính lúp phải trong pill ---------- */}
      <div className="mb-6">
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      {/* ---------- Hero (tràn khung, không cột phải) ---------- */}
      {!searchQ && (
        <section className="mb-6">
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
                    <Sparkles className="mr-1 h-3 w-3" /> {t("todayPick")}
                  </Badge>
                  <h1 className="line-clamp-2 text-lg font-bold leading-snug text-white sm:text-2xl">
                    {hero.title}
                  </h1>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/80 sm:text-sm">
                    <span>{hero.teacher}</span>
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

        </section>
      )}

      {/* ---------- Liên quan: cùng giảng sư với đang phát ---------- */}
      {related.length > 0 && !searchQ && (
        <section className="mb-6" aria-label="Pháp thoại liên quan">
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
        {searchQ && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Search className="h-4 w-4 text-gold" /> Kết quả tìm kiếm
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${filtered.length} bài`}
            </span>
          </div>
        )}

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

      </section>

      {/* ---------- Chân trang: tên app + phiên bản ---------- */}
      <footer className="mt-14 border-t border-border/60 pt-5 text-center">
        <p className="text-xs text-muted-foreground">
          Dharma · Giới - Định - Tuệ — {t("version")} {APP_VERSION}
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

      {/* ---------- Thông tin video: CHỈ tiêu đề + thời lượng ---------- */}
      <span className="min-w-0 flex-1 py-0.5">
        <span className="line-clamp-2 block text-sm font-medium leading-snug group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span className="tabular-nums">{formatCount(viewCount ?? 0)} lượt xem</span>
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Đồng bộ TỰ ĐỘNG — chạy ngầm mỗi 30 phút khi mở trang chủ,           */
/* không có nút bấm (theo yêu cầu: ẩn đi, mặc định tự động)            */
/* ------------------------------------------------------------------ */

function AutoSync() {
  const sync = useAction(api.youtubeSync.syncLatest);

  useEffect(() => {
    let cancelled = false;
    const LAST_KEY = "dhamma-last-autosync";
    const run = () => {
      const last = Number(localStorage.getItem(LAST_KEY) ?? 0);
      if (Date.now() - last < 30 * 60 * 1000) return; // tối đa 1 lần/30 phút
      sync({ pages: 2 })
        .then((res) => {
          localStorage.setItem(LAST_KEY, String(Date.now()));
          if (!cancelled && res.inserted > 0) {
            // Có pháp thoại mới — nhẹ nhàng thông báo một lần
          }
        })
        .catch(() => {
          /* im lặng — sync lại lần sau */
        });
    };
    run();
    const iv = window.setInterval(run, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [sync]);

  return null;
}
