import { AppShell, ShellBackButton } from "@/components/AppShell";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { api } from "@/convex/_generated/api";
import { getSutta, SUTTAS } from "@/data/suttas";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/lib/settings";
import {
  loadLocalReadingPercent,
  saveLocalReading,
} from "@/lib/localProgress";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  BookOpenText,
  Eye,
  MapPin,
  ScrollText,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

/* ------------------------------------------------------------------ */
/* Trang danh sách                                                     */
/* ------------------------------------------------------------------ */

const NIKAYA_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "DN", label: "Trường Bộ (DN)" },
  { key: "MN", label: "Trung Bộ (MN)" },
  { key: "SN", label: "Tương Ưng (SN)" },
  { key: "AN", label: "Tăng Chi (AN)" },
  { key: "KHP", label: "Tiểu Bộ (Khuddaka)" },
];

export default function Suttas() {
  const { t } = useSettings();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const reading = useQuery(api.library.listReading, {});

  const searchQ = search.trim().toLowerCase();
  const list = useMemo(() => {
    let rows = tab === "all" ? SUTTAS : SUTTAS.filter((s) => s.nikaya === tab);
    if (searchQ) {
      rows = rows.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQ) ||
          s.id.toLowerCase().includes(searchQ) ||
          (s as { pali?: string }).pali?.toLowerCase().includes(searchQ) ||
          s.summary?.toLowerCase().includes(searchQ),
      );
    }
    return rows;
  }, [tab, searchQ]);

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reading ?? []) {
      if (r.docId.startsWith("sutta:")) map.set(r.docId, r.percent);
    }
    return map;
  }, [reading]);

  return (
    <AppShell
      title={t("navSuttas")}
      subtitle={t("suttasSubtitle")}
    >
      {/* Tìm kiếm — mic TRÁI, kính lúp PHẢI (trong ô) */}
      <div className="mb-4">
        <div className="relative">
          <VoiceSearchButton onResult={(text) => setSearch(text)} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("suttaSearchPlaceholder")}
            className="h-10 w-full rounded-full border border-border/70 bg-card/80 pl-11 pr-11 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={t("clearSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Bộ lọc Nikaya */}
      <div className="mb-6 flex flex-wrap gap-2">
        {NIKAYA_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition " +
              (tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((s) => {
          const pct = progressMap.get(`sutta:${s.id}`) ?? 0;
          return (
            <SuttaCard key={s.id} id={s.id} pct={pct} />
          );
        })}
      </div>
    </AppShell>
  );
}

