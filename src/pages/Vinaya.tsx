import { AppShell, ShellBackButton } from "@/components/AppShell";
import { AIDocArticle } from "@/components/AIDocReader";
import { AIIndexList } from "@/components/AIIndexList";
import { SearchToolbar } from "@/components/SearchToolbar";
import { getVinayaDoc } from "@/data/vinaya";
import {
  loadLocalReadingPercent,
  onAppHide,
  saveLocalReading,
} from "@/lib/localProgress";
import { useNavigate, useParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { trackScroll, restoreScroll, loadUiState, saveUiState } from "@/lib/uiState";

export default function Vinaya() {
  const navigate = useNavigate();
  // Từ khóa tìm kiếm giữ nguyên khi rời trang rồi quay lại
  const [search, setSearch] = useState(() => loadUiState<string>("vinaya-search", ""));
  useEffect(() => { saveUiState("vinaya-search", search); }, [search]);

  // Giữ vị trí cuộn khi rời trang rồi quay lại
  useEffect(() => {
    const stop = trackScroll("vinaya");
    return () => {
      stop();
    };
  }, []);
  useEffect(() => {
    restoreScroll("vinaya");
  }, []);

  return (
    <AppShell
      title="Luật tạng"
      subtitle="Vinaya Piṭaka — nền giới hạnh của Tăng-già theo truyền thống Theravāda"
    >
      {/* Công cụ tìm kiếm — dính cố định dưới header khi cuộn */}
      <SearchToolbar
        value={search}
        onChange={setSearch}
        sticky
        ariaLabel="Tìm trong Luật tạng"
      />

      {/* Danh sách đề xuất do Trợ lý Phật học TỰ NẠP TOÀN BỘ — lọc theo từ khóa */}
      <AIIndexList
        indexKind="vinaya"
        onOpen={(e) => navigate(`/vinaya/${e.id}`)}
        emptyHint="Chưa nạp được danh sách Luật tạng. Hãy thử lại."
        query={search}
      />
    </AppShell>
  );
}

export function VinayaReader() {
  const { id } = useParams();
  const doc = id ? getVinayaDoc(id) : undefined;
  const restoredRef = useRef(false);

  // Khôi phục vị trí cuộn từ tiến trình cục bộ
  useEffect(() => {
    if (!doc || restoredRef.current) return;
    const pct = loadLocalReadingPercent(`vinaya:${doc.id}`);
    if (pct > 2) {
      restoredRef.current = true;
      const target =
        (document.documentElement.scrollHeight - window.innerHeight) *
        (pct / 100);
      requestAnimationFrame(() => window.scrollTo(0, target));
    } else {
      restoredRef.current = true;
    }
  }, [doc]);

  // Lưu tiến trình khi cuộn (debounce nhẹ) — cục bộ, mọi người dùng
  useEffect(() => {
    if (!doc) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const saveNow = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
      saveLocalReading(`vinaya:${doc.id}`, pct);
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
  }, [doc]);

  // Văn bản do danh sách AI đề xuất (chưa có trong kho cũ) → đọc bản AI đầy đủ
  if (!doc && id) {
    return (
      <AppShell
        title={decodeURIComponent(id).replace(/[-_]/g, " ")}
        subtitle="Nội dung Luật tạng do Trợ lý Phật học tự nạp"
        actions={<ShellBackButton />}
      >
        <AIDocArticle
          kind="vinaya"
          refId={id}
          title={decodeURIComponent(id).replace(/[-_]/g, " ")}
          extra={`Văn bản Luật tạng Pāli "${id}" — nội dung đầy đủ.`}
        />
      </AppShell>
    );
  }

  if (!doc) {
    return (
      <AppShell title="Luật tạng">
        <p className="text-sm text-muted-foreground">Không tìm thấy tài liệu.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={doc.title}
      subtitle={doc.subtitle}
      actions={<ShellBackButton />}
    >
      <div className="mb-5 rounded-xl border border-border/60 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
        {doc.summary}
      </div>

      {/* Nội dung đầy đủ do AI biên soạn — đọc trực tiếp trong ứng dụng,
          có nguồn Vinaya Piṭaka ở cuối */}
      <AIDocArticle
        kind="vinaya"
        refId={doc.id}
        title={doc.title}
        pali={doc.subtitle}
        extra={`Văn bản Luật tạng: ${doc.title}${doc.subtitle ? ` (${doc.subtitle})` : ""}.`}
      />

      <div className="space-y-5">
        {doc.sections.map((sec, i) => (
          <section key={i}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h3 className="text-sm font-semibold">{sec.name}</h3>
              {sec.count && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                  {sec.count} điều
                </span>
              )}
              <span className="text-[11px] italic text-muted-foreground">
                {sec.pali}
              </span>
            </div>
            <div className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5">
              {sec.content.map((p, j) => (
                <p key={j} className="text-[15px] leading-[1.9] text-foreground/90">
                  {p}
                </p>
              ))}
              {sec.rules && (
                <ul className="space-y-2 border-t border-border/50 pt-3">
                  {sec.rules.map((r, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-[13px] leading-relaxed text-foreground/85"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
