import { AppShell, ShellBackButton } from "@/components/AppShell";
import { AIDocArticle, DocThumb } from "@/components/AIDocReader";
import { AIIndexList } from "@/components/AIIndexList";
import { SearchToolbar } from "@/components/SearchToolbar";
import {
  ABHIDHAMMA_BOOKS,
  ABHIDHAMMA_CATEGORIES,
  getAbhidhammaEntry,
  type AbhidhammaEntry,
} from "@/data/abhidhamma";
import {
  loadLocalReadingPercent,
  onAppHide,
  saveLocalReading,
} from "@/lib/localProgress";
import { loadUiState, restoreScroll, saveUiState, trackScroll } from "@/lib/uiState";
import { BookMarked, Layers, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

export default function Abhidhamma() {
  const navigate = useNavigate();
  const [search, setSearch] = useState(() =>
    loadUiState<string>("abhidhamma-search", ""),
  );
  useEffect(() => {
    saveUiState("abhidhamma-search", search);
  }, [search]);

  // Giữ vị trí cuộn khi rời trang rồi quay lại
  useEffect(() => {
    const stop = trackScroll("abhidhamma");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("abhidhamma");
  }, []);

  const q = normalize(search.trim());
  const match = (e: AbhidhammaEntry) =>
    !q ||
    normalize(`${e.title} ${e.pali} ${e.desc} ${e.id}`).includes(q);

  const books = ABHIDHAMMA_BOOKS.filter(match);
  const categories = ABHIDHAMMA_CATEGORIES.filter(match);

  return (
    <AppShell
      title="Luận tạng"
      subtitle="Abhidhamma Piṭaka — Vi Diệu Pháp theo truyền thống Theravāda"
    >
      <SearchToolbar
        value={search}
        onChange={setSearch}
        sticky
        ariaLabel="Tìm trong Luận tạng"
      />

      {/* 7 BỘ LUẬN TẠNG — dữ liệu chuẩn luôn có sẵn, không phụ thuộc mạng */}
      {books.length > 0 && (
        <section className="mt-1">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Bảy bộ Luận tạng
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {books.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/abhidhamma/${e.id}`)}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <DocThumb kind="abhidhamma" refId={e.id} title={e.pali} size="h-14 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    {e.order && (
                      <span className="text-[11px] font-semibold text-gold">
                        {e.order}.
                      </span>
                    )}
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {e.title}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] italic text-muted-foreground">
                    {e.pali}
                  </span>
                  <span className="mt-1 block line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {e.desc}
                  </span>
                  {e.note && (
                    <span className="mt-1.5 inline-block rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                      {e.note}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* PHẠM TRÙ NỀN TẢNG CỦA VI DIỆU PHÁP */}
      {categories.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookMarked className="h-3.5 w-3.5" />
            Phạm trù nền tảng
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {categories.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/abhidhamma/${e.id}`)}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <DocThumb kind="abhidhamma" refId={e.id} title={e.pali} size="h-14 w-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary">
                    {e.title}
                  </span>
                  <span className="block truncate text-[11px] italic text-muted-foreground">
                    {e.pali}
                  </span>
                  <span className="mt-1 block line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {e.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* TRỢ LÝ PHẬT HỌC ĐỀ XUẤT THÊM — tự nạp toàn bộ danh sách */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Trợ lý Phật học đề xuất thêm
        </h2>
        <AIIndexList
          indexKind="abhidhamma"
          onOpen={(e) => navigate(`/abhidhamma/${e.id}`)}
          emptyHint="Chưa nạp được danh sách Luận tạng. Hãy thử lại."
          query={search}
        />
      </section>
    </AppShell>
  );
}

export function AbhidhammaReader() {
  const { id } = useParams();
  const entry = id ? getAbhidhammaEntry(id) : undefined;
  const restoredRef = useRef(false);

  // Khôi phục vị trí cuộn từ tiến trình cục bộ
  useEffect(() => {
    if (!id || restoredRef.current) return;
    const pct = loadLocalReadingPercent(`abhidhamma:${id}`);
    if (pct > 2) {
      restoredRef.current = true;
      const target =
        (document.documentElement.scrollHeight - window.innerHeight) * (pct / 100);
      requestAnimationFrame(() => window.scrollTo(0, target));
    } else {
      restoredRef.current = true;
    }
  }, [id]);

  // Lưu tiến trình khi cuộn (debounce nhẹ) — cục bộ, mọi người dùng
  useEffect(() => {
    if (!id) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const saveNow = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      saveLocalReading(`abhidhamma:${id}`, pct);
    };
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(saveNow, 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Ghi ngay khi rời ứng dụng — không mất tiến trình đọc
    const stopHide = onAppHide(saveNow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      stopHide();
      if (t) clearTimeout(t);
    };
  }, [id]);

  const title = entry?.title ?? decodeURIComponent(id ?? "").replace(/[-_]/g, " ");

  return (
    <AppShell
      title={title}
      subtitle={entry ? `Luận tạng — ${entry.pali}` : "Luận tạng Abhidhamma"}
      actions={<ShellBackButton />}
    >
      {entry && (
        <div className="mb-5 rounded-xl border border-border/60 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground/90">{entry.title}</p>
          <p className="italic">{entry.pali}</p>
          <p className="mt-2">{entry.desc}</p>
          {entry.note && <p className="mt-2 text-gold">{entry.note}</p>}
        </div>
      )}

      {/* Nội dung đầy đủ do Trợ lý Phật học biên soạn theo Luận tạng Pāli */}
      <AIDocArticle
        kind="abhidhamma"
        refId={id ?? "abhidhamma"}
        title={title}
        pali={entry?.pali}
        extra={
          entry
            ? `Văn bản Luận tạng: ${entry.title} (${entry.pali})${entry.note ? ` — ${entry.note}` : ""}.`
            : `Phạm trù Luận tạng Abhidhamma "${id}".`
        }
      />
    </AppShell>
  );
}
