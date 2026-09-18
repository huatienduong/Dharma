import { DhammaWheel } from "@/components/DhammaWheel";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { formatTime, usePlayer } from "@/lib/player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Compass,
  History,
  LogOut,
  Play,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type Talk = Doc<"dhammaTalks">;

type ProgressRow = {
  talkId: string;
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

const APP_VERSION = "1.0.0";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { play } = usePlayer();

  const talks = useQuery(api.dhamma.list, { limit: 60 });
  const teachers = useQuery(api.dhamma.teachers, {});
  const progress = useQuery(api.dhamma.myProgress, {});

  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);

  // Map tiến trình theo talkId để không cần query riêng cho từng thẻ
  const progressByTalk = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const p of progress ?? []) map.set(String(p.talkId), p);
    return map;
  }, [progress]);

  const filtered = useMemo(() => {
    const rows = talks ?? [];
    return teacherFilter ? rows.filter((t) => t.teacher === teacherFilter) : rows;
  }, [talks, teacherFilter]);

  const newest = filtered[0];
  const rest = filtered.slice(1);

  const continueList = useMemo(
    () => (progress ?? []).filter((p) => !p.completed && p.positionSec > 5).slice(0, 8),
    [progress],
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="lotus-bg min-h-screen">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <DhammaWheel size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                Dhamma Stream
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Pháp thoại Theravāda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <UserRound className="h-3.5 w-3.5" />
              <span className="max-w-40 truncate">
                {user?.name || user?.email || "Phật tử"}
              </span>
            </span>
            <SyncButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label="Đăng xuất"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:pt-8">
        {/* ---------- Hero + Tiếp tục xem ---------- */}
        <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Pháp thoại mới nhất */}
          {newest ? (
            <button
              type="button"
              onClick={() => play(newest)}
              className="group relative overflow-hidden rounded-2xl border border-border/60 text-left shadow-md transition hover:shadow-lg"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted sm:aspect-[21/9]">
                <img
                  src={`https://i.ytimg.com/vi/${newest.youtubeId}/maxresdefault.jpg`}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${newest.youtubeId}/hqdefault.jpg`;
                  }}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <Badge className="mb-2 border border-gold/60 bg-black/40 text-gold">
                    Pháp thoại mới nhất
                  </Badge>
                  <h1 className="line-clamp-2 text-lg font-bold leading-snug text-white sm:text-2xl">
                    {newest.title}
                  </h1>
                  <p className="mt-1 text-xs text-white/80 sm:text-sm">
                    {newest.teacher} · {fmtDate(newest.publishedAt)}
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
            ) : continueList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-4 text-center text-xs leading-relaxed text-muted-foreground">
                Chưa có tiến trình xem.
                <br />
                Hãy mở một pháp thoại — ứng dụng sẽ tự ghi nhớ vị trí bạn
                dừng lại.
              </div>
            ) : (
              <ul className="space-y-2">
                {continueList.map((p) => (
                  <li key={String(p.talkId)}>
                    <button
                      type="button"
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
                      className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-2 text-left transition hover:border-primary/40 hover:bg-accent/60"
                    >
                      <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={`https://i.ytimg.com/vi/${p.youtubeId}/mqdefault.jpg`}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                          <span
                            className="block h-full bg-gold"
                            style={{
                              width: `${
                                p.durationSec > 0
                                  ? Math.min(
                                      100,
                                      (p.positionSec / p.durationSec) * 100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-xs font-medium leading-snug group-hover:text-primary">
                          {p.title}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Còn lại{" "}
                          <span className="tabular-nums">
                            {formatTime(
                              Math.max(0, p.durationSec - p.positionSec),
                            )}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </section>

        {/* ---------- Bộ lọc giảng sư ---------- */}
        <section className="mt-10" aria-label="Lọc theo giảng sư">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTeacherFilter(null)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                teacherFilter === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              Tất cả
            </button>
            {(teachers ?? []).map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() =>
                  setTeacherFilter((prev) => (prev === t.name ? null : t.name))
                }
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                  teacherFilter === t.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t.name}
                <span className="ml-1.5 opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Lưới pháp thoại ---------- */}
        <section className="mt-6" aria-label="Pháp thoại mới">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-gold" />
              Pháp thoại mới
            </h2>
            <span className="text-xs text-muted-foreground">
              {talks === undefined ? "…" : `${filtered.length} bài`}
            </span>
          </div>

          {!talks ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              ))}
            </div>
          ) : rest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
              <Compass className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Không có pháp thoại nào cho lựa chọn này.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((talk) => (
                <TalkCard
                  key={talk._id}
                  talk={talk}
                  progress={progressByTalk.get(String(talk._id))}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------- Chân trang ---------- */}
        <footer className="mt-16 border-t border-border/60 pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground/80">Dhamma Stream</span>{" "}
            · Phiên bản {APP_VERSION} · Nhà phát triển:{" "}
            <span className="font-medium text-foreground/80">Hứa Tiến Dương</span>
          </p>
          <p className="mt-1">
            Nội dung pháp thoại thuộc bản quyền của các kênh YouTube tương ứng ·
            Theravāda — Phật giáo Nguyên thủy
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ pháp thoại                                                      */
/* ------------------------------------------------------------------ */

function TalkCard({
  talk,
  progress,
}: {
  talk: Talk;
  progress?: ProgressRow;
}) {
  const { play, current } = usePlayer();
  const active = current?.youtubeId === talk.youtubeId;
  const mine = progress;

  return (
    <button
      type="button"
      onClick={() => play(talk)}
      className={cn(
        "group overflow-hidden rounded-xl border bg-card/70 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        active
          ? "border-primary/60 ring-1 ring-primary/40"
          : "border-border/60 hover:border-primary/40",
      )}
    >
      <span className="relative block aspect-video w-full overflow-hidden bg-muted">
        <img
          src={`https://i.ytimg.com/vi/${talk.youtubeId}/mqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {mine && !mine.completed && mine.positionSec > 5 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <span
              className="block h-full bg-gold"
              style={{
                width: `${
                  mine.durationSec > 0
                    ? Math.min(100, (mine.positionSec / mine.durationSec) * 100)
                    : 0
                }%`,
              }}
            />
          </span>
        )}
        {mine?.completed && (
          <span className="absolute left-2 top-2">
            <Badge variant="secondary" className="bg-background/85 text-[10px]">
              Đã xem
            </Badge>
          </span>
        )}
        {active && (
          <span className="absolute left-2 top-2">
            <Badge className="bg-primary text-[10px] text-primary-foreground">
              Đang phát
            </Badge>
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 backdrop-blur">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </span>
        </span>
      </span>
      <span className="block p-3">
        <span className="line-clamp-2 block text-sm font-medium leading-snug">
          {talk.title}
        </span>
        <span className="mt-1.5 block truncate text-xs text-muted-foreground">
          {talk.teacher}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
          {fmtDate(talk.publishedAt)}
        </span>
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
          const res = await sync({});
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
      className="hidden gap-2 sm:inline-flex"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      Đồng bộ
    </Button>
  );
}
