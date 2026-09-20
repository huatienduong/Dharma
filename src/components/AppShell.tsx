import { DhammaWheel } from "@/components/DhammaWheel";
import { useSettings, type TranslateKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

/** Tab chính — Lịch Phật giáo NGAY CẠNH Trợ lý Phật học. */
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

/** Cài đặt — một nơi duy nhất (đỉnh sidebar); Hồ sơ đã loại bỏ khỏi nav. */
const SETTINGS_ITEM = { to: "/settings", tKey: "navSettings" as TranslateKey, icon: Settings };

/** Danh sách đầy đủ để tra cứu an toàn cho bottom-nav. */
const ALL_ITEMS = [...NAV, ...NAV_LIB, SETTINGS_ITEM];

/** Bottom-nav mobile: tra theo đường dẫn, bỏ qua mục không tồn tại. */
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

  // Đóng drawer khi điều hướng
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Escape đóng drawer + khóa cuộn nền khi drawer mở
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
  /* Sidebar nội dung (dùng chung cho desktop + drawer mobile)         */
  /* ---------------------------------------------------------------- */

  const sidebarContent = (
    <>
      <div className="flex items-center gap-1.5 px-4 py-4">
        <button
          type="button"
          onClick={() => go("/dashboard")}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >            <DhammaWheel size={40} />
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide leading-tight">DHARMA</p>
            </div>
        </button>
        {/* Hồ sơ + Cài đặt — ICON BÊN PHẢI (không còn Đăng xuất) */}
        <button
          type="button"
          onClick={() => go(PROFILE_ITEM.to)}
          aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
          title={PROFILE_ITEM.label}
          aria-label={PROFILE_ITEM.label}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
            isActive(SETTINGS_ITEM.to)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* Nhóm chính: Pháp thoại · Học Kinh · Phòng · Trợ lý Pháp AI · Thiền */}
        <div className="space-y-1">
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
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(item.tKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Nhóm học liệu: Luật tạng · Từ điển · Lịch Phật giáo */}
        <div className="mt-3 border-t border-border/40 pt-3">
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
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(item.tKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Đáy sidebar: giữ đơn giản — không còn khối thông tin liên hệ */}
      <div className="border-t border-border/60 p-3" />
    </>
  );

  return (
    <div className="lotus-bg min-h-screen">
      {/* ---------- Sidebar desktop (≥lg) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur lg:flex">
        {sidebarContent}
      </aside>

      {/* ---------- Drawer mobile (<lg) ---------- */}
      {/* Nền mờ */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      {/* Panel trượt */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[85vw] flex-col border-r border-border/60 bg-sidebar shadow-2xl transition-transform duration-300 lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          aria-label={t("closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* ---------- Header mobile (<lg) ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition hover:bg-accent"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go("/dashboard")}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <DhammaWheel size={30} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase tracking-wide leading-tight">
                DHARMA
              </p>
            </div>
          </button>
          {/* Mobile header: Hồ sơ + Cài đặt — ICON BÊN PHẢI */}
          <button
            type="button"
            onClick={() => go(PROFILE_ITEM.to)}
            aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
            title={PROFILE_ITEM.label}
            aria-label={PROFILE_ITEM.label}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
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
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
              isActive(SETTINGS_ITEM.to)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ---------- Nội dung ---------- */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5 sm:px-6 lg:pb-16 lg:pt-8">
          {/* Tiêu đề trang desktop (mobile đã có trong header) */}
          <div className="mb-6 hidden items-end justify-between gap-3 lg:flex">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Compass className="h-5 w-5 shrink-0 text-gold" />
                <span className="truncate">{title}</span>
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {/* Khu actions desktop giữ chỗ trống (Cài đặt/Hồ sơ đã ở sidebar) */}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* ---------- Bottom nav mobile (<lg) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
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
