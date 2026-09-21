import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DockPlayer, formatCount, formatTime, usePlayer } from "@/lib/player";
import { useSettings } from "@/lib/settings";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { loadLocalWatch } from "@/lib/localProgress";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useAction, useQuery } from "convex/react";
import {
  Eye,
  Search as SearchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Talk = Doc<"dhammaTalks">;

export default function Dashboard() {
  const { play, current } = usePlayer();
  const { t } = useSettings();

  // Từ khóa tìm kiếm giữ nguyên khi rời trang rồi quay lại (sessionStorage)
  const [search, setSearch] = useState(() => loadUiState<string>("dashboard-search", ""));
  useEffect(() => {
    saveUiState("dashboard-search", search);
  }, [search]);

  // Lịch sử xem CỤC BỘ: dùng cho tiến trình tiếp diễn + nhãn "Đã xem"
  const [localWatch, setLocalWatch] = useState(() => loadLocalWatch());
  useEffect(() => {
    // đọc lại khi mở trang và khi video đóng để cập nhật tiến trình mới nhất
    const refresh = () => setLocalWatch(loadLocalWatch());
    refresh();
    const iv = window.setInterval(refresh, 4000);
    return () => window.clearInterval(iv);
  }, [current]);

  // Tải TOÀN BỘ kho pháp thoại một lần. Đồng bộ ngầm tự kéo video mới.
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
    if (!searchQ) return [];
    return (talks ?? []).filter(
      (t) =>
        t.title.toLowerCase().includes(searchQ) ||
        t.teacher.toLowerCase().includes(searchQ),
    );
  }, [talks, searchQ]);

  // Đang phát video nào đó → trang chủ chỉ hiện video + video liên quan
  const hasActiveVideo = Boolean(current);
  // Chỉ hiện nội dung khi người dùng tra tìm
  const showResults = searchQ.length > 0;

  return (
    <AppShell title={t("talksTitle")} hideTitle>
      {/* Đồng bộ tự động ngầm — ẩn khỏi giao diện */}
      <AutoSync />

      {/* ---------- Trang chủ kiểu YouTube: chỉ còn THANH TÌM KIẾM ---------- */}
      <div className="mb-6">
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      {/* ---------- Trình phát video: nằm NGAY DƯỚI thanh tìm kiếm ---------- */}
      <DockPlayer className="mb-6" />

      {/* ---------- Liên quan: khi đang phát → CHỈ hiện video liên quan ---------- */}
      {related.length > 0 && !searchQ && (
        <section className="mb-6" aria-label="Pháp thoại liên quan">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Pháp thoại liên quan
          </h2>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {related.map((talk) => (
              <TalkRow
                key={talk._id}
                title={talk.title}
                youtubeId={talk.youtubeId}
                durationSec={talk.durationSec}
                viewCount={talk.viewCount}
                active={current?.youtubeId === talk.youtubeId}
                onClick={() => play(talk)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Kết quả tìm kiếm: chỉ hiện KHI NGƯỜI DÙNG TRA ---------- */}
      {showResults && !hasActiveVideo && (
        <section aria-label="Kết quả tìm kiếm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <SearchIcon className="h-4 w-4 text-destructive" />
              {t("results")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${filtered.length} ${t("articles")}`}
            </span>
          </div>

          {loading ? (
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
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
              <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((talk) => (
                <TalkRow
                  key={talk._id}
                  title={talk.title}
                  youtubeId={talk.youtubeId}
                  durationSec={talk.durationSec}
                  viewCount={talk.viewCount}
                  progressSec={localProgressByTalk(localWatch, talk)}
                  completed={localCompletedByTalk(localWatch, talk)}
                  active={current?.youtubeId === talk.youtubeId}
                  onClick={() => play(talk)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

/* ---------------------- helpers tiến trình cục bộ ---------------------- */

function localProgressByTalk(rows: ReturnType<typeof loadLocalWatch>, t: Talk) {
  const row = rows.find((p) => p.youtubeId === t.youtubeId);
  return row && !row.completed && row.positionSec > 5 ? row.positionSec : undefined;
}

function localCompletedByTalk(rows: ReturnType<typeof loadLocalWatch>, t: Talk) {
  return rows.find((p) => p.youtubeId === t.youtubeId)?.completed ?? false;
}

/* ------------------------------------------------------------------ */
/* Hàng kết quả NGANG kiểu YouTube: thumbnail TRÁI — thông tin PHẢI    */
/* (tiêu đề video + lượt xem)                                          */
/* ------------------------------------------------------------------ */

export function TalkRow({
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
            <span
              className="block h-full bg-destructive"
              style={{ width: `${pct}%` }}
            />
          </span>
        )}
      </span>

      {/* Thông tin phải: tiêu đề + lượt xem */}
      <span className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground group-hover:text-destructive sm:text-base">
          {title}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {formatCount(viewCount ?? 0)} {"lượt xem"}
          </span>
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Đồng bộ TỰ ĐỘNG — chạy ngầm mỗi 30 phút khi mở trang chủ            */
/* ------------------------------------------------------------------ */

function AutoSync() {
  const sync = useAction(api.youtubeSync.syncLatest);

  useEffect(() => {
    const LAST_KEY = "dhamma-last-autosync";
    const run = () => {
      const last = Number(localStorage.getItem(LAST_KEY) ?? 0);
      if (Date.now() - last < 30 * 60 * 1000) return; // tối đa 1 lần/30 phút
      sync({ pages: 2 })
        .then(() => {
          localStorage.setItem(LAST_KEY, String(Date.now()));
        })
        .catch(() => {
          /* im lặng — sync lại lần sau */
        });
    };
    run();
    const iv = window.setInterval(run, 30 * 60 * 1000);
    return () => {
      window.clearInterval(iv);
    };
  }, [sync]);

  return null;
}
