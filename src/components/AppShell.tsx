import { DhammaWheel } from "@/components/DhammaWheel";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  BookMarked,
  Calendar,
  Compass,
  Heart,
  LayoutDashboard,
  LogOut,
  Scale,
  Settings,
  UserRound,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";

const NAV = [
  { to: "/dashboard", label: "Pháp thoại", icon: LayoutDashboard },
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen },
  { to: "/vinaya", label: "Luật tạng", icon: Scale },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked },
  { to: "/calendar", label: "Lịch Phật giáo", icon: Calendar },
  { to: "/meditation", label: "Thiền", icon: Heart },
];

/** Mục phụ: Hồ sơ + Cài đặt — hiển thị dạng icon ở đáy phải sidebar. */
const SETTINGS_ITEM = { to: "/settings", label: "Cài đặt", icon: Settings };
const PROFILE_ITEM = { to: "/profile", label: "Hồ sơ", icon: UserRound };

/** Danh sách đầy đủ (kể cả mục phụ) để tra cứu an toàn. */
const ALL_ITEMS = [...NAV, PROFILE_ITEM, SETTINGS_ITEM];

/** Bottom-nav mobile: tra theo đường dẫn, bỏ qua mục không tồn tại
    (tránh crash khi NAV thay đổi). */
const BOTTOM_NAV = ["/dashboard", "/suttas", "/calendar", "/meditation", "/profile"]
  .map((to) => ALL_ITEMS.find((n) => n.to === to))
  .filter((n): n is (typeof ALL_ITEMS)[number] => Boolean(n));

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

  const isActive = (to: string) =>
    to === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(to);

  const NavButton = ({ item }: { item: (typeof NAV)[number] }) => {
    const active = isActive(item.to);
    const Icon = item.icon;
    return (
      <button
        key={item.to}
        type="button"
        onClick={() => navigate(item.to)}
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
  };

  return (
    <div className="lotus-bg min-h-screen">
      {/* ---------- Sidebar desktop ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <DhammaWheel size={42} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Dhamma Stream</p>
            <p className="text-[11px] text-muted-foreground">
              Theravāda — Nguyên thủy
            </p>
          </div>
        </div>

        {/* Tab điều hướng chính — bên trái */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavButton key={item.to} item={item} />
          ))}
        </nav>

        {/* Hồ sơ + Cài đặt — icon ở đáy bên phải; Đăng xuất cạnh đó */}
        <div className="flex items-center justify-between border-t border-border/60 p-3">
          <button
            type="button"
            onClick={() => navigate(SETTINGS_ITEM.to)}
            aria-current={isActive(SETTINGS_ITEM.to) ? "page" : undefined}
            title="Cài đặt"
            aria-label="Cài đặt"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
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
              onClick={() => navigate(PROFILE_ITEM.to)}
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
      </aside>

      {/* ---------- Header mobile ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex min-w-0 items-center gap-2.5"
          >
            <DhammaWheel size={36} />
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold leading-tight">
                Dhamma Stream
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {title}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            {actions}
            {/* Cài đặt — icon bên phải header mobile */}
            <button
              type="button"
              onClick={() => navigate(SETTINGS_ITEM.to)}
              aria-label="Cài đặt"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition",
                isActive(SETTINGS_ITEM.to)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Chip điều hướng cuộn ngang trên mobile (không cần Hồ sơ — đã có ở bottom-nav) */}
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/70 bg-card/60 text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ---------- Nội dung ---------- */}
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-36 pt-6 sm:px-6 lg:pb-32 lg:pt-10">
          {/* Header desktop */}
          <div className="mb-6 hidden items-end justify-between gap-4 lg:flex">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Compass className="h-5 w-5 text-gold" />
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">          {actions}
          </div>}
          </div>
          {children}
        </main>
      </div>

      {/* ---------- Bottom nav mobile ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow")} />
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
