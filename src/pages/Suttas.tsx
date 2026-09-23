import { AppShell, ShellBackButton } from "@/components/AppShell";
import { AIDocArticle, DocThumb } from "@/components/AIDocReader";
import { AIIndexList } from "@/components/AIIndexList";
import { SearchToolbar } from "@/components/SearchToolbar";
import { api } from "@/convex/_generated/api";
import { getSutta, SUTTAS } from "@/data/suttas";
import { loadLocalSuttaProgress, loadLocalSuttaPercent, onAppHide, saveLocalSuttaProgress } from "@/lib/localProgress";
import { useSettings } from "@/lib/settings";
import { loadUiState, saveUiState, trackScroll, restoreScroll } from "@/lib/uiState";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  BookOpenText,
  Eye,
  MapPin,
  ScrollText,
  Sparkles,
  User,
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
  const navigate = useNavigate();
  // Từ khóa tìm kiếm giữ nguyên khi rời trang rồi quay lại
  const [search, setSearch] = useState(() => loadUiState<string>("suttas-search", ""));
  const searchQ = search.trim().toLowerCase();
  useEffect(() => {
    saveUiState("suttas-search", search);
  }, [search]);

  useEffect(() => {
    const stop = trackScroll("suttas");
    return () => {
      stop();
    };
  }, []);
  useEffect(() => {
    restoreScroll("suttas");
  }, []);

  /* Kho kinh Pāli cốt lõi hiển thị kèm tên Pāli — lọc theo từ khóa */
  const staticList = useMemo(() => {
    if (!searchQ) return SUTTAS;
    return SUTTAS.filter((s) =>
      `${s.title} ${s.paliTitle} ${s.summary} ${s.id} ${s.nikaya} ${s.number}`
        .toLowerCase()
        .includes(searchQ),
    );
  }, [searchQ]);

  // Tiến trình đọc lưu CỤC BỘ trên thiết bị (không cần đăng nhập)
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of loadLocalSuttaProgress()) {
      map.set(r.docId, r.percent);
    }
    return map;
  }, []);

  return (
    <AppShell
      title={t("navSuttas")}
      subtitle={t("suttasSubtitle")}
    >
      {/* Tìm kiếm dùng chung — dính cố định dưới header khi cuộn */}
      <SearchToolbar
        value={search}
        onChange={setSearch}
        sticky
      />

      {/* Danh sách đề xuất do Trợ lý Phật học TỰ NẠP TOÀN BỘ — thay dữ liệu cũ */}
      <AIIndexList
        indexKind="suttas"
        onOpen={(e) => navigate(`/suttas/${e.id}`)}
        emptyHint="Chưa nạp được danh sách kinh đề xuất. Hãy thử lại."
      />

      {/* KHO PĀLI CỐT LÕI — luôn có sẵn trong ứng dụng, hiện kèm tên Pāli   */}
      {/* (bổ sung các bài kinh quan trọng nhất của Phật giáo Nguyên thủy). */}
      {staticList.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            Kinh Pāli cốt lõi — có sẵn
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {staticList.map((s) => (
              <SuttaCard
                key={s.id}
                id={s.id}
                pct={progressMap.get(`sutta:${s.id}`) ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* AI tự nạp dữ liệu khi tìm kiếm không có kết quả */}
      {searchQ && (
        <section className="mt-4">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Trợ lý Phật học đang biên soạn «{search}»:
          </div>
          <AIDocArticle
            kind="sutta"
            refId={`search-${searchQ}`}
            title={search}
            extra={`Tìm kiếm bài kinh về chủ đề "${search}" trong Kinh tạng Pāli Theravāda. Nếu đúng mã kinh (vd MN 118) hãy đọc chính bài kinh đó.`}
          />
        </section>
      )}
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
      className="group flex h-full gap-3 rounded-xl border border-border/60 bg-card/70 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* Thumbnail tự nạp hình ảnh minh họa từ internet */}
      <DocThumb kind="sutta" refId={s.id} title={s.title} size="h-20 w-20" />
      <div className="min-w-0 flex-1">
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
        <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold group-hover:text-primary">
          {s.title}
        </h3>
        <p className="truncate text-[11px] italic text-muted-foreground/90">
          {s.paliTitle}
        </p>
        <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {s.summary}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground/80">
          {s.speaker} · {s.location}
        </p>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  // Khôi phục vị trí cuộn từ tiến trình CỤC BỘ trên thiết bị
  useEffect(() => {
    if (restoredRef.current) return;
    const pct = docId ? loadLocalSuttaPercent(docId) : 0;
    if (pct > 2 && scrollRef.current) {
      restoredRef.current = true;
      const el = scrollRef.current;
      const target = (el.scrollHeight - el.clientHeight) * (pct / 100);
      requestAnimationFrame(() => window.scrollTo(0, target));
    } else {
      restoredRef.current = true; // chưa đọc sâu — không cần khôi phục
    }
  }, [docId, sutta]);

  // Lưu tiến trình khi cuộn (debounce nhẹ) — lưu CỤC BỘ trên thiết bị
  useEffect(() => {
    if (!sutta) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const saveNow = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      saveLocalSuttaProgress(`sutta:${sutta.id}`, pct);
    };
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(saveNow, 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Ghi ngay khi rời ứng dụng — không mất tiến trình đọc dù chưa hết debounce
    const stopHide = onAppHide(saveNow);
    return () => {
      window.removeEventListener("scroll", onScroll);
      stopHide();
      if (t) clearTimeout(t);
    };
  }, [sutta]);

  // Kinh do danh sách AI đề xuất (chưa có trong kho cũ) → đọc bản AI đầy đủ
  if (!sutta && id) {
    return (
      <AppShell
        title={decodeURIComponent(id).replace(/[-_]/g, " ")}
        subtitle="Kinh điển Pāli"
        actions={<ShellBackButton />}
      >
        <AIDocArticle
          kind="sutta"
          refId={id}
          title={decodeURIComponent(id).replace(/[-_]/g, " ")}
          extra={`Bài kinh "${id}" trong Kinh tạng Pāli Theravāda — bản tiếng Việt đầy đủ.`}
        />
      </AppShell>
    );
  }

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

        {tab === "text" && (
          <>
            {sutta.sections.map((sec, i) => (
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
            {/* AI bổ sung bản kinh đầy đủ, đọc trực tiếp trong ứng dụng */}
            <AIDocArticle
              kind="sutta"
              refId={sutta.id}
              title={sutta.title}
              extra={`Bài kinh ${sutta.paliTitle || sutta.title} (${sutta.nikaya} ${sutta.number}), do ${sutta.speaker} thuyết tại ${sutta.location}. Bản kinh tiếng Việt đầy đủ.`}
            />
          </>
        )}

        {tab === "meaning" && (
          <AIDocArticle
            kind="subcommentary"
            refId={sutta.id}
            title={sutta.title}
            extra={`Luận giải bài kinh ${sutta.paliTitle || sutta.title} (${sutta.nikaya} ${sutta.number}), do ${sutta.speaker} thuyết tại ${sutta.location}.`}
          />
        )}

        {tab === "atthakatha" && (
          <AIDocArticle
            kind="commentary"
            refId={sutta.id}
            title={sutta.title}
            extra={`Chú giải Aṭṭhakathā cho bài kinh ${sutta.paliTitle || sutta.title} (${sutta.nikaya} ${sutta.number}).`}
          />
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

