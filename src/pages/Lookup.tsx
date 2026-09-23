import { AppShell } from "@/components/AppShell";
import { SearchToolbar } from "@/components/SearchToolbar";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Search as SearchIcon, Globe2, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* TRA CỨU — tra cứu trực tiếp Wikipedia ngay trong ứng dụng           */
/* Dùng Wikipedia REST API (miễn phí, CORS mở, không cần khóa):        */
/*   • Tìm gợi ý:  /w/rest.php/v1/search/page?q=...&limit=8            */
/*   • Nội dung:   /api/rest_v1/page/summary/{title}  (hỗ trợ vi/en)   */
/* ------------------------------------------------------------------ */

type WikiSuggestion = { id: number; key: string; title: string; description?: string };
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
  "Karma trong Phật giáo",
  "Luật tạng",
];

const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => url, // trực tiếp cuối cùng — môi trường có CORS mở vẫn chạy
];

async function fetchViaProxies(url: string): Promise<unknown> {
  let lastErr: unknown = null;
  for (const wrap of PROXIES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(wrap(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Không truy cập được Wikipedia.");
}

export default function Lookup() {
  const [term, setTerm] = useState(() => loadUiState<string>("lookup-term", ""));
  const [suggestions, setSuggestions] = useState<WikiSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [error, setError] = useState(false);
  const [lang, setLang] = useState<"vi" | "en">(() => loadUiState<"vi" | "en">("lookup-lang", "vi"));
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => saveUiState("lookup-term", term), [term]);
  useEffect(() => saveUiState("lookup-lang", lang), [lang]);
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
        const url = `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(q)}&limit=8`;
        const data = (await fetchViaProxies(url)) as { pages?: WikiSuggestion[] };
        setSuggestions(data.pages ?? []);
        setError(false);
      } catch {
        setSuggestions(null);
      } finally {
        setSuggesting(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term, lang]);

  const openArticle = useCallback(
    async (title: string) => {
      setArticle(null);
      setLoadingArticle(true);
      setError(false);
      try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
        const data = (await fetchViaProxies(url)) as WikiSummary;
        if (!data?.extract) throw new Error("Không có nội dung.");
        setArticle(data);
        restoreScroll("lookup", 1);
      } catch {
        setError(true);
      } finally {
        setLoadingArticle(false);
      }
    },
    [lang],
  );

  // Khôi phục từ khóa đã tra trước đó (không tự mở bài — để người dùng chủ động)
  const quickPicks = useMemo(() => (term.trim() ? null : QUICK_TERMS.slice(0, 8)), [term]);

  return (
    <AppShell title="TRA CỨU" subtitle="Tra cứu thuật ngữ Phật học trên Wikipedia — xem trực tiếp trong ứng dụng">
      {/* Thanh tìm kiếm dùng chung — micro TRÁI, kính lúp PHẢI */}
      <div className="sticky top-14 z-30 -mx-3 bg-background px-3 py-2.5 shadow-sm sm:-mx-5 sm:px-5">
        <div className="flex items-center gap-2">
          <SearchToolbar
            value={term}
            onChange={setTerm}
            sticky={false}
            ariaLabel="Tra cứu Wikipedia"
            className="flex-1"
          />
          {/* Chuyển ngôn ngữ Wikipedia: vi / en */}
          <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-border/70 bg-muted/50">
            {(["vi", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold transition",
                  lang === l ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Đang nghe giọng nói */}
      {listening && (
        <div className="mb-3 flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 px-3.5 py-2 text-xs font-medium text-destructive">
          <span className="relative flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-destructive/60" />
          </span>
          Đang nghe… (bấm micro lần nữa để dừng)
        </div>
      )}
      {micSupported === false && null /* micro không hỗ trợ — ẩn im lặng */}

      {/* Gợi ý nhanh khi chưa nhập gì */}
      {quickPicks && !article && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Thuật ngữ Phật học hay tra
          </h2>
          <div className="flex flex-wrap gap-2">
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tra từ «{term.trim()}»…
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void openArticle(s.title)}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <Globe2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">{s.title}</span>
                    {s.description && (
                      <span className="block truncate text-xs text-muted-foreground">{s.description}</span>
                    )}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : (
            !suggesting && (
              <p className="rounded-xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                Không tìm thấy mục nào khớp «{term.trim()}» trên Wikipedia {lang.toUpperCase()}.
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
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{article.title}</h2>
            {article.description && (
              <p className="mt-1 text-sm text-muted-foreground">{article.description}</p>
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
              <span className="ml-auto text-muted-foreground/70">Nguồn: Wikipedia {lang.toUpperCase()}</span>
            </div>
          </div>
        </article>
      )}

      {/* Lỗi tải bài */}
      {error && !loadingArticle && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Không nạp được nội dung Wikipedia lần này — kiểm tra kết nối rồi thử lại.
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
    </AppShell>
  );
}
