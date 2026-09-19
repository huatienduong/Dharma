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
  { to: "/profile", label: "Hồ sơ", icon: UserRound },
  { to: "/settings", label: "Cài đặt", icon: Settings },
];

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
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
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
        <div className="border-t border-border/60 p-4">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
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
          {actions}
        </div>
        {/* Chip điều hướng cuộn ngang trên mobile */}
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
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
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      {/* ---------- Bottom nav mobile ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {[
            NAV[0], // Trang chủ (pháp thoại)
            NAV[1], // Kinh tạng
            NAV.find((n) => n.to === "/calendar")!,
            NAV.find((n) => n.to === "/meditation")!,
            NAV.find((n) => n.to === "/settings")!,
          ].map((item) => {
            const active = location.pathname.startsWith(item.to);
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
