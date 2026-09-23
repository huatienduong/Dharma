import {
  enrichNewsImages,
  fetchBuddhistNews,
  loadNewsCache,
  loadStaleNewsCache,
  saveNewsCache,
  type NewsItem,
} from "@/data/news";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* TIN TỨC PHẬT GIÁO — dùng chung cho Trang chủ và mục TIN TỨC          */
/* Nguồn duy nhất: RSS Báo Giác Ngộ (ảnh + văn bản, cập nhật liên tục). */
/* ------------------------------------------------------------------ */

export function fmtNewsDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hook nạp tin: hiện cache ngay rồi tự làm mới nền, không bao giờ trống. */
export function useBuddhistNews() {
  const [items, setItems] = useState<NewsItem[]>(() => loadNewsCache());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fillImages = useCallback((list: NewsItem[]) => {
    void enrichNewsImages(list, (id, url) => {
      if (!mountedRef.current) return;
      setItems((prev) =>
        prev.map((it) => (it.id === id && !it.image ? { ...it, image: url } : it)),
      );
    });
  }, []);

  const load = useCallback(
    async (force: boolean) => {
      if (!force) {
        const cached = loadNewsCache();
        const seed = cached.length > 0 ? cached : loadStaleNewsCache();
        if (seed.length > 0) {
          setItems(seed);
          fillImages(seed);
        }
      }
      setLoading(true);
      setError(false);
      try {
        const fresh = await fetchBuddhistNews();
        if (fresh.length === 0) throw new Error("empty");
        setItems(fresh);
        saveNewsCache(fresh);
        fillImages(fresh);
      } catch {
        const stale = loadStaleNewsCache();
        if (stale.length > 0) {
          setItems(stale);
          fillImages(stale);
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [fillImages],
  );

  // Nạp khi mở trang + tự cập nhật mỗi 10 phút
  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => void load(false), 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  return { items, loading, error, reload: () => void load(true) };
}

/* --------------------------- Ảnh bìa --------------------------- */

export function NewsCover({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-gold/10 to-card"
      >
        <span className="text-5xl text-primary/25">☸</span>
      </span>
      {item.image ? (
        <img
          src={item.image}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]",
            className,
          )}
        />
      ) : null}
    </>
  );
}

/* --------------------------- Thẻ tin --------------------------- */

export function NewsCard({
  item,
  onOpen,
  compact,
}: {
  item: NewsItem;
  onOpen: (item: NewsItem) => void;
  /** Chế độ gọn cho Trang chủ: tiêu đề 2 dòng, không mô tả */
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_14px_rgba(16,24,40,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(16,24,40,0.12)]",
        compact && "min-w-[16rem] flex-1 sm:min-w-[18rem]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={item.title}
        className="relative block aspect-video w-full overflow-hidden bg-muted"
      >
        <NewsCover item={item} />
      </button>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex flex-1 flex-col p-3.5 text-left"
      >
        <h3
          className={cn(
            "text-sm font-semibold leading-snug group-hover:text-primary",
            compact ? "line-clamp-2" : "line-clamp-2 sm:text-[15px]",
          )}
        >
          {item.title}
        </h3>
        {!compact && item.summary && (
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {item.summary}
          </p>
        )}
        <span className="mt-2 text-[11px] tabular-nums text-muted-foreground/80">
          {fmtNewsDate(item.publishedAt)}
        </span>
      </button>
    </article>
  );
}

/* ------------------- Đọc bài trong ứng dụng ------------------- */

/** Tải bài báo dạng văn bản đầy đủ từ link gốc. */
async function fetchArticleText(link: string): Promise<string> {
  const { fetchTextViaProxies } = await import("@/lib/proxyFetch");
  const html = await fetchTextViaProxies(link);
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

export function NewsReader({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchArticleText(item.link)
      .then((t) => {
        if (cancelled) return;
        if (!t) throw new Error("empty");
        setText(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.link]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/60 bg-background px-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-accent"
          aria-label="Đóng bài báo"
        >
          <X className="h-5 w-5" />
        </button>
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Bản gốc
        </a>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="mb-5 max-h-96 w-full rounded-2xl object-cover"
          />
        )}
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {item.title}
        </h1>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {fmtNewsDate(item.publishedAt)}
        </p>

        <div className="prose-dhamma mt-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải bài viết…
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Không tải được toàn văn từ trang gốc — hãy mở bản gốc để đọc đầy đủ.
              </p>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-sm font-medium transition hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" /> Mở bản gốc
              </a>
            </div>
          )}
          {!loading &&
            !error &&
            text.split("\n\n").map((p, i) => (
              <p key={i} className="mb-4 text-[15px] leading-[1.9] text-foreground/90">
                {p}
              </p>
            ))}
        </div>
      </article>
    </div>
  );
}