function SuttaCard({ id, pct }: { id: string; pct: number }) {
  const navigate = useNavigate();
  const s = getSutta(id)!;
  return (
    <button
      type="button"
      onClick={() => navigate(`/suttas/${id}`)}
      className="group flex h-full flex-col rounded-xl border border-border/60 bg-card/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
          {s.nikaya} {s.number}
        </span>
        {pct > 0 && (
          <span className="flex items-center gap-1 text-primary">
            <Eye className="h-3 w-3" /> Đã đọc {pct}%
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-primary">
        {s.title}
      </h3>
      <p className="text-[11px] italic text-muted-foreground">{s.paliTitle}</p>
      <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
        {s.summary}
      </p>
      <div className="mt-3 flex items-center gap-3 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" /> {s.speaker}
        </span>
        <span className="flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3" /> {s.location}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Trang đọc chi tiết                                                  */
/* ------------------------------------------------------------------ */

export function SuttaReader() {
  const { id } = useParams();
  const sutta = id ? getSutta(id) : undefined;
  const [tab, setTab] = useState<"text" | "meaning" | "atthakatha">("text");

  const docId = sutta ? `sutta:${sutta.id}` : "";
  const progress = useQuery(
    api.library.getReading,
    docId ? { docId } : "skip",
  );
  const saveReading = useMutation(api.library.saveReading);
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // Khôi phục vị trí cuộn — GỘP server + local (mục lớn hơn thắng)
  useEffect(() => {
    if (restoredRef.current) return;
    const serverPct = progress?.percent ?? 0;
    const localPct = sutta ? loadLocalReadingPercent(`sutta:${sutta.id}`) : 0;
    const pct = Math.max(serverPct, localPct);
    if (pct > 2 && scrollRef.current) {
      restoredRef.current = true;
      const el = scrollRef.current;
      const target = (el.scrollHeight - el.clientHeight) * (pct / 100);
      requestAnimationFrame(() => window.scrollTo(0, target));
    } else if (progress !== undefined) {
      restoredRef.current = true; // đã có dữ liệu nhưng chưa đọc sâu
    }
  }, [progress, sutta]);

  // Lưu tiến trình khi cuộn (debounce nhẹ) — SERVER + LOCAL cho mọi người
  useEffect(() => {
    if (!sutta) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
        // Local luôn lưu (khách đọc vẫn quay lại đúng chỗ)
        saveLocalReading(`sutta:${sutta.id}`, pct);
        // Server lưu khi đăng nhập
        if (isAuthenticated) {
          void saveReading({ docId: `sutta:${sutta.id}`, percent: pct }).catch(
            () => {},
          );
        }
      }, 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (t) clearTimeout(t);
    };
  }, [sutta, saveReading, isAuthenticated]);

  if (!sutta) {
    return (
      <AppShell title="Kinh tạng">
        <p className="text-sm text-muted-foreground">Không tìm thấy bài kinh.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={sutta.title}
      subtitle={`${sutta.collection} · ${sutta.nikaya} ${sutta.number}`}
      actions={<ShellBackButton />}
    >
      <div ref={scrollRef}>
        <div className="mb-5 rounded-xl border border-border/60 bg-card/60 p-4">
          <p className="text-[11px] italic text-muted-foreground">
            {sutta.paliTitle}
          </p>
          <h2 className="mt-0.5 text-lg font-bold">{sutta.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {sutta.speaker}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {sutta.location}
            </span>
          </div>
          <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground">
            {sutta.summary}
          </p>
        </div>

        {/* Tab: văn bản / luận giải / chú giải */}
        <div className="mb-5 flex gap-2">
          <TabBtn active={tab === "text"} onClick={() => setTab("text")}>
            <BookOpen className="h-3.5 w-3.5" /> Bản Kinh
          </TabBtn>
          <TabBtn active={tab === "meaning"} onClick={() => setTab("meaning")}>
            <Sparkles className="h-3.5 w-3.5" /> Luận giải
          </TabBtn>
          <TabBtn
            active={tab === "atthakatha"}
            onClick={() => setTab("atthakatha")}
          >
            <ScrollText className="h-3.5 w-3.5" /> Chú giải
          </TabBtn>
        </div>

        {tab === "text" &&
          sutta.sections.map((sec, i) => (
            <section key={i} className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
                {sec.heading}
              </h3>
              <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5">
                {sec.text.map((p, j) => (
                  <p
                    key={j}
                    className="text-[15px] leading-[1.9] text-foreground/90"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

        {tab === "meaning" &&
          sutta.lunGiai.map((sec, i) => (
            <section key={i} className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
                {sec.heading}
              </h3>
              <div className="space-y-3 rounded-xl border border-gold/30 bg-gradient-to-br from-card/80 to-secondary/30 p-4 sm:p-5">
                {sec.text.map((p, j) => (
                  <p key={j} className="text-[15px] leading-[1.9]">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

        {tab === "atthakatha" &&
          sutta.chuGiai.map((sec, i) => (
            <section key={i} className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
                {sec.heading}
              </h3>
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/40 p-4 sm:p-5">
                {sec.text.map((p, j) => (
                  <p key={j} className="text-[15px] leading-[1.9] text-foreground/85">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}

        {progress && progress.percent > 2 && (
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpenText className="h-3 w-3" /> Bạn đã đọc tới {progress.percent}%
            — tiến trình được lưu tự động.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}

