import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import {
  BookOpen,
  ExternalLink,
  Globe2,
  Loader2,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { raceFirst } from "@/lib/raceFirst";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadUiState, restoreScroll, saveUiState, trackScroll } from "@/lib/uiState";

/* ------------------------------------------------------------------ */
/* TRA CỨU WIKIPEDIA — tra cứu trực tiếp Wikipedia trong ứng dụng       */
/* Wikipedia REST API miễn phí, CORS mở, không cần khóa:                */
/*   • Gợi ý:   /w/rest.php/v1/search/page?q=...&limit=8               */
/*   • Nội dung: /api/rest_v1/page/summary/{title}                     */
/* Ưu tiên tiếng Việt, TỰ ĐỘNG chuyển sang tiếng Anh khi không có kết  */
/* quả — người dùng không phải chọn ngôn ngữ.                           */
/* ------------------------------------------------------------------ */

type WikiSuggestion = {
  id: number;
  key: string;
  title: string;
  description?: string;
  thumbnail?: { url?: string };
};

type WikiSummary = {
  title: string;
  displaytitle?: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
};

const QUICK_TERMS = [
  "Tứ Diệu Đế",
  "Bát Chánh Đạo",
  "Theravada",
  "Tipiṭaka",
  "Vipassanā",
  "Anapanasati",
  "Dhammapada",
  "Nibbāna",
  "Ngũ uẩn",
  "Luật tạng",
];

/* Thứ tự ưu tiên ngôn ngữ — tiếng Việt trước, tiếng Anh bổ sung. */
const LANGS = ["vi", "en"] as const;

