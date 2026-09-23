import { AppShell } from "@/components/AppShell";
import {
  NewsCard,
  NewsReader,
  useBuddhistNews,
} from "@/components/NewsFeed";
import type { NewsItem } from "@/data/news";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import { Loader2, Newspaper, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* TIN TỨC — tin Phật giáo mới nhất từ Báo Giác Ngộ                    */
/* Ảnh + văn bản hiển thị trực tiếp; đọc bài trong ứng dụng.           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 12;

export default function News() {
  const { items, loading, error, reload } = useBuddhistNews();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [reader, setReader] = useState<NewsItem | null>(null);

  useEffect(() => {
    const stop = trackScroll("news");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("news");
  }, []);

  const shown = items.slice(0, visible);

  return (
    <AppShell
      title="TIN TỨC"
      actions={
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Làm mới tin tức"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Làm mới
        </button>
      }
    >
      {loading && items.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải tin…
        </div>
      )}

      {!loading && error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-10 text-center">
          <Newspaper className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa nạp được tin tức — kiểm tra kết nối rồi thử lại.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-full border border-border/60 px-5 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Thử lại
          </button>
        </div>
      )}

      {shown.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it) => (
            <NewsCard key={it.id} item={it} onOpen={setReader} />
          ))}
        </div>
      )}

      {items.length > visible && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-border/60 px-6 py-2 text-sm font-medium transition hover:bg-accent"
          >
            Xem thêm
          </button>
        </div>
      )}

      {reader && <NewsReader item={reader} onClose={() => setReader(null)} />}
    </AppShell>
  );
}
