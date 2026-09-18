import { AppShell } from "@/components/AppShell";
import {
  DICTIONARY,
  dictCategories,
  normalize,
  type DictCategory,
} from "@/data/dictionary";
import { Search } from "lucide-react";
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
      title="Từ điển Phật học"
      subtitle="Thuật ngữ Pāḷi chuyên ngành theo truyền thống Theravāda"
    >
      {/* Ô tìm kiếm */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm thuật ngữ — ví dụ: anicca, niết bàn, uposatha…"
          className="w-full rounded-xl border border-border/70 bg-card/80 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
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

      {/* Kết quả */}
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Không tìm thấy thuật ngữ «{q}».
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((e) => (
            <div
              key={e.term}
              className="rounded-xl border border-border/60 bg-card/70 p-4 transition hover:border-primary/30"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{e.term}</h3>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-medium " +
                    CAT_COLORS[e.category]
                  }
                >
                  {e.category}
                </span>
              </div>
              <p className="mt-0.5 text-xs italic text-gold">{e.pali}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
                {e.definition}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        {list.length} / {DICTIONARY.length} thuật ngữ
      </p>
    </AppShell>
  );
}
