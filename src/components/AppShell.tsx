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

/** Tab chính — bên trái, đúng thứ tự. */
const NAV = [
  { to: "/dashboard", label: "Pháp thoại", icon: LayoutDashboard },
  { to: "/suttas", label: "Kinh tạng", icon: BookOpen },
  { to: "/vinaya", label: "Luật tạng", icon: Scale },
  { to: "/dictionary", label: "Từ điển", icon: BookMarked },
  { to: "/calendar", label: "Lịch Phật giáo", icon: Calendar },
  { to: "/meditation", label: "Thiền", icon: Heart },
];

/** Mục phụ ở đáy sidebar: Hồ sơ + Cài đặt. */
const SETTINGS_ITEM = { to: "/settings", label: "Cài đặt", icon: Settings };
const PROFILE_ITEM = { to: "/profile", label: "Hồ sơ", icon: UserRound };

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

  return (
    <div className="lotus-bg min-h-screen">
      {/* ---------- Sidebar trái — mọi kích thước màn hình ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-52 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur sm:w-60">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 px-4 py-5 text-left sm:px-5"
        >
          <DhammaWheel size={40} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              Dhamma Stream
            </p>
            <p className="text-[11px] text-muted-foreground">
              Theravāda — Nguyên thủy
            </p>
          </div>
        </button>

        {/* Tab chính */}
        <nav className="flex-1 space-y-1 px-2.5 py-2 sm:px-3">
          {NAV.map((item) => {
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
          })}
        </nav>

        {/* Đáy sidebar: Cài đặt (trái) · Hồ sơ + Đăng xuất (phải, icon) */}
        <div className="flex items-center justify-between border-t border-border/60 p-2.5 sm:p-3">
          <button
            type="button"
            onClick={() => navigate(SETTINGS_ITEM.to)}
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

      {/* ---------- Nội dung ---------- */}
      <div className="pl-52 sm:pl-60">
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
          {/* Tiêu đề trang + hành động */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
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
