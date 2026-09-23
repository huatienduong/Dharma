import { useSettings, type TranslateKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BookMarked,
  BookOpen,
  Bot,
  CalendarDays,
  Flower2,
  Globe2,
  History as HistoryIcon,
  Home as HomeIcon,
  Hourglass,
  Layers,
  Library,
  Menu,
  MoreHorizontal,
  Music,
  Newspaper,
  Scale,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { cacheLogoClientSide } from "@/lib/appLogoCache";

/** Nhóm trái: nội dung học liệu (sidebar desktop + drawer). */
const NAV_LEFT: { to: string; tKey: TranslateKey; icon: typeof BookOpen }[] = [
  { to: "/home", tKey: "navHome", icon: HomeIcon },
  { to: "/dashboard", tKey: "navTalks", icon: Library },
  { to: "/suttas", tKey: "navSuttas", icon: BookOpen },
  { to: "/vinaya", tKey: "navVinaya", icon: Scale },
  { to: "/abhidhamma", tKey: "navAbhidhamma", icon: Layers },
  { to: "/dictionary", tKey: "navDictionary", icon: BookMarked },
  { to: "/meditation", tKey: "navMeditation", icon: Flower2 },
  { to: "/listen", tKey: "navMeditation" as TranslateKey, icon: Music },
];

/** Nhóm phải: Tra cứu — Tin tức — Lịch sử — Lịch Phật giáo — Trợ lý Phật học. */
const NAV_RIGHT: { to: string; tKey: TranslateKey; icon: typeof Globe2 }[] = [
  { to: "/lookup", tKey: "navLookup", icon: Globe2 },
  { to: "/news", tKey: "navNews", icon: Newspaper },
  { to: "/history", tKey: "navBuddhistHistory", icon: HistoryIcon },
  { to: "/calendar", tKey: "navCalendar", icon: CalendarDays },
  { to: "/assistant", tKey: "navAssistant", icon: Bot },
];

/** Nhóm cuối: LỊCH SỬ XEM lưu dữ liệu xem video của người dùng. */
const NAV_BOTTOM: { to: string; tKey: TranslateKey; icon: typeof Hourglass }[] = [
  { to: "/watched", tKey: "navWatched", icon: Hourglass },
];

const SETTINGS_ITEM = {
  to: "/settings",
  tKey: "navSettings" as TranslateKey,
  icon: Settings,
};

const ALL_ITEMS = [...NAV_LEFT, ...NAV_RIGHT, ...NAV_BOTTOM];

/**
 * 5 TAB DƯỚI CHÍNH THỨC:
 * Trang chủ · Kinh điển · Thiền tập · Nghe · Thêm
 * "Thêm" mở drawer chứa các mục còn lại.
 */
const BOTTOM_TABS: { to: string; label: string; icon: typeof BookOpen }[] = [
  { to: "/home", label: "Trang chủ", icon: HomeIcon },
  { to: "/suttas", label: "Kinh điển", icon: BookOpen },
  { to: "/meditation", label: "Thiền tập", icon: Flower2 },
  { to: "/listen", label: "Nghe", icon: Music },
  { to: "MORE", label: "Thêm", icon: MoreHorizontal },
];

export function AppShell({
  title,
  subtitle,
  actions,
  hideTitle,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Ẩn tiêu đề trang (trang tự vẽ khu vực đầu riêng, vd Trợ lý Phật học) */
  hideTitle?: boolean;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useSettings();
  const [moreOpen, setMoreOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  // Ảnh app chính thức — chủ app tải lên Convex Storage.
  const logo = useQuery(anyApi.appLogo.get);
  useEffect(() => {
    if (logo?.url) cacheLogoClientSide(logo.url);
  }, [logo?.url]);

  const isActive = (to: string) =>
    to === "/home"
      ? location.pathname === "/home" || location.pathname === "/"
      : location.pathname.startsWith(to);

  // Đóng "Thêm" khi điều hướng
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Khóa cuộn nền khi drawer mở
  useEffect(() => {
    if (!moreOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const go = (to: string) => navigate(to);

  /* ---------------- Sidebar nội dung (desktop + drawer "Thêm") --------------- */

  const NavItem = ({ item }: { item: (typeof ALL_ITEMS)[number] }) => {
    const active = isActive(item.to);
    const Icon = item.icon;
    const label =
      item.to === "/listen" ? "Nghe" : t(item.tKey);
    return (
      <button
        type="button"
        onClick={() => go(item.to)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-sm transition",
          active
            ? "bg-secondary font-semibold text-foreground"
            : "text-foreground/80 hover:bg-accent",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-gold",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="truncate tracking-wide">{label}</span>
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-6 pt-1">
        <div className="space-y-1">
          {NAV_LEFT.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>

        <div className="mt-3 border-t border-border/60 pt-1">
          <SectionLabel>Khác</SectionLabel>
          <div className="space-y-1">
            {NAV_RIGHT.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </div>
          <div className="space-y-1 pt-1">
            {NAV_BOTTOM.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-border/60 p-3" />
    </>
  );

  return (
    <div className="fb-bg min-h-screen">
      {/* ============================================================ */}
      {/* HEADER — MENU TRÁI · LOGO GIỮA · CÀI ĐẶT PHẢI                   */}
      {/* ============================================================ */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center bg-background/95 px-3 shadow-[0_1px_0_rgba(63,50,33,0.06)] backdrop-blur sm:px-4">
        {/* Trái: nút menu (mobile mở drawer "Thêm" / desktop thu gọn sidebar) */}
        <div className="flex w-24 shrink-0 items-center justify-start">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth >= 1024) setRailOpen((v) => !v);
              else setMoreOpen(true);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Giữa: LOGO — vị trí trung tâm */}
        <button
          type="button"
          onClick={() => go("/home")}
          aria-label="Trang chủ Dharma"
          className="mx-auto flex flex-col items-center justify-center leading-none"
        >
          {logo?.url ? (
            <img
              src={logo.url}
              alt="Dharma"
              className="h-8 w-8 shrink-0 rounded-full object-cover shadow-sm"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
            >
              ☸
            </span>
          )}
          <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.24em] text-foreground">
            DHARMA
          </span>
        </button>

        {/* Phải: DUY NHẤT Cài đặt (đã xóa menu cạnh cài đặt) */}
        <div className="flex w-24 shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={() => go(SETTINGS_ITEM.to)}
            aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
            title={t("navSettings")}
            aria-label={t("navSettings")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              isActive(SETTINGS_ITEM.to)
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent",
            )}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* SIDEBAR DESKTOP (≥lg)                                           */}
      {/* ============================================================ */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-30 hidden flex-col overflow-y-auto pb-4 pt-3 transition-[width] duration-200 lg:flex",
          railOpen ? "w-64 px-3" : "w-[4.75rem] items-center px-1.5",
        )}
      >
        {railOpen ? (
          sidebarContent
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            {ALL_ITEMS.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              const label = item.to === "/listen" ? "Nghe" : t(item.tKey);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[10px] leading-tight transition",
                    active
                      ? "bg-secondary font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-gold",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="w-full truncate text-center">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* ============================================================ */}
      {/* DRAWER "THÊM" MOBILE (<lg) — đầy đủ mọi mục                     */}
      {/* ============================================================ */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[85vw] flex-col bg-background shadow-2xl transition-transform duration-300 lg:hidden",
          moreOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!moreOpen}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          {logo?.url ? (
            <img
              src={logo.url}
              alt="Dharma"
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              ☸
            </span>
          )}
          <span className="truncate text-[15px] font-extrabold tracking-tight text-foreground">
            DHARMA
          </span>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* ============================================================ */}
      {/* NỘI DUNG                                                       */}
      {/* ============================================================ */}
      <div
        className={cn(
          "pt-14 transition-[padding] duration-200",
          railOpen ? "lg:pl-64" : "lg:pl-[4.75rem]",
        )}
      >
        <main className="mx-auto w-full max-w-6xl px-3 pb-32 pt-4 sm:px-5 lg:pb-16 lg:pt-6">
          {!hideTitle && (
            <div className="mb-4 hidden items-end justify-between gap-3 lg:flex">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">{actions}</div>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM NAV — 5 tab chính thức                                   */}
      {/* ============================================================ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {BOTTOM_TABS.map((tab) => {
            const isMore = tab.to === "MORE";
            const active = !isMore && isActive(tab.to);
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => (isMore ? setMoreOpen(true) : go(tab.to))}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px]",
                    active && "drop-shadow-[0_2px_6px_rgba(166,124,46,0.4)]",
                  )}
                />
                <span className="leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function ShellBackButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="gap-1.5"
    >
      ← Quay lại
    </Button>
  );
}
