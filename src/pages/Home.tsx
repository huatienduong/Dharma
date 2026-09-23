import { AppShell } from "@/components/AppShell";
import { DockPlayer } from "@/lib/player";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import {
  BookMarked,
  CalendarDays,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  MonitorPlay,
  Newspaper,
  Scale,
  BookOpen,
  Search,
} from "lucide-react";
import { DHAMMAPADA, type DhpVerse } from "@/data/dhammapada";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* Lưới chức năng: KINH — LUẬT — LUẬN cạnh nhau theo thứ tự tạng */
const TIPITAKA_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
  tile: string;
}[] = [
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen, tile: "bg-green-500" },
  { to: "/vinaya", label: "Luật tạng", icon: Scale, tile: "bg-yellow-600" },
  { to: "/abhidhamma", label: "Luận tạng", icon: Layers, tile: "bg-teal-500" },
];

const OTHER_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
  tile: string;
}[] = [
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay, tile: "bg-orange-500" },
  { to: "/meditation", label: "Thiền định", icon: Flower2, tile: "bg-amber-500" },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked, tile: "bg-emerald-500" },
  { to: "/calendar", label: "Lịch Phật giáo", icon: CalendarDays, tile: "bg-blue-500" },
  { to: "/lookup", label: "Tra cứu", icon: Globe2, tile: "bg-indigo-500" },
  /* Đồng bộ cùng lưới ô màu: Tin tức — Lịch sử Phật giáo — Lịch sử xem */
  { to: "/news", label: "Tin tức", icon: Newspaper, tile: "bg-rose-500" },
  { to: "/history", label: "Lịch sử PG", icon: Hourglass, tile: "bg-purple-500" },
  { to: "/watched", label: "Lịch sử xem", icon: History, tile: "bg-cyan-600" },
];

/* Ảnh Đức Phật Thích Ca — Wikimedia Commons (đã xác minh 200 OK),
 * chạy ngẫu nhiên mỗi lần mở Trang chủ. */
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

  return (
    <AppShell title="Trang chủ" hideTitle>
      <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
        <DockPlayer />
      </div>

      {/* ---------------- Thanh tìm kiếm pill ---------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="mb-4"
        role="search"
      >
        <div className="flex h-12 items-center gap-3 rounded-full bg-card px-4 shadow-[0_1px_2px_rgba(43,29,18,0.05),0_4px_14px_rgba(43,29,18,0.06)] transition focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kinh, pháp thoại, thuật ngữ…"
            aria-label="Tìm kiếm toàn ứng dụng"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </form>

      {/* -------- Ảnh Đức Phật ngẫu nhiên + Trích Kinh Pháp Cú -------- */}
      <section className="ds-card relative mb-5 overflow-hidden">
        {/* Ảnh Đức Phật Thích Ca — chạy ngẫu nhiên từ internet */}
        <div className="relative h-44 w-full overflow-hidden bg-muted sm:h-56">
          <img
            src={buddhaImg}
            alt="Đức Phật Thích Ca"
            loading="eager"
            className="h-full w-full object-cover object-top"
            onError={(e) => {
              // Ảnh lỗi → ẩn, giữ nền gradient trang nghiêm
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/30"
          />
        </div>

        {/* Trích Kinh Pháp Cú ngẫu nhiên */}
        <div className="px-5 pb-5 pt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            Kinh Pháp Cú — câu {verse.n}
          </p>
          <blockquote className="mt-2 border-l-4 border-primary/60 pl-3.5">
            <p className="readable-serif text-[15px] leading-[1.8] text-foreground/95">
              {verse.vi}
            </p>
            <p className="mt-2 text-[12px] italic leading-relaxed text-muted-foreground">
              «{verse.pali}»
            </p>
          </blockquote>
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
                <span className={`ds-tile h-[52px] w-[52px] ${item.tile}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-semibold leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* -------- Lưới chức năng còn lại (đồng bộ ô màu) -------- */}
      <section className="ds-card mb-4 px-3 py-5">
        <div className="grid grid-cols-4 gap-y-5 sm:grid-cols-4">
          {OTHER_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2 px-1 text-center transition active:scale-95"
              >
                <span className={`ds-tile h-[52px] w-[52px] ${item.tile}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

    </AppShell>
  );
}
