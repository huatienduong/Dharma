import { AppShell } from "@/components/AppShell";
import { DockPlayer, usePlayer } from "@/lib/player";
import { restoreScroll, trackScroll } from "@/lib/uiState";
import {
  loadLocalSession,
  loadLocalSuttaProgress,
  type LocalSession,
} from "@/lib/localProgress";
import { getSutta } from "@/data/suttas";
import { APP_VERSION } from "@/lib/version";
import {
  BookOpen,
  BookMarked,
  CalendarDays,
  ChevronRight,
  Flower2,
  Globe2,
  History,
  Hourglass,
  Layers,
  MessagesSquare,
  MonitorPlay,
  Newspaper,
  Play,
  Scale,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

/* ---------------- Lưới chức năng kiểu app dịch vụ ---------------- */

const QUICK_ITEMS: {
  to: string;
  label: string;
  icon: typeof BookOpen;
  tile: string; // màu ô icon
}[] = [
  { to: "/dashboard", label: "Pháp thoại", icon: MonitorPlay, tile: "bg-orange-500" },
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen, tile: "bg-green-500" },
  { to: "/meditation", label: "Thiền định", icon: Flower2, tile: "bg-amber-500" },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked, tile: "bg-emerald-500" },
  { to: "/vinaya", label: "Luật tạng", icon: Scale, tile: "bg-yellow-500" },
  { to: "/abhidhamma", label: "Luận tạng", icon: Layers, tile: "bg-teal-500" },
  { to: "/calendar", label: "Lịch Phật giáo", icon: CalendarDays, tile: "bg-blue-500" },
  { to: "/lookup", label: "Tra cứu", icon: Globe2, tile: "bg-indigo-500" },
];

const EXTRA_ROW: { to: string; label: string; icon: typeof Newspaper }[] = [
  { to: "/news", label: "Tin tức", icon: Newspaper },
  { to: "/history", label: "Lịch sử Phật giáo", icon: Hourglass },
  { to: "/watched", label: "Lịch sử xem", icon: History },
];

/* ----------------------- Trang chủ ----------------------- */

export default function Home() {
  const navigate = useNavigate();
  const { play } = usePlayer();
  const [query, setQuery] = useState("");

  /* Tiến trình cục bộ: phiên xem dở + kinh đang đọc dở */
  const [session, setSession] = useState<LocalSession | null>(null);
  const [readingSutta, setReadingSutta] = useState<{
    id: string;
    title: string;
    percent: number;
  } | null>(null);

  useEffect(() => {
    const stop = trackScroll("home");
    return () => stop();
  }, []);
  useEffect(() => {
    restoreScroll("home");
    // Nạp tiến trình sau khi mount (localStorage — tránh lệch SSR)
    setSession(loadLocalSession());
    const rows = loadLocalSuttaProgress()
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((r) => r.percent > 0 && r.percent < 100);
    const top = rows[0];
    if (top) {
      const s = getSutta(top.docId);
      if (s) {
        setReadingSutta({ id: s.id, title: s.title, percent: top.percent });
        return;
      }
    }
    setReadingSutta(null);
  }, []);

  const submitSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    navigate(`/suttas?q=${encodeURIComponent(q)}`);
  }, [query, navigate]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Chào buổi sáng";
    if (h < 14) return "Chào buổi trưa";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  return (
    <AppShell title="Trang chủ" hideTitle>
      {session && (
        <div className="-mx-3 mb-4 bg-background px-3 sm:-mx-5 sm:px-5">
          <DockPlayer />
        </div>
      )}

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

      {/* ---------------- Thẻ chào mừng ---------------- */}
      <section className="ds-card relative mb-5 overflow-hidden px-5 py-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 text-[7rem] leading-none text-primary/10"
        >
          ☸
        </span>
        <p className="text-[13px] font-medium text-muted-foreground">
          {greeting} 🙏
        </p>
        <h1 className="mt-1 text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">
          Học Phật pháp mỗi ngày
          <br className="hidden sm:block" /> theo truyền thống Theravāda
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/meditation")}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Flower2 className="h-4 w-4" /> Thiền ngay
          </button>
          <button
            type="button"
            onClick={() => navigate("/assistant")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground transition hover:bg-accent active:scale-[0.98]"
          >
            <MessagesSquare className="h-4 w-4" /> Hỏi Trợ lý
          </button>
        </div>
      </section>

      {/* ---------------- Lưới chức năng 8 mục ---------------- */}
      <section className="ds-card mb-6 px-3 py-5">
        <div className="grid grid-cols-4 gap-y-5">
          {QUICK_ITEMS.map((item) => {
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
        <div className="mx-1 mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
          {EXTRA_ROW.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/70 px-2 py-2.5 text-[11px] font-medium text-foreground/80 transition hover:bg-accent active:scale-[0.98]"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------- Tiến trình của tôi ---------------- */}
      {(session || readingSutta) && (
        <section className="mb-7">
          <h2 className="mb-2.5 text-lg font-extrabold tracking-tight">
            Tiến trình của tôi
          </h2>
          <div className="ds-card p-4">
            {session && (
              <button
                type="button"
                onClick={() =>
                  // Trình phát tự khôi phục đúng đoạn đang xem dở (localStorage)
                  void play({
                    _id: session.youtubeId,
                    youtubeId: session.youtubeId,
                    title: session.title,
                    teacher: session.teacher,
                    channelName: session.channelName,
                    publishedAt: session.publishedAt,
                    durationSec: session.durationSec,
                  })
                }
                className="flex w-full items-center gap-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Play className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {session.title || "Video đang xem dở"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Xem dở — bấm để tiếp tục
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
            {session && readingSutta && (
              <div className="my-3 border-t border-border/60" />
            )}
            {readingSutta && (
              <button
                type="button"
                onClick={() => navigate(`/suttas/${readingSutta.id}`)}
                className="flex w-full items-center gap-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {readingSutta.title}
                  </span>
                  <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-green-500"
                      style={{ width: `${readingSutta.percent}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {readingSutta.percent}%
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ---------------- Chân trang: nhà phát triển ---------------- */}
      <footer className="mt-4 pb-4 pt-2 text-center">
        <span
          aria-hidden
          className="mb-2 block text-2xl text-primary/40"
        >
          ☸
        </span>
        <p className="text-[13px] font-semibold text-foreground/85">
          Dharma · Phiên bản {APP_VERSION}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Biên soạn bởi nhà phát triển{" "}
          <span className="font-medium text-foreground/80">
            Hứa Tiến Dương
          </span>
        </p>
        <a
          href="https://facebook.com/huatienduong.official"
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-medium text-foreground/85 transition hover:border-primary/40 hover:bg-accent"
          aria-label="Liên hệ nhà phát triển qua Facebook"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#1877F2]" aria-hidden>
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          Liên hệ Facebook
        </a>
      </footer>
    </AppShell>
  );
}
