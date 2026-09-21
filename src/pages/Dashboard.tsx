import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { APP_VERSION } from "@/lib/version";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useAction, useQuery } from "convex/react";
import {
  Eye,
  Search as SearchIcon,
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

  // Từ khóa tìm kiếm giữ nguyên khi rời trang rồi quay lại (sessionStorage)
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  useEffect(() => {
    saveUiState("dashboard-search", search);
  }, [search]);

  // Tiến trình người dùng đã đăng nhập (server)
  const progress = useQuery(api.dhamma.myProgress, {});

  // Tải TOÀN BỘ kho pháp thoại một lần (không phân trang — khắc phục
  // triệt để lỗi nút Tải thêm không nạp video). Nút Đồng bộ trên header
  // sẽ kéo thêm video mới từ các kênh YouTube vào kho chung.
  const talks = useQuery(api.dhamma.list, { limit: 2000 });

  const loading = talks === undefined;

  // Khôi phục vị trí cuộn khi quay lại trang (sau khi dữ liệu đã sẵn sàng)
  useEffect(() => {
    const stop = trackScroll("dashboard");
    return () => {
      stop();
    };
  }, []);
  useEffect(() => {
    if (!loading) restoreScroll("dashboard");
  }, [loading]);

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

  // Hero đã bỏ — feed đồng nhất kiểu YouTube, bài mới nhất nằm đầu lưới
  const rest = filtered;
  // Đang phát video nào đó → trang chủ chỉ hiện video + video liên quan
  const hasActiveVideo = Boolean(current);



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

      {/* ---------- Trình phát video: nằm NGAY DƯỚI thanh tìm kiếm.
          Logo & tìm kiếm luôn ở trên — không bao giờ bị đẩy xuống.
          (Ẩn khi không phát — không chiếm khoảng trắng) ---------- */}
      <DockPlayer className="mb-6" />

      {/* ---------- Liên quan: khi đang phát → CHỈ hiện video liên quan ---------- */}
      {related.length > 0 && !searchQ && (
        <section className="mb-6" aria-label="Pháp thoại liên quan">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Pháp thoại liên quan</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((t) => (
              <TalkRow
                key={t._id}
                title={t.title}
                youtubeId={t.youtubeId}
                durationSec={t.durationSec}
                viewCount={t.viewCount}
                showDuration
                active={current?.youtubeId === t.youtubeId}
                onClick={() => play(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Danh sách chính: ẨN khi đang phát video (chỉ còn liên quan) ---------- */}
      {!hasActiveVideo && (
        <section aria-label="Pháp thoại đề xuất">
        {searchQ && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <SearchIcon className="h-4 w-4 text-gold" /> Kết quả tìm kiếm
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${filtered.length} bài`}
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="mt-2.5 h-4 w-4/5" />
                <Skeleton className="mt-1.5 h-3 w-2/5" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
            <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Không tìm thấy pháp thoại nào phù hợp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((t) => (
              <TalkRow
                key={t._id}
                title={t.title}
                teacher={t.teacher}
                youtubeId={t.youtubeId}
                durationSec={t.durationSec}
                viewCount={t.viewCount}
                showDuration
                progressSec={progressByTalk(progress, t)}
                completed={completedByTalk(progress, t)}
                active={current?.youtubeId === t.youtubeId}
                onClick={() => play(t)}
              />
            ))}
          </div>
        )}
        </section>
      )}

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
/* Thẻ pháp thoại kiểu YouTube: thumbnail TRÊN — tiêu đề/lượt xem DƯỚI  */
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
  showDuration = true,
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
  /** hiển thị thời lượng ở góc thumbnail (mặc định bật) */
  showDuration?: boolean;
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
      {/* Thumbnail trên */}
      <span className="relative block w-full overflow-hidden rounded-xl bg-muted">
        <span className="block aspect-video w-full">
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </span>
        {showDuration && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {formatTime(durationSec)}
          </span>
        )}
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

      {/* Thông tin dưới — kiểu YouTube: tiêu đề 2 dòng + lượt xem */}
      <span className="mt-2.5 min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
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
