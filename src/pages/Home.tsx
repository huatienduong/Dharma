import { AppShell } from "@/components/AppShell";
import { DockPlayer } from "@/lib/player";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import {
  BookOpen,
  CalendarDays,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  Library,
  MonitorPlay,
  Music,
  Newspaper,
  Scale,
  Settings,
  Search,
  User,
  HandHeart,
  BookMarked,
  ChevronRight,
  Play,
} from "lucide-react";
import { DHAMMAPADA, type DhpVerse } from "@/data/dhammapada";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* 8 ô chức năng chính thức (kiểu mẫu) */
const MAIN_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { to: "/suttas", label: "Kinh điển\nTheravāda", icon: BookOpen },
  { to: "/assistant", label: "Pháp âm\n(Nghe)", icon: Music },
  { to: "/meditation", label: "Thiền tập", icon: Flower2 },
  { to: "/dictionary", label: "Hướng dẫn\nthực hành", icon: BookMarked },
  { to: "/calendar", label: "Lịch tu học", icon: CalendarDays },
  { to: "/lookup", label: "Từ thiện\n& Cộng đồng", icon: HandHeart },
  { to: "/settings", label: "Cài đặt", icon: Settings },
  { to: "/watched", label: "Hồ sơ", icon: User },
];

/* Mục phụ (thẻ nhỏ dưới banner) */
const EXTRA_ITEMS: { to: string; label: string; icon: typeof Library }[] = [
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay },
  { to: "/vinaya", label: "Luật tạng", icon: Scale },
  { to: "/abhidhamma", label: "Luận tạng", icon: Layers },
  { to: "/news", label: "Tin tức", icon: Newspaper },
  { to: "/history", label: "Lịch sử PG", icon: Hourglass },
  { to: "/watched", label: "Lịch sử xem", icon: History },
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

      {/* ---------------- Tìm kiếm pill ---------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="mb-4"
        role="search"
      >
        <div className="flex h-12 items-center gap-3 rounded-full bg-card px-4 shadow-[0_1px_2px_rgba(63,50,33,0.04),0_6px_20px_rgba(63,50,33,0.06)] transition focus-within:ring-2 focus-within:ring-primary/30">
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

      {/* ---------------- HERO: ảnh Phật + logo + tagline ---------------- */}
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
          {/* Lớp phủ vàng đồng nhạt cho chữ nổi rõ */}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#3f3221]/70 via-[#3f3221]/35 to-transparent"
          />
          <div className="absolute inset-0 flex flex-col items-start justify-center px-6">
            <span aria-hidden className="text-3xl text-gold drop-shadow">
              ☸
            </span>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
              Dharma
            </p>
            <p className="mt-1 text-[13px] font-medium text-white/90 drop-shadow">
              Hiểu Phật Pháp · Sống An Lạc
            </p>
          </div>
        </div>

        {/* Thẻ trích danh ngôn nổi lên trên hero */}
        <div className="relative -mt-10 px-4 pb-4">
          <div className="rounded-3xl bg-card/95 px-5 py-5 text-center shadow-[0_8px_28px_rgba(63,50,33,0.14)] backdrop-blur">
            <span aria-hidden className="flex items-center justify-center gap-3 text-gold">
              <span className="h-px w-10 bg-gold/40" />
              <span className="text-lg">🪷</span>
              <span className="h-px w-10 bg-gold/40" />
            </span>
            <blockquote className="mt-2.5">
              <p className="readable-serif text-[15px] leading-[1.85] text-foreground/95">
                “{verse.vi}”
              </p>
              <footer className="mt-2.5 text-xs font-medium text-muted-foreground">
                — Đức Phật Thích Ca Mâu Ni —
              </footer>
            </blockquote>
            <p className="mt-3 line-clamp-2 text-[11px] italic leading-relaxed text-muted-foreground/80">
              «{verse.pali}»
            </p>
          </div>
        </div>
      </section>

      {/* -------- Lưới 8 ô chức năng chính thức -------- */}
      <section className="ds-card mb-4 px-3 py-6">
        <div className="grid grid-cols-3 gap-y-6 sm:grid-cols-4">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to + item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-2.5 px-1 text-center transition active:scale-95"
              >
                <span className="ds-tile h-[58px] w-[58px] shadow-[0_2px_8px_rgba(63,50,33,0.08)] transition group-hover:shadow-md">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-foreground/90">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* -------- Banner "Sống chánh niệm là sống tự do" -------- */}
      <button
        type="button"
        onClick={() => navigate("/meditation")}
        className="group relative mb-6 block w-full overflow-hidden rounded-[1.75rem] text-left shadow-[0_6px_24px_rgba(63,50,33,0.18)] transition active:scale-[0.99]"
      >
        <div className="relative flex items-center justify-between bg-gradient-to-r from-[#8a6420] via-[#a67c2e] to-[#c49a4a] px-6 py-6">
          <span className="pointer-events-none absolute -right-4 -top-8 text-[6.5rem] leading-none text-white/10">
            ☸
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-snug text-white drop-shadow-sm">
              Sống chánh niệm
            </span>
            <span className="block text-lg font-bold leading-snug text-white/95 drop-shadow-sm">
              là sống tự do
            </span>
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition group-hover:bg-white/30">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </button>

      {/* -------- Pháp thoại hôm nay + các mục phụ -------- */}
      <section className="ds-card mb-4 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
            <span className="text-gold">☸</span> Pháp thoại hôm nay
          </h2>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex w-full items-center gap-3.5 rounded-2xl bg-secondary/60 p-3 text-left transition hover:bg-secondary active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 text-gold">
            <Play className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              Bài Pháp: Tứ Niệm Xứ
            </span>
            <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              Kho pháp thoại Theravāda
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                <Play className="h-2.5 w-2.5" /> Nghe
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {/* Các mục phụ — thẻ nhỏ đồng bộ */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {EXTRA_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-secondary/50 px-1 py-3 text-center transition hover:bg-secondary active:scale-[0.98]"
              >
                <Icon className="h-[18px] w-[18px] text-gold" strokeWidth={1.8} />
                <span className="text-[10px] font-medium leading-tight text-foreground/80">
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
