import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings";
import { useQuery } from "convex/react";
import { Eye, History, Play } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

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

function TalkRow({
  title,
  youtubeId,
  durationSec,
  viewCount,
  progressSec,
  completed,
  active,
  onClick,
}: {
  title: string;
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
        "group flex w-full flex-col text-left transition",
        active && "rounded-xl bg-accent/60 p-1.5 -m-1.5 ring-1 ring-primary/40",
      )}
    >
      <span className="relative block w-full overflow-hidden rounded-xl bg-muted">
        <span className="block aspect-video w-full">
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </span>
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {formatTime(durationSec)}
        </span>
        {completed && (
          <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
            Đã xem
          </span>
        )}
        {active && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-gold">
            Đang phát
          </span>
        )}
        {pct !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <span className="block h-full bg-gold" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <span className="mt-2.5 min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Play className="h-3.5 w-3.5" />
            <span className="tabular-nums">{formatTime(progressSec ?? 0)}</span>
            <span className="text-muted-foreground/60">/ {formatTime(durationSec)}</span>
          </span>
          {typeof viewCount === "number" && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="tabular-nums">{formatCount(viewCount)} lượt xem</span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function Watched() {
  const { play, current } = usePlayer();
  const { t } = useSettings();
  // Lịch sử xem lấy từ tiến trình server (không còn bản lưu cục bộ)
  const progress = useQuery(api.dhamma.myProgress, {});
  // Kho pháp thoại để lấy lượt xem đồng bộ với trang chủ
  const talks = useQuery(api.dhamma.list, { limit: 2000 });
  const viewCountBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of talks ?? []) m.set(t.youtubeId, t.viewCount ?? 0);
    return m;
  }, [talks]);

  return (
    <AppShell
      title={t("watched")}
      subtitle={t("watchedSubtitle")}
    >
      {/* Video đang phát: dock ngay dưới tiêu đề (trang này không có tìm kiếm) */}
      <DockPlayer className="mb-6" />
      {progress === undefined ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="mt-2.5 h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-3 w-2/5" />
            </div>
          ))}
        </div>
      ) : progress.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium">Chưa có lịch sử xem</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Những pháp thoại bạn xem sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {progress.map((p) => (
            <TalkRow
              key={p.youtubeId}
              title={p.title}
              youtubeId={p.youtubeId}
              durationSec={p.durationSec}
              viewCount={viewCountBy.get(p.youtubeId)}
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
        </div>
      )}
    </AppShell>
  );
}
