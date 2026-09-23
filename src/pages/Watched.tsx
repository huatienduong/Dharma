import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import {
  clearLocalWatch,
  loadLocalWatch,
  type LocalWatchRow,
} from "@/lib/localProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings";
import { Eye, History, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Hàng video NGANG kiểu kết quả tìm kiếm YouTube:                     */
/* thumbnail TRÁI — tiêu đề + lượt xem PHẢI                            */
/* ------------------------------------------------------------------ */

function TalkRowHorizontal({
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
        "group flex w-full items-start gap-3 rounded-xl p-1.5 text-left transition hover:bg-accent/60 sm:gap-4",
        active && "bg-accent ring-1 ring-destructive/40",
      )}
    >
      {/* Thumbnail trái */}
      <span className="relative block w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-60">
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
          <span className="absolute left-1.5 top-1.5 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
            Đã xem
          </span>
        )}
        {active && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            Đang phát
          </span>
        )}
        {pct !== undefined && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <span className="block h-full bg-destructive" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>

      {/* Thông tin phải: tiêu đề + lượt xem */}
      <span className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">
          {title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {formatCount(viewCount ?? 0)} lượt xem
            </span>
          </span>
          {progressSec !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Play className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {formatTime(progressSec)} / {formatTime(durationSec)}
              </span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function Watched() {
  const navigate = useNavigate();
  const { play, current } = usePlayer();
  const { t } = useSettings();
  const [rows, setRows] = useState<LocalWatchRow[]>(() => loadLocalWatch());

  // Kho pháp thoại để ghép lượt xem đồng bộ với trang chủ
  const talks = useQuery(api.dhamma.list, { limit: 2000 });
  const viewCountBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of talks ?? []) m.set(t.youtubeId, t.viewCount ?? 0);
    return m;
  }, [talks]);

  // Đọc lại lịch sử khi quay lại trang (đã lưu thêm ở phiên trước)
  useEffect(() => {
    setRows(loadLocalWatch());
  }, []);

  useEffect(() => {
    const onFocus = () => setRows(loadLocalWatch());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleClearAll = () => {
    // Chỉ xóa LỊCH SỬ XEM — giữ nguyên tiến trình đọc + phiên thiền
    clearLocalWatch();
    setRows([]);
    toast.success("Đã xóa lịch sử xem trên thiết bị này.");
  };

  // Danh sách hiển thị — đọc trực tiếp từ state cục bộ
  const list = rows;

  return (
    <AppShell title={t("watched")} subtitle={t("watchedSubtitle")}>
      {/* Video đang phát: dock ngay dưới tiêu đề */}
      <DockPlayer className="mb-6" />

      {list.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa toàn bộ lịch sử
          </button>
        </div>
      )}

      {list.length === 0 ? (
        /* Thông báo giữa trang — bố cục đối xứng, có lời dẫn vào mục VIDEO */
        <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full border border-border/60 bg-card/60 shadow-sm">
            <History className="h-10 w-10 text-primary/50" />
          </span>
          <h2 className="mt-6 text-lg font-semibold tracking-tight">Chưa có lịch sử xem</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Những video bạn xem sẽ được lưu lại đây — dừng ở đâu, quay lại đúng đoạn đó.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Play className="h-4 w-4" />
            Xem video Phật pháp
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((p) => (
            <TalkRowHorizontal
              key={`${p.youtubeId}-${p.updatedAt}`}
              title={p.title}
              youtubeId={p.youtubeId}
              durationSec={p.durationSec}
              viewCount={viewCountBy.get(p.youtubeId)}
              progressSec={p.completed ? undefined : p.positionSec}
              completed={p.completed}
              active={current?.youtubeId === p.youtubeId}
              onClick={() =>
                play({
                  _id: p.youtubeId,
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

/* Skeleton giữ tương thích nếu cần tải lại */
export function WatchedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="aspect-video w-60 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