const PROXIES = [
  (url: string) => url, // trực tiếp — Wikipedia REST API có CORS mở
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchViaProxies(url: string): Promise<unknown> {
  const attempts = PROXIES.map(async (wrap) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(wrap(url), { signal: ctrl.signal }).finally(() =>
      clearTimeout(timer),
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  });
  return raceFirst(attempts);
}

/** Tìm gợi ý — thử lần lượt các ngôn ngữ, trả về kết quả đầu tiên có mục. */
async function wikiSearch(
  q: string,
): Promise<{ pages: WikiSuggestion[] }> {
  for (const lang of LANGS) {
    try {
      const url = `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
        q,
      )}&limit=8`;
      const data = (await fetchViaProxies(url)) as { pages?: WikiSuggestion[] };
      if (data.pages && data.pages.length > 0) return { pages: data.pages };
    } catch {
      /* thử ngôn ngữ kế tiếp */
    }
  }
  return { pages: [] };
}

/** Mở bài viết — tự chuyển ngôn ngữ nếu ngôn ngữ trước không có nội dung. */
async function wikiSummary(title: string): Promise<WikiSummary> {
  for (const lang of LANGS) {
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title,
      )}?redirect=true`;
      const data = (await fetchViaProxies(url)) as WikiSummary;
      if (data?.extract) return data;
    } catch {
      /* thử ngôn ngữ kế tiếp */
    }
  }
  throw new Error("Không có nội dung.");
}

export default function Lookup() {
  const [term, setTerm] = useState(() => loadUiState<string>("lookup-term", ""));
  const [suggestions, setSuggestions] = useState<WikiSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => saveUiState("lookup-term", term), [term]);
  useEffect(() => {
    const stopScroll = trackScroll("lookup");
    return () => stopScroll();
  }, []);

  /* Gợi ý trực tiếp khi nhập — hiển thị trước kết quả */
  useEffect(() => {
    const q = term.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q) {
      setSuggestions(null);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const data = await wikiSearch(q);
        setSuggestions(data.pages);
      } catch {
        setSuggestions(null);
      } finally {
        setSuggesting(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term]);

  const openArticle = useCallback(async (title: string) => {
    setArticle(null);
    setLoadingArticle(true);
    setError(false);
    try {
      const data = await wikiSummary(title);
      setArticle(data);
      restoreScroll("lookup", 1);
    } catch {
      setError(true);
    } finally {
      setLoadingArticle(false);
    }
  }, []);

  const quickPicks = useMemo(
    () => (term.trim() ? null : QUICK_TERMS.slice(0, 8)),
    [term],
  );

  return (
    <AppShell
      title="TRA CỨU WIKIPEDIA"
      subtitle="Tra cứu thuật ngữ Phật học — xem trực tiếp trong ứng dụng"
    >
      {/* Thanh tìm kiếm dùng chung — căn GIỮA, micro TRÁI kính lúp PHẢI */}
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-2.5 shadow-sm sm:-mx-5 sm:px-5">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-center">
          <SearchToolbar
            value={term}
            onChange={setTerm}
            sticky={false}
            ariaLabel="Tra cứu Wikipedia"
            className="w-full"
          />
        </div>
      </div>

      {/* Gợi ý nhanh khi chưa nhập gì — bố cục đối xứng tập trung */}
      {quickPicks && !article && (
        <section className="mb-6 mt-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-card/60 shadow-sm">
            <BookOpen className="h-7 w-7 text-primary/60" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Tra thuật ngữ Phật học
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Nhập từ khóa hoặc chọn nhanh thuật ngữ dưới đây — nội dung Wikipedia mở
            ngay trong ứng dụng.
          </p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {quickPicks.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTerm(t);
                  void openArticle(t);
                }}
                className="rounded-full border border-border/70 bg-card/70 px-3.5 py-1.5 text-xs font-medium text-foreground/85 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/60"
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Gợi ý trực tiếp khi nhập (hiện trước kết quả đầy đủ) */}
      {term.trim() && (suggesting || suggestions) && !article && (
        <section className="mb-6" aria-label="Gợi ý tra cứu">
          {suggesting && !suggestions ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tra từ «
              {term.trim()}»…
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void openArticle(s.title)}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  {s.thumbnail?.url ? (
                    <img
                      src={s.thumbnail.url}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg border border-border/60 object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Globe2 className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {s.title}
                    </span>
                    {s.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.description}
                      </span>
                    )}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : (
            !suggesting && (
              <p className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy mục nào khớp «{term.trim()}» trên Wikipedia.
              </p>
            )
          )}
        </section>
      )}

      {/* Nội dung bài đang mở */}
      {loadingArticle && (
        <div className="space-y-3">
          <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted/60" />
        </div>
      )}

      {article && (
        <article className="mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          {article.thumbnail?.source && (
            <img
              src={article.thumbnail.source}
              alt=""
              className="max-h-72 w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="p-5 sm:p-6">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              {article.title}
            </h2>
            {article.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {article.description}
              </p>
            )}
            <div className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.85] text-foreground/90">
              {article.extract}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setArticle(null);
                  setSuggestions(null);
                  setTerm("");
                }}
                className="rounded-full border border-border/70 px-3.5 py-1.5 font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                ← Tra từ khác
              </button>
              {article.content_urls?.desktop?.page && (
                <a
                  href={article.content_urls.desktop.page}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Mở trên Wikipedia
                </a>
              )}
              <span className="ml-auto text-muted-foreground/70">
                Nguồn: Wikipedia
              </span>
            </div>
          </div>
        </article>
      )}

      {/* Lỗi tải bài */}
      {error && !loadingArticle && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Không nạp được nội dung Wikipedia lần này — kiểm tra kết nối rồi thử
            lại.
          </p>
          <button
            type="button"
            onClick={() => {
              const last = term.trim();
              if (last) void openArticle(last);
            }}
            className="mt-4 rounded-full border border-border/60 px-5 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Thử lại
          </button>
        </div>
      )}
      <p className="mt-8 flex items-start justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        Nguồn: Wikipedia — dữ liệu tra cứu trực tiếp, cập nhật liên tục.
      </p>
    </AppShell>
  );
}
