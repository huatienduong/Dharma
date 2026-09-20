import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatTime, usePlayer } from "@/lib/player";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings";
import { useQuery } from "convex/react";
import { History, LogIn, Play } from "lucide-react";
import { Link } from "react-router";
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
        "group flex w-full items-stretch gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-border/60 hover:bg-accent/40",
        active && "border-primary/50 bg-primary/5",
      )}
    >
      <span className="relative block w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
        <span className="block aspect-video w-full">
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </span>
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(durationSec)}
        </span>
        {/* Lượt xem (đồng bộ với trang chủ) */}
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
      <span className="min-w-0 flex-1 py-0.5">
        <span className="line-clamp-2 block text-sm font-medium leading-snug group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Play className="h-3 w-3" />
            <span className="tabular-nums">{formatTime(progressSec ?? 0)}</span>
            <span className="text-muted-foreground/60">/ {formatTime(durationSec)}</span>
          </span>
          {typeof viewCount === "number" && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
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

  return (
    <AppShell
      title={t("watched")}
      subtitle={t("watchedSubtitle")}
    >
      {progress === undefined ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.25rem] w-full rounded-xl" />
          ))}
        </div>
      ) : progress.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium">Chưa có lịch sử xem</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Đăng nhập để ứng dụng tự ghi nhớ vị trí bạn dừng lại trong mỗi pháp
            thoại. Khi hệ thống hoàn tất nâng cấp, lịch sử của bạn sẽ được đồng
            bộ tại đây.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-1 md:grid-cols-2">
          {progress.map((p) => (
            <TalkRow
              key={p.youtubeId}
              title={p.title}
              teacher={p.teacher}
              youtubeId={p.youtubeId}
              durationSec={p.durationSec}
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
