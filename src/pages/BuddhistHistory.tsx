import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import {
  fetchHistoryImage,
  HISTORY,
  HISTORY_PERIODS,
  wikiUrl,
  type HistoryEntry,
} from "@/data/history";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ExternalLink,
  History as HistoryIcon,
  Landmark,
  Loader2,
  Quote,
  Scroll,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* LỊCH SỬ PHẬT GIÁO — dòng thời gian Theravāda với hình ảnh trực      */
/* tiếp từ Wikipedia; đọc toàn văn ngay trong ứng dụng, lưu tiến trình.*/
/* ------------------------------------------------------------------ */

export default function BuddhistHistory() {
  const [query, setQuery] = useState(() => loadUiState<string>("hist-query", ""));
  const [period, setPeriod] = useState<string>(() => loadUiState<string>("hist-period", ""));
  const [visible, setVisible] = useState(6);
  const [images, setImages] = useState<Record<string, string>>(() =>
    loadUiState<Record<string, string>>("hist-images", {}),
  );
  // Reader: bài đang đọc + trạng thái nạp
  const [reading, setReading] = useState<{ entry: HistoryEntry; img?: string; imgLoading: boolean } | null>(null);

  useEffect(() => saveUiState("hist-query", query), [query]);
  useEffect(() => saveUiState("hist-period", period), [period]);
  useEffect(() => {
    const stop = trackScroll("buddhist-history");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("buddhist-history");
  }, []);

  /* Nạp ảnh Wikipedia cho toàn bộ mục (song song, câm lặng) */
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const entry of HISTORY) {
        if (!alive) return;
        if (images[entry.id]) continue;
        const img = await fetchHistoryImage(entry);
        if (img && alive) {
          setImages((prev) => {
            const next = { ...prev, [entry.id]: img };
            saveUiState("hist-images", next);
            return next;
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
    // chỉ chạy một lần
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HISTORY.filter((e) => {
      const matchPeriod = !period || e.period === period;
      const matchQuery =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.body.some((p) => p.toLowerCase().includes(q)) ||
        e.period.toLowerCase().includes(q) ||
        e.era.toLowerCase().includes(q);
      return matchPeriod && matchQuery;
    });
  }, [query, period]);

  const shown = filtered.slice(0, visible);

  const openEntry = useCallback(
    async (entry: HistoryEntry) => {
      setReading({ entry, img: images[entry.id], imgLoading: !images[entry.id] });
      window.scrollTo({ top: 0 });
      try {
        const img = images[entry.id] ?? (await fetchHistoryImage(entry));
        setReading((r) => (r && r.entry.id === entry.id ? { ...r, img, imgLoading: false } : r));
      } catch {
        setReading((r) => (r && r.entry.id === entry.id ? { ...r, imgLoading: false } : r));
      }
    },
    [images],
  );

  /* ------------------------- READER toàn màn hình ------------------------- */
  if (reading) {
    const { entry, img, imgLoading } = reading;
    const readLinks = [wikiUrl(entry, "vi"), wikiUrl(entry, "en")].filter(Boolean) as string[];
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-background">
        {/* Thanh đầu reader */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/60 bg-background px-3">
          <button
            type="button"
            onClick={() => setReading(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-accent"
            aria-label="Đóng bài lịch sử"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {entry.period}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{entry.era}</p>
          </div>
          {readLinks.length > 0 && (
            <a
              href={readLinks[0]}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Wikipedia
            </a>
          )}
        </div>

        <article className="mx-auto max-w-3xl px-4 pb-20 pt-6">
          {/* Ảnh minh họa từ Wikipedia */}
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-border/60 bg-muted">
            {img ? (
              <img
                src={img}
                alt={entry.title}
                className="max-h-[26rem] w-full object-cover"
                onError={(ev) => {
                  (ev.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : imgLoading ? (
              <div className="flex aspect-video w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center">
                <Landmark className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}
            {img && (
              <p className="border-t border-border/60 bg-background/80 px-3 py-1.5 text-[10px] text-muted-foreground">
                Hình minh họa: Wikipedia
              </p>
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {entry.period} · {entry.era}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {entry.title}
          </h1>

          {entry.highlight && (
            <blockquote className="mt-5 flex gap-3 rounded-2xl border-l-4 border-primary/70 bg-primary/5 px-4 py-3.5">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[15px] italic leading-relaxed text-foreground/85">
                {entry.highlight}
              </p>
            </blockquote>
          )}

          <div className="mt-6 space-y-4">
            {entry.body.map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.9] text-foreground/90">
                {p}
              </p>
            ))}
          </div>

          {/* Đọc thêm */}
          {readLinks.length > 0 && (
            <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Đọc thêm trên Wikipedia
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {readLinks.map((u, i) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 text-xs font-medium transition hover:bg-accent"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {u.includes("/vi.") ? "Bản tiếng Việt" : "Bản tiếng Anh"}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Chuyển bài kế tiếp trong cùng thời đại */}
          {(() => {
            const idx = HISTORY.findIndex((e) => e.id === entry.id);
            const next = HISTORY[idx + 1];
            if (!next) return null;
            return (
              <button
                type="button"
                onClick={() => void openEntry(next)}
                className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="min-w-0">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Bài kế tiếp
                  </span>
                  <span className="block truncate text-sm font-semibold">{next.title}</span>
                </span>
                <span aria-hidden className="shrink-0 text-primary">→</span>
              </button>
            );
          })()}
        </article>
      </div>
    );
  }

  /* ------------------------------ DANH SÁCH ------------------------------ */
  return (
    <AppShell
      title="LỊCH SỬ PHẬT GIÁO"
      subtitle="Dòng thời gian Phật giáo Theravāda — từ Đức Phật Gotama đến Theravāda hiện đại"
    >
      <SearchToolbar value={query} onChange={setQuery} ariaLabel="Tìm lịch sử Phật giáo" />

      {/* Chips thời đại */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPeriod("")}
          aria-pressed={period === ""}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
            period === ""
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
          )}
        >
          Tất cả thời đại
        </button>
        {HISTORY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(period === p ? "" : p)}
            aria-pressed={period === p}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              period === p
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Dòng thời gian */}
      {shown.length > 0 ? (
        <div className="relative mt-6">
          {/* Đường dọc */}
          <div
            aria-hidden
            className="absolute bottom-2 left-[1.35rem] top-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
          />
          <ol className="space-y-4">
            {shown.map((entry) => (
              <li key={entry.id} className="relative pl-12">
                {/* Mốc thời gian */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-3 flex h-11 w-11 items-center justify-center rounded-full border bg-background",
                    period === entry.period
                      ? "border-primary text-primary"
                      : "border-border/70 text-muted-foreground",
                  )}
                >
                  <Scroll className="h-4.5 w-4.5" />
                </span>

                <button
                  type="button"
                  onClick={() => void openEntry(entry)}
                  className="group block w-full overflow-hidden rounded-2xl border border-border/60 bg-card/70 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex gap-3 p-3.5">
                    {/* Ảnh nhỏ (nếu đã nạp) */}
                    <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                      {images[entry.id] ? (
                        <img
                          src={images[entry.id]}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <HistoryIcon className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                          {entry.period}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{entry.era}</span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary sm:text-[15px]">
                        {entry.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {entry.summary}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Không có mục lịch sử nào khớp tìm kiếm của bạn.
          </p>
        </div>
      )}

      {/* Xem thêm */}
      {filtered.length > visible && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 6)}
            className="rounded-full border border-border/60 px-6 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Xem thêm thời đại sau
          </button>
        </div>
      )}

      <p className="mt-8 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        Lịch sử Phật giáo theo truyền thống Theravāda — hình ảnh minh họa nạp trực tiếp từ Wikipedia.
      </p>
    </AppShell>
  );
}
