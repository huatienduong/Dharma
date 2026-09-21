import { useSettings, type TranslateKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  BookMarked,
  Bot,
  Calendar,
  Heart,
  History,
  LayoutDashboard,
  Menu,
  MonitorPlay,
  Scale,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";

/** Tab chính — Lịch Phật giáo ngay cạnh Trợ lý Phật học. */
const NAV: { to: string; tKey: TranslateKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", tKey: "navTalks", icon: LayoutDashboard },
  { to: "/suttas", tKey: "navSuttas", icon: BookOpen },
  { to: "/watch", tKey: "room", icon: MonitorPlay },
  { to: "/assistant", tKey: "navAssistant", icon: Bot },
  { to: "/calendar", tKey: "navCalendar", icon: Calendar },
  { to: "/meditation", tKey: "navMeditation", icon: Heart },
];

/** Nhóm học liệu mở rộng (dưới nhóm chính). */
const NAV_LIB: { to: string; tKey: TranslateKey; icon: typeof Scale }[] = [
  { to: "/vinaya", tKey: "navVinaya", icon: Scale },
  { to: "/dictionary", tKey: "navDictionary", icon: BookMarked },
  { to: "/watched", tKey: "watched", icon: History },
];

/** Cài đặt/Hồ sơ — chỉ dùng cho icon góc phải (header), không có trong sidebar. */
const SETTINGS_ITEM = {
  to: "/settings",
  tKey: "navSettings" as TranslateKey,
  icon: Settings,
};

const PROFILE_ITEM = { to: "/profile", label: "Hồ sơ", icon: UserRound };

/** Danh sách đầy đủ để tra cứu an toàn cho drawer mobile. */
const ALL_ITEMS = [...NAV, ...NAV_LIB];

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
  /* Kiểu YouTube: mục dọc, icon trái, nhãn nhóm PHẦN TRÊN.            */
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
        <span className="truncate">{t(item.tKey)}</span>
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="px-3 pb-1 pt-4 text-[15px] font-semibold tracking-tight text-foreground">
      {children}
    </p>
  );

  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-1">
        <div className="space-y-0.5">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>

        <div className="mt-3 border-t border-border/60 pt-1">
          <SectionLabel>Học liệu</SectionLabel>
          <div className="space-y-0.5">
            {NAV_LIB.map((item) => (
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
      {/* HEADER — kiểu YouTube: cố định trên cùng, tìm kiếm ở giữa      */}
      {/* ============================================================ */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-background px-3 sm:px-4">
        {/* Trái: hamburger + wordmark (KHÔNG logo) */}
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
          <button
            type="button"
            onClick={() => go("/dashboard")}
            className="flex min-w-0 items-center gap-0 rounded-full px-1.5 py-1 transition hover:bg-accent"
          >
            <span className="truncate text-[19px] font-bold uppercase tracking-tight text-foreground">
              Dharma
            </span>
            <span className="ml-1 hidden text-[10px] font-medium uppercase tracking-widest text-gold sm:inline">
              Theravāda
            </span>
          </button>
        </div>

        {/* Giữa: wordmark cân đối (ô tìm kiếm nằm trong từng trang, đồng bộ) */}
        <div className="flex min-w-0 flex-1 justify-center" />

        {/* Phải: Hồ sơ + Cài đặt */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(PROFILE_ITEM.to)}
            aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
            title={PROFILE_ITEM.label}
            aria-label={PROFILE_ITEM.label}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition",
              isActive(PROFILE_ITEM.to)
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent",
            )}
          >
            <UserRound className="h-5 w-5" />
          </button>
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

      {/* Thanh mảnh dưới header (đường kẻ kiểu YouTube) */}
      <div className="fixed inset-x-0 top-14 z-40 h-px bg-border/60" />

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
            {[...NAV, ...NAV_LIB].map((item) => {
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
                    {t(item.tKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* ============================================================ */}
      {/* DRAWER MOBILE (<lg) — bấm nền mờ để đóng                      */}
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
        {/* Đầu drawer: wordmark + đóng */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
            aria-label="Đóng menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[19px] font-bold uppercase tracking-tight">
            Dharma
          </span>
        </div>
        {sidebarContent}
      </aside>

      {/* ============================================================ */}
      {/* NỘI DUNG — lề trái theo trạng thái sidebar                    */}
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
      {/* BOTTOM NAV MOBILE (<lg) — 4 mục chính                         */}
      {/* ============================================================ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {[
            NAV[0],
            NAV[1],
            NAV[2],
            NAV[3],
          ].map((item) => {
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
                  {t(item.tKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { Button } from "@/components/ui/button";

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
