import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import {
  fetchBuddhistNews,
  loadNewsCache,
  saveNewsCache,
  type NewsItem,
} from "@/data/news";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  Filter,
  Loader2,
  Newspaper,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* TIN TỨC PHẬT GIÁO — tin mới nhất từ báo/chuyên trang Phật giáo      */
/* Ảnh + văn bản hiển thị trực tiếp; đọc bài trong ứng dụng.           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;

function fmtDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tải bài báo dạng văn bản đầy đủ từ link gốc (đọc trong app). */
async function fetchArticleText(link: string): Promise<string> {
  const { fetchTextViaProxies } = await import("@/lib/proxyFetch");
  const html = await fetchTextViaProxies(link);
  // Trích các khối <p> và loại bỏ tag/script/style — đủ đọc văn bản chính
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const paras = Array.from(cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) =>
      m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((p) => p.length > 60)
    .slice(0, 40);
  return paras.join("\n\n");
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>(() => loadNewsCache());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>(() => loadUiState<string>("news-filter", ""));
  const [visible, setVisible] = useState(PAGE_SIZE);
  // Đọc bài trong app: {item, text, loading, error}
  const [reader, setReader] = useState<{
    item: NewsItem;
    text: string;
    loading: boolean;
    error: boolean;
  } | null>(null);

  useEffect(() => saveUiState("news-filter", filter), [filter]);
  useEffect(() => {
    const stop = trackScroll("news");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("news");
  }, []);

  const load = useCallback(async (force: boolean) => {
    if (!force) {
      const cached = loadNewsCache();
      if (cached.length > 0) {
        setItems(cached);
        return;
      }
    }
    setLoading(true);
    setError(false);
    try {
      const fresh = await fetchBuddhistNews();
      setItems(fresh);
      saveNewsCache(fresh);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) set.add(it.source);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return items.filter((it) => {
      const matchSource = !f || it.source === f;
      return matchSource;
    });
  }, [items, filter]);

  const shown = filtered.slice(0, visible);

  const openArticle = useCallback(async (item: NewsItem) => {
    setReader({ item, text: "", loading: true, error: false });
    try {
      const text = await fetchArticleText(item.link);
      if (!text) throw new Error("empty");
      setReader({ item, text, loading: false, error: false });
    } catch {
      setReader({ item, text: "", loading: false, error: true });
    }
  }, []);

  return (
    <AppShell
      title="TIN TỨC PHẬT GIÁO"
      subtitle="Tin mới nhất về Phật giáo — báo Phật giáo, Giáo hội, chuyên trang Phật học"
      actions={
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Làm mới
        </button>
      }
    >
      {/* Bộ lọc nguồn + đếm số tin */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Nguồn:
        </span>
        <button
          type="button"
          onClick={() => setFilter("")}
          aria-pressed={filter === ""}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            filter === ""
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
          )}
        >
          Tất cả
        </button>
        {sources.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? "" : s)}
            aria-pressed={filter === s}
            className={cn(
              "max-w-[16rem] truncate rounded-full border px-3 py-1 text-xs font-medium transition",
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
            )}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {filtered.length} tin
        </span>
      </div>

      {/* Đang nạp */}
      {loading && items.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang tổng hợp tin tức Phật giáo từ các báo…
        </div>
      )}

      {/* Lỗi nạp */}
      {!loading && error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa nạp được tin tức lần này — kiểm tra kết nối rồi thử lại.
          </p>
          <button
            type="button"
            onClick={() => void load(true)}
            className="mt-4 rounded-full border border-border/60 px-5 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Lưới tin */}
      {shown.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((it) => (
            <article
              key={it.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              {/* Ảnh minh họa */}
              {it.image ? (
                <button
                  type="button"
                  onClick={() => void openArticle(it)}
                  className="block aspect-video w-full overflow-hidden bg-muted"
                >
                  <img
                    src={it.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                </button>
              ) : null}
              <div className="flex flex-1 flex-col p-4">
                <button
                  type="button"
                  onClick={() => void openArticle(it)}
                  className="text-left"
                >
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary sm:text-[15px]">
                    {it.title}
                  </h3>
                  {it.summary && (
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {it.summary}
                    </p>
                  )}
                </button>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{it.source}</span>
                  <span className="shrink-0 tabular-nums">{fmtDate(it.publishedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Có tin nhưng bị lọc hết */}
      {!loading && !error && items.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Không có tin nào thuộc nguồn đang chọn.
        </div>
      )}

      {/* Xem thêm */}
      {filtered.length > visible && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-border/60 px-6 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Xem thêm tin cũ hơn
          </button>
        </div>
      )}

      {/* Ghi chú nguồn */}
      {items.length > 0 && (
        <p className="mt-8 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          Tin tức tổng hợp trực tiếp từ các nguồn báo chí Phật giáo công khai, cập nhật liên tục.
        </p>
      )}

      {/* ----------------- Đọc bài trong ứng dụng ----------------- */}
      {reader && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/60 bg-background px-3">
            <button
              type="button"
              onClick={() => setReader(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-accent"
              aria-label="Đóng bài báo"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold">{reader.item.source}</p>
            <a
              href={reader.item.link}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Bản gốc
            </a>
          </div>

          <article className="mx-auto max-w-3xl px-4 pb-16 pt-6">
            {reader.item.image && (
              <img
                src={reader.item.image}
                alt=""
                className="mb-5 max-h-96 w-full rounded-2xl object-cover"
              />
            )}
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {reader.item.title}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {reader.item.source} · {fmtDate(reader.item.publishedAt)}
            </p>

            <div className="prose-dhamma mt-6">
              {reader.loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải bài viết…
                </div>
              )}
              {reader.error && (
                <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Không tải được toàn văn từ trang gốc — hãy mở bản gốc để đọc đầy đủ.
                  </p>
                  <a
                    href={reader.item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-sm font-medium transition hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" /> Mở bản gốc
                  </a>
                </div>
              )}
              {!reader.loading &&
                !reader.error &&
                reader.text.split("\n\n").map((p, i) => (
                  <p key={i} className="mb-4 text-[15px] leading-[1.9] text-foreground/90">
                    {p}
                  </p>
                ))}
            </div>
          </article>
        </div>
      )}
    </AppShell>
  );
}
