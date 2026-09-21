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
import { Eye, Loader2, Mic, Search as SearchIcon, X } from "lucide-react";
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
        (tk) =>
          tk.youtubeId !== current.youtubeId &&
          (tk.teacher === current.teacher || tk.channelName === current.channelName),
      )
      .slice(0, 8);
  }, [talks, current]);

  // Lọc tìm kiếm (tiêu đề + giảng sư)
  const searchQ = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!searchQ) return [];
    return (talks ?? []).filter(
      (tk) =>
        tk.title.toLowerCase().includes(searchQ) ||
        tk.teacher.toLowerCase().includes(searchQ),
    );
  }, [talks, searchQ]);

  const hasActiveVideo = Boolean(current);
  const isIdle = !hasActiveVideo && searchQ.length === 0;

  return (
    <AppShell title={t("talksTitle")} hideTitle>
      {/* Đồng bộ tự động ngầm — ẩn khỏi giao diện */}
      <AutoSync />

      {/* ================= CHẾ ĐỘ MẶC ĐỊNH — màn tìm kiếm kiểu YouTube ============ */}
      {isIdle && (
        <div className="flex flex-col items-center px-2 pb-16 pt-10 sm:pt-16">
          {/* Bánh xe Chuyển Pháp Luân 8 cánh đang quay */}
          <DharmaWheel className="h-24 w-24 sm:h-28 sm:w-28" />

          {/* Hàng tìm kiếm: nút tròn trái · pill · mic tròn phải */}
          <div className="mt-8 w-full max-w-xl">
            <SearchRow value={search} onChange={setSearch} />
          </div>

          {/* Thẻ trống kiểu YouTube: "Thử tìm kiếm để bắt đầu" */}
          <div className="mt-12 w-full max-w-2xl rounded-3xl border border-border/60 bg-card px-6 py-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Thử tìm kiếm để bắt đầu
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Hãy bắt đầu tìm kiếm pháp thoại — chúng tôi sẽ gợi ý những bài giảng
              phù hợp với bạn.
            </p>
          </div>
        </div>
      )}

      {/* ============ ĐANG TÌM / ĐANG PHÁT — thanh tìm kiếm trên cùng ============ */}
      {!isIdle && (
        <>
          {/* Khi có video: thanh tìm kiếm + trình phát DÍNH CỐ ĐỊNH khi cuộn */}
          <div
            className={cn(
              "-mx-3 bg-background px-3 pb-3 sm:-mx-5 sm:px-5",
              hasActiveVideo && "sticky top-14 z-30 pt-1 shadow-sm",
            )}
          >
            <SearchRow value={search} onChange={setSearch} />
            <DockPlayer className="mt-4" />
          </div>

          {/* Liên quan: khi đang phát → CHỈ hiện video liên quan */}
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

          {/* Kết quả tìm kiếm */}
          {searchQ.length > 0 && !hasActiveVideo && (
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
        </>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Bánh xe Chuyển Pháp Luân 8 cánh QUAY — biểu tượng Pháp thoại         */
/* ------------------------------------------------------------------ */

export function DharmaWheel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 48"
        className="dharma-wheel h-[72%] w-[72%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      >
        {/* Vành xe */}
        <circle cx="24" cy="24" r="19" />
        <circle cx="24" cy="24" r="15" strokeWidth="1.4" />
        {/* 8 nan hoa — 8 nhánh Bát Chánh Đạo */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x1 = 24 + 4 * Math.cos(a);
          const y1 = 24 + 4 * Math.sin(a);
          const x2 = 24 + 15 * Math.cos(a);
          const y2 = 24 + 15 * Math.sin(a);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth="2.2"
            />
          );
        })}
        {/* Lõi xe */}
        <circle cx="24" cy="24" r="3.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Hàng tìm kiếm kiểu YouTube: nút tròn trái · pill · mic tròn phải     */
/* ------------------------------------------------------------------ */

function SearchRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const hasText = value.trim().length > 0;

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stop]);

  return (
    <div className="flex items-center gap-2.5" role="search">
      {/* Nút tròn trái — bánh xe Chuyển Pháp Luân nhỏ */}
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent">
        <DharmaWheel className="h-8 w-8" />
      </span>

      {/* Pill nhập */}
      <div
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-4 transition",
          (listening || hasText) && "ring-2 ring-destructive/25",
        )}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onChange("");
          }}
          placeholder="Tìm trên Dharma"
          aria-label="Tìm pháp thoại"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
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
        <SearchIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      </div>

      {/* Nút tròn phải — mic */}
      {micSupported ? (
        <button
          type="button"
          onClick={() => (listening ? stop() : start((text) => onChange(text)))}
          aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"}
          title={listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
            listening
              ? "bg-destructive/15 text-destructive"
              : "bg-accent text-foreground hover:bg-border",
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground/50">
          <Loader2 className="h-5 w-5" />
        </span>
      )}
    </div>
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
