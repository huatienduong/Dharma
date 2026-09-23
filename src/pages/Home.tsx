import { AppShell } from "@/components/AppShell";
import { DockPlayer } from "@/lib/player";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  Download,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  MonitorPlay,
  Music,
  Newspaper,
  RefreshCw,
  Scale,
  Search,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { DHAMMAPADA, type DhpVerse } from "@/data/dhammapada";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* Lưới chính: KINH — LUẬT — LUẬN cạnh nhau theo thứ tự Tam tạng */
const TIPITAKA_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { to: "/suttas", label: "Kinh", icon: BookOpen },
  { to: "/vinaya", label: "Luật", icon: Scale },
  { to: "/abhidhamma", label: "Luận", icon: Layers },
];

/* Các mục còn lại */
const OTHER_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { to: "/assistant", label: "Trợ lý", icon: Music },
  { to: "/meditation", label: "Thiền tập", icon: Flower2 },
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked },
  { to: "/calendar", label: "Phật lịch", icon: CalendarDays },
  { to: "/lookup", label: "Tra cứu", icon: Globe2 },
  { to: "/history", label: "Lịch sử Phật giáo", icon: Hourglass },
  { to: "/watched", label: "Lịch sử xem", icon: History },
  { to: "/news", label: "Tin tức", icon: Newspaper },
];

/* Ảnh Đức Phật Thích Ca — Wikimedia Commons (đã xác minh), ngẫu nhiên */
const BUDDHA_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tian_Tan_Buddha_by_Beria.jpg/960px-Tian_Tan_Buddha_by_Beria.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Buddha_statue_at_Buddha_Park_of_Ravangla%2C_Sikkim%2C_India_%281%29.jpg/960px-Buddha_statue_at_Buddha_Park_of_Ravangla%2C_Sikkim%2C_India_%281%29.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Large_Gautama_Buddha_statue_in_Buddha_Park_of_Ravangla%2C_Sikkim.jpg/960px-Large_Gautama_Buddha_statue_in_Buddha_Park_of_Ravangla%2C_Sikkim.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Vairocana_Buddha_statue.jpg/960px-Vairocana_Buddha_statue.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Three_golden_statues_of_the_Buddha_at_Wat_Mai_with_colorful_clouds_at_sunset_in_Luang_Prabang_Laos.jpg/960px-Three_golden_statues_of_the_Buddha_at_Wat_Mai_with_colorful_clouds_at_sunset_in_Luang_Prabang_Laos.jpg",
];



export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const meta = useQuery(api.library.getAppVersion, {});

  /* Câu Pháp Cú + ảnh Đức Phật — chọn ngẫu nhiên, ổn định trong phiên */
  const [verse] = useState<DhpVerse>(
    () => DHAMMAPADA[Math.floor(Math.random() * DHAMMAPADA.length)],
  );
  const [buddhaImg] = useState(() =>
    BUDDHA_IMAGES[Math.floor(Math.random() * BUDDHA_IMAGES.length)],
  );

  useEffect(() => {
    const stop = trackScroll("home");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("home");
  }, []);

  const submitSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    navigate(`/suttas?q=${encodeURIComponent(q)}`);
  }, [query, navigate]);

  /* Kiểm tra cập nhật: so sánh phiên bản máy chủ với phiên bản hiện tại */
  const latest = meta?.latestVersion ?? APP_VERSION;
  const hasUpdate = compareVersions(latest, APP_VERSION) > 0;

  return (
    <AppShell title="Trang chủ" hideTitle>
      <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
        <DockPlayer />
      </div>

      {/* ---------------- Tìm kiếm pill ---------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="mb-4"
        role="search"
      >
        <div className="flex h-12 items-center gap-3 rounded-full bg-card px-4 shadow-[0_1px_2px_rgba(43,29,18,0.04),0_6px_20px_rgba(43,29,18,0.06)] transition focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kinh sách…"
            aria-label="Tìm kiếm toàn ứng dụng"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </form>

      {/* ---------------- HERO: ảnh Phật + Kinh Pháp Cú ---------------- */}
      <section className="ds-card relative mb-4 overflow-hidden">
        <div className="relative h-52 w-full overflow-hidden bg-muted sm:h-64">
          <img
            src={buddhaImg}
            alt="Đức Phật Thích Ca"
            loading="eager"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#2b1d12]/75 via-transparent to-transparent"
          />
        </div>

        {/* Trích Kinh Pháp Cú nổi trên đáy hero */}
        <div className="relative -mt-14 px-4 pb-4">
          <div className="rounded-3xl bg-card/95 px-5 py-4 text-center shadow-[0_8px_28px_rgba(43,29,18,0.16)] backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              Kinh Pháp Cú — câu {verse.n}
            </p>
            <blockquote className="mt-2">
              <p className="readable-serif line-clamp-3 text-[14px] leading-[1.8] text-foreground/95">
                {verse.vi}
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      {/* -------- Tam tạng: KINH — LUẬT — LUẬN cạnh nhau -------- */}
      <section className="ds-card mb-4 px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {TIPITAKA_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2 px-1 text-center transition active:scale-95"
              >
                <span className="ds-tile h-[54px] w-[54px] shadow-[0_2px_8px_rgba(43,29,18,0.08)]">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="text-xs font-semibold leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* -------- Lưới các mục còn lại -------- */}
      <section className="ds-card mb-6 px-3 py-5">
        <div className="grid grid-cols-3 gap-y-5 sm:grid-cols-5">
          {OTHER_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2 px-1 text-center transition active:scale-95"
              >
                <span className="ds-tile h-[54px] w-[54px] shadow-[0_2px_8px_rgba(43,29,18,0.08)]">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-medium leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------- Chân trang: nhà phát triển + phiên bản ---------------- */}
      <footer className="ds-card mb-4 p-5 text-center">
        <p className="text-[13px] font-semibold text-foreground/90">
          Nhà phát triển ứng dụng: Hứa Tiến Dương
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Dharma · Phiên bản {APP_VERSION}
        </p>
        {meta?.releaseNotes && !hasUpdate && (
          <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-muted-foreground/80">
            {meta.releaseNotes}
          </p>
        )}
        {hasUpdate && (
          <div className="mx-auto mt-3 max-w-sm rounded-2xl bg-gold/10 p-3">
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gold">
              <Download className="h-3.5 w-3.5" />
              Có phiên bản mới {latest}
            </p>
            {meta?.releaseNotes && (
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {meta.releaseNotes}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <RefreshCw className="h-3 w-3" /> Tải bản mới
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            // Kiểm tra cập nhật: nạp lại trang để lấy bundle mới nhất
            window.location.reload();
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-foreground/85 transition hover:border-primary/40 hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Kiểm tra cập nhật
        </button>
      </footer>
    </AppShell>
  );
}

/* So sánh phiên bản x.y.z: 1 nếu a > b, -1 nếu a < b, 0 nếu bằng */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
