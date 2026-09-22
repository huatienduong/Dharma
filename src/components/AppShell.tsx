import { useSettings, type TranslateKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BookMarked,
  Bot,
  Calendar,
  Heart,
  History,
  LayoutDashboard,
  Menu,
  Scale,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";

/** Nhóm trái: nội dung học liệu. */
const NAV_LEFT: { to: string; tKey: TranslateKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", tKey: "navTalks", icon: LayoutDashboard },
  { to: "/suttas", tKey: "navSuttas", icon: BookOpen },
  { to: "/vinaya", tKey: "navVinaya", icon: Scale },
  { to: "/dictionary", tKey: "navDictionary", icon: BookMarked },
  { to: "/meditation", tKey: "navMeditation", icon: Heart },
];

/** Nhóm phải: Lịch Phật giáo ở cuối, cạnh Trợ lý Phật học. */
const NAV_RIGHT: { to: string; tKey: TranslateKey; icon: typeof Bot }[] = [
  { to: "/assistant", tKey: "navAssistant", icon: Bot },
  { to: "/calendar", tKey: "navCalendar", icon: Calendar },
];

const ASSISTANT_LABEL = "Trợ lý Phật học";

const SETTINGS_ITEM = {
  to: "/settings",
  tKey: "navSettings" as TranslateKey,
  icon: Settings,
};

const ALL_ITEMS = [...NAV_LEFT, ...NAV_RIGHT];

/** Viết in hoa nhãn tab sidebar kiểu YouTube (VI/EN đều ổn). */
function upperLabel(s: string) {
  return s.toUpperCase();
}

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true); // sidebar desktop thu gọn

  // Ảnh app chính thức — chủ app tải lên Convex Storage
  const logo = useQuery(anyApi.appLogo.get);

  const isActive = (to: string) =>
    to === "/dashboard"
      ? location.pathname === "/dashboard" || location.pathname === "/"
      : location.pathname.startsWith(to);

  // Đóng drawer khi điều hướng
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Khóa cuộn nền khi drawer mở — bấm nền mờ để đóng
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const go = (to: string) => navigate(to);

  /* ---------------------------------------------------------------- */
  /* Sidebar nội dung (dùng chung cho desktop + drawer mobile)         */
  /* Kiểu YouTube: mục dọc, icon trái, nhãn VIẾT IN HOA.               */
  /* ---------------------------------------------------------------- */

  const NavItem = ({ item }: { item: (typeof ALL_ITEMS)[number] }) => {
    const active = isActive(item.to);
    const Icon = item.icon;
    return (
      <button
        type="button"
        onClick={() => go(item.to)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-6 rounded-[10px] px-3 py-2.5 text-sm transition",
          active
            ? "bg-accent font-medium text-foreground"
            : "text-foreground/85 hover:bg-accent/70",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active ? "text-primary" : "text-foreground/70",
          )}
        />
        <span className="truncate tracking-wide">{upperLabel(t(item.tKey))}</span>
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
      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-1">
        <div className="space-y-0.5">
          {NAV_LEFT.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>

        <div className="mt-3 border-t border-border/60 pt-1">
          <SectionLabel>Khác</SectionLabel>
          <div className="space-y-0.5">
            {NAV_RIGHT.map((item) => (
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
      {/* HEADER — kiểu YouTube: cố định trên cùng                        */}
      {/* ============================================================ */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-border/60 bg-background px-3 sm:px-4">
        {/* Trái: hamburger */}
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent lg:hidden"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Hamburger desktop: thu gọn/mở rộng sidebar */}
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent lg:flex"
            aria-label="Thu gọn menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Giữa: LOGO ỨNG DỤNG CHÍNH THỨC (ảnh chủ app tải lên) */}
        <button
          type="button"
          onClick={() => go("/dashboard")}
          aria-label="Trang chủ Dharma"
          className="mx-auto flex min-w-0 items-center justify-center rounded-full px-2 py-1 transition hover:bg-accent"
        >
          {logo?.url ? (
            <img
              src={logo.url}
              alt="Dharma"
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              ☸
            </span>
          )}
        </button>

        {/* Phải: chỉ còn Cài đặt (Hồ sơ đã bỏ) */}
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => go(SETTINGS_ITEM.to)}
            aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
            title={t("navSettings")}
            aria-label={t("navSettings")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition",
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
      {/* SIDEBAR DESKTOP (≥lg) — danh sách dọc, thu gọn được            */}
      {/* ============================================================ */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-30 hidden flex-col overflow-y-auto border-r border-border/60 bg-background pb-4 pt-2 transition-[width] duration-200 lg:flex",
          railOpen ? "w-60 px-3" : "w-[4.5rem] items-center px-1.5",
        )}
      >
        {railOpen ? (
          sidebarContent
        ) : (
          <div className="flex flex-col items-center gap-1">
            {ALL_ITEMS.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => go(item.to)}
                  title={t(item.tKey)}
                  aria-label={t(item.tKey)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-16 flex-col items-center gap-1 rounded-[10px] px-1 py-4 text-[10px] leading-tight transition",
                    active
                      ? "bg-accent font-medium text-foreground"
                      : "text-foreground/80 hover:bg-accent/70",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-primary" : "text-foreground/70",
                    )}
                  />
                  <span className="w-full truncate text-center">
                    {upperLabel(t(item.tKey))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* ============================================================ */}
      {/* DRAWER MOBILE (<lg) — bấm nền mờ để đóng                       */}
      {/* ============================================================ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[85vw] flex-col border-r border-border/70 bg-background shadow-2xl transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Đầu drawer: logo ứng dụng + đóng */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
            aria-label="Đóng menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {logo?.url && (
            <img
              src={logo.url}
              alt="Dharma"
              className="h-9 w-9 rounded-full object-cover"
            />
          )}
        </div>
        {sidebarContent}
      </aside>

      {/* ============================================================ */}
      {/* NỘI DUNG — lề trái theo trạng thái sidebar                     */}
      {/* ============================================================ */}
      <div
        className={cn(
          "pt-14 transition-[padding] duration-200",
          railOpen ? "lg:pl-60" : "lg:pl-[4.5rem]",
        )}
      >
        <main className="mx-auto w-full max-w-6xl px-3 pb-24 pt-3 sm:px-5 lg:pb-16 lg:pt-5">
          {/* Tiêu đề trang — ẩn khi trang tự vẽ khu vực đầu riêng */}
          {!hideTitle && (
            <div className="mb-4 hidden items-end justify-between gap-3 lg:flex">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight">
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
      {/* BOTTOM NAV MOBILE (<lg)                                        */}
      {/* ============================================================ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {[NAV_LEFT[0], NAV_LEFT[1], NAV_RIGHT[0], NAV_RIGHT[1]].map((item) => {
            if (!item) return null;
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center leading-tight">
                  {upperLabel(t(item.tKey))}
                </span>
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
