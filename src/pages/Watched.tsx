import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatTime, usePlayer } from "@/lib/player";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  loadLocalWatch,
  type LocalWatchRow,
} from "@/lib/localProgress";
import { useQuery } from "convex/react";
import { History, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  teacher,
  youtubeId,
  durationSec,
  progressSec,
  completed,
  active,
  onClick,
}: {
  title: string;
  teacher?: string;
  youtubeId: string;
  durationSec: number;
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

export default function Watched() {
  const { play, current } = usePlayer();
  const progress = useQuery(api.dhamma.myProgress, {});

  // Tiến trình cục bộ — khách chưa đăng nhập vẫn thấy lịch sử của mình
  const [localProgress, setLocalProgress] = useState<LocalWatchRow[]>([]);
  useEffect(() => {
    setLocalProgress(loadLocalWatch());
  }, [current?.youtubeId]);

  // Gộp server + local (mục mới hơn thắng), sắp theo updatedAt
  const watched = useMemo(() => {
    const byId = new Map<string, ProgressRow | LocalWatchRow>();
    const times = new Map<string, number>();
    for (const row of localProgress) {
      byId.set(row.youtubeId, row);
      times.set(row.youtubeId, row.updatedAt);
    }
    for (const row of progress ?? []) {
      const prev = times.get(row.youtubeId) ?? 0;
      if (row.updatedAt >= prev) byId.set(row.youtubeId, row);
    }
    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [progress, localProgress]);


  return (
    <AppShell
      title="Đã xem"
      subtitle="Lịch sử xem của bạn — dừng ở đâu, quay lại đúng đoạn đó"
    >
      {progress === undefined ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.25rem] w-full rounded-xl" />
          ))}
        </div>
      ) : watched.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 text-sm font-medium">Chưa có lịch sử xem</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Hãy mở một pháp thoại — ứng dụng sẽ tự ghi nhớ vị trí bạn dừng lại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-1 md:grid-cols-2">
          {watched.map((p) => (
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
                  _id: ("talkId" in p ? p.talkId : p.youtubeId) as Id<"dhammaTalks">,
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
