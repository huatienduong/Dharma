import { DhammaWheel } from "@/components/DhammaWheel";
import { useSettings, type TranslateKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  BookMarked,
  Bot,
  Calendar,
  Compass,
  Heart,
  History,
  LayoutDashboard,
  Menu,
  MonitorPlay,
  Scale,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";

/** Tab chính. */
const NAV: { to: string; tKey: TranslateKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", tKey: "navTalks", icon: LayoutDashboard },
  { to: "/suttas", tKey: "navSuttas", icon: BookOpen },
  { to: "/watch", tKey: "room", icon: MonitorPlay },
  { to: "/assistant", tKey: "navAssistant", icon: Bot },
  { to: "/calendar", tKey: "navCalendar", icon: Calendar },
  { to: "/meditation", tKey: "navMeditation", icon: Heart },
];

/** Nhóm học liệu mở rộng. */
const NAV_LIB: { to: string; tKey: TranslateKey; icon: typeof Scale }[] = [
  { to: "/vinaya", tKey: "navVinaya", icon: Scale },
  { to: "/dictionary", tKey: "navDictionary", icon: BookMarked },
  { to: "/watched", tKey: "watched", icon: History },
];

const SETTINGS_ITEM = { to: "/settings", tKey: "navSettings" as TranslateKey, icon: Settings };

const ALL_ITEMS = [...NAV, ...NAV_LIB, SETTINGS_ITEM];

const BOTTOM_NAV_PATHS = [
  "/dashboard",
  "/suttas",
  "/watch",
  "/assistant",
  "/settings",
];
const BOTTOM_NAV = BOTTOM_NAV_PATHS.map((to) =>
  ALL_ITEMS.find((n) => n.to === to),
).filter((n): n is (typeof ALL_ITEMS)[number] => Boolean(n));

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Ngừng dùng: khu vực nút cũ — các nút chính đã vào sidebar */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const PROFILE_ITEM = { to: "/profile", icon: UserRound, label: "Hồ sơ" };

  const isActive = (to: string) =>
    to === "/dashboard"
      ? location.pathname === "/dashboard" || location.pathname === "/"
      : location.pathname.startsWith(to);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const go = (to: string) => navigate(to);

  /* ---------------------------------------------------------------- */
  /* Header đậm gradient kiểu app ngân hàng (dùng chung sidebar+mobile) */
  /* ---------------------------------------------------------------- */

  const brandHeader = (
    <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary via-primary to-primary/85 px-4 py-3.5 text-primary-foreground">
      <button
        type="button"
        onClick={() => go("/dashboard")}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-foreground/15">
          <DhammaWheel size={38} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-extrabold uppercase leading-tight tracking-wider">
            DHARMA
          </p>
          <p className="truncate text-[11px] font-medium text-primary-foreground/80">
            Giới · Định · Tuệ
          </p>
        </div>
      </button>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Sidebar nội dung                                                  */
  /* ---------------------------------------------------------------- */

  const sidebarContent = (
    <>
      {brandHeader}

      {/* Cài đặt + Hồ sơ — hàng icon dưới header */}
      <div className="flex items-center justify-end gap-1.5 border-b border-border/50 bg-card/50 px-3 py-2">
        <button
          type="button"
          onClick={() => go(PROFILE_ITEM.to)}
          aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
          title={PROFILE_ITEM.label}
          aria-label={PROFILE_ITEM.label}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition",
            isActive(PROFILE_ITEM.to)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <UserRound className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(SETTINGS_ITEM.to)}
          aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
          title={t("navSettings")}
          aria-label={t("navSettings")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition",
            isActive(SETTINGS_ITEM.to)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {/* Nhóm chính: icon tròn nhạt nền kiểu app ngân hàng */}
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/85 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{t(item.tKey)}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Nhóm học liệu */}
        <div className="mt-4 border-t border-border/40 pt-3">
          {NAV_LIB.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{t(item.tKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Chân sidebar: phiên bản gọn như app ngân hàng */}
      <div className="border-t border-border/50 px-4 py-2.5">
        <p className="text-[10px] text-muted-foreground">
          Dharma · Phiên bản mới nhất
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ---------- Sidebar desktop (≥lg) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/60 bg-card/40 backdrop-blur lg:flex">
        {sidebarContent}
      </aside>

      {/* ---------- Drawer mobile ---------- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[85vw] flex-col border-r border-border/60 bg-card shadow-2xl transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground/80 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label={t("closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* ---------- Header mobile ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 lg:hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary via-primary to-primary/85 px-3 py-3 text-primary-foreground">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-primary-foreground/10"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go("/dashboard")}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-foreground/15">
              <DhammaWheel size={30} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold uppercase leading-tight tracking-wider">
                DHARMA
              </p>
              <p className="truncate text-[10px] font-medium text-primary-foreground/80">
                Giới · Định · Tuệ
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => go(PROFILE_ITEM.to)}
            aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
            title={PROFILE_ITEM.label}
            aria-label={PROFILE_ITEM.label}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-primary-foreground/10",
              isActive(PROFILE_ITEM.to) && "bg-primary-foreground/15",
            )}
          >
            <UserRound className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => go(SETTINGS_ITEM.to)}
            aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
            title={t("navSettings")}
            aria-label={t("navSettings")}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-primary-foreground/10",
              isActive(SETTINGS_ITEM.to) && "bg-primary-foreground/15",
            )}
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* ---------- Nội dung ---------- */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 sm:px-6 lg:pb-16 lg:pt-6">
          {/* Tiêu đề trang desktop */}
          <div className="mb-5 hidden items-end justify-between gap-3 lg:flex">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Compass className="h-5 w-5 shrink-0 text-primary" />
                <span className="truncate">{title}</span>
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* ---------- Bottom nav mobile ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
          {BOTTOM_NAV.map((item) => {
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
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition",
                    active && "bg-primary/10",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
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

export function ShellBackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
    >
      ← Quay lại
    </button>
  );
}
