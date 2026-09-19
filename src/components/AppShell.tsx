import { DhammaWheel } from "@/components/DhammaWheel";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BookMarked,
  Bot,
  Calendar,
  Compass,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Scale,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";

/** Tab chính — bên trái, đúng thứ tự. */
const NAV = [
  { to: "/dashboard", label: "Pháp thoại", icon: LayoutDashboard },
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen },
  { to: "/vinaya", label: "Luật tạng", icon: Scale },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked },
  { to: "/calendar", label: "Lịch Phật giáo", icon: Calendar },
  { to: "/meditation", label: "Thiền", icon: Heart },
  { to: "/assistant", label: "Trợ lý Pháp AI", icon: Bot },
];

/** "Phòng" không nằm ở sidebar — vào từ trang chủ (Dashboard). */
const WATCH_ITEM = { to: "/watch", label: "Phòng", icon: MonitorPlay };

/** Mục phụ ở đáy sidebar: Hồ sơ + Cài đặt. */
const SETTINGS_ITEM = { to: "/settings", label: "Cài đặt", icon: Settings };
const PROFILE_ITEM = { to: "/profile", label: "Hồ sơ", icon: UserRound };

/** Danh sách đầy đủ để tra cứu an toàn cho bottom-nav. */
const ALL_ITEMS = [...NAV, PROFILE_ITEM, SETTINGS_ITEM];

/** Bottom-nav mobile: tra theo đường dẫn, bỏ qua mục không tồn tại. */
const BOTTOM_NAV_PATHS = [
  "/dashboard",
  "/suttas",
  "/assistant",
  "/profile",
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
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <button
        type="button"
        onClick={() => go("/dashboard")}
        className="flex items-center gap-3 px-5 py-5 text-left"
      >
        <DhammaWheel size={40} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Dhamma Stream</p>
          <p className="text-[11px] text-muted-foreground">
            Theravāda — Nguyên thủy
          </p>
        </div>
      </button>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Đáy sidebar: Cài đặt (trái) · Hồ sơ + Đăng xuất (phải, icon) */}
      <div className="flex items-center justify-between border-t border-border/60 p-3">
        <button
          type="button"
          onClick={() => go(SETTINGS_ITEM.to)}
          aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
          title="Cài đặt"
          aria-label="Cài đặt"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition",
            isActive(SETTINGS_ITEM.to)
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Cài đặt
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => go(PROFILE_ITEM.to)}
            aria-current={isActive(PROFILE_ITEM.to) ? "page" : undefined}
            title="Hồ sơ người dùng"
            aria-label="Hồ sơ người dùng"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition",
              isActive(PROFILE_ITEM.to)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <UserRound className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
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
          aria-label="Đóng menu"
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
            aria-label="Mở menu"
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
              <p className="truncate text-sm font-semibold leading-tight">
                Dhamma Stream
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {title}
              </p>
            </div>
          </button>
          {actions && <div className="flex shrink-0 items-center">{actions}</div>}
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
                <span className="truncate">{item.label.split(" ")[0]}</span>
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
