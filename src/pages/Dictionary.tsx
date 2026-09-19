import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { AppShell } from "@/components/AppShell";
import { AIDocArticle, DocThumb } from "@/components/AIDocReader";
import { AIIndexList } from "@/components/AIIndexList";
import { useSettings } from "@/lib/settings";
import {
  DICTIONARY,
  dictCategories,
  normalize,
  type DictCategory,
  type DictEntry,
} from "@/data/dictionary";
import { ChevronDown, ChevronUp, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const CAT_COLORS: Record<DictCategory, string> = {
  "giáo lý": "bg-gold/15 text-gold",
  "thực hành": "bg-secondary/70 text-secondary-foreground",
  "tâm lý học Phật giáo": "bg-primary/10 text-primary",
  "nhân quả": "bg-secondary text-secondary-foreground",
  "tổ chức": "bg-muted text-muted-foreground",
  "thời gian": "bg-muted text-muted-foreground",
  "địa vị": "bg-gold/10 text-foreground",
};

export default function Dictionary() {
  const { t } = useSettings();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<DictCategory | null>(null);

  const cats = useMemo(() => dictCategories(), []);

  const list = useMemo(() => {
    const nq = normalize(q.trim().toLowerCase());
    return DICTIONARY.filter((e) => {
      if (cat && e.category !== cat) return false;
      if (!nq) return true;
      return (
        normalize(e.term.toLowerCase()).includes(nq) ||
        normalize(e.pali.toLowerCase()).includes(nq) ||
        normalize(e.definition.toLowerCase()).includes(nq)
      );
    });
  }, [q, cat]);

  return (
    <AppShell
      title={t("dictTitle")}
      subtitle={t("dictSubtitle")}
    >
      {/* Ô tìm kiếm — mic TRÁI, kính lúp PHẢI (trong ô) */}
      <div className="relative mb-4">
        <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("dictSearchPlaceholder")}
          className="w-full rounded-xl border border-border/70 bg-card/80 py-3 pl-11 pr-11 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
        <VoiceSearchButton onResult={(text) => setQ(text)} />
      </div>

      {/* Bộ lọc nhóm */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={
            "rounded-full border px-3 py-1 text-xs font-medium transition " +
            (cat === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent")
          }
        >
          Tất cả
        </button>
        {cats.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setCat(cat === c.name ? null : c.name)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition " +
              (cat === c.name
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent")
            }
          >
            {c.name} <span className="opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      {/* Kết quả — AI tự nạp khi từ khóa chưa có trong kho */}
      {list.length === 0 && q.trim() ? (
        <section>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Chưa có «{q}» trong từ điển — Trợ lý Phật học tự nạp và tra cứu giúp bạn:
          </div>
          <AIDocArticle
            kind="dictionary"
            refId={q.trim()}
            title={q.trim()}
            extra={`Tra cứu thuật ngữ Phật học "${q}" (Pāli hoặc tiếng Việt) theo truyền thống Theravāda.`}
          />
        </section>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nhập từ khóa để tra cứu thuật ngữ Phật học.
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((e) => (
            <DictEntryCard key={e.term} entry={e} />
          ))}
        </div>
      )}

      {/* Danh sách đề xuất do Trợ lý Phật học TỰ NẠP TOÀN BỘ — thay dữ liệu cũ */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Thuật ngữ nên tra cứu — Trợ lý Phật học đề xuất
        </h2>
        <AIIndexList
          indexKind="dictionary"
          onOpen={(e) => setQ(e.title)}
          emptyHint="Chưa nạp được danh sách thuật ngữ. Hãy thử lại."
        />
      </section>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        {list.length} / {DICTIONARY.length} thuật ngữ trong kho cục bộ
      </p>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Thẻ thuật ngữ: bấm để mở rộng chi tiết AI biên soạn (có cache)      */
/* ------------------------------------------------------------------ */

function DictEntryCard({ entry }: { entry: DictEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 transition hover:border-primary/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full gap-3 p-4 text-left"
      >
        {/* Thumbnail tự nạp hình minh họa theo thuật ngữ */}
        <DocThumb kind="dictionary" refId={entry.pali || entry.term} title={entry.term} size="h-14 w-14" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{entry.term}</h3>
            <span className="flex items-center gap-2">
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                  CAT_COLORS[entry.category]
                }
              >
                {entry.category}
              </span>
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
          </span>
          <p className="mt-0.5 text-xs italic text-muted-foreground">{entry.pali}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/85">
            {entry.definition}
          </p>
        </span>
      </button>

      {open && (
        <div className="border-t border-border/50 p-4">
          <AIDocArticle
            kind="dictionary"
            refId={entry.pali || entry.term}
            title={entry.term}
            extra={`Thuật ngữ ${entry.term} (${entry.pali}) — nhóm ${entry.category}.`}
          />
        </div>
      )}
    </div>
  );
}
