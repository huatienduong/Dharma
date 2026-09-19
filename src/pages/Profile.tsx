import { AppShell } from "@/components/AppShell";
import { DhammaWheel } from "@/components/DhammaWheel";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/lib/settings";
import { APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "convex/react";
import {
  BookOpen,
  CalendarDays,
  Check,
  Eye,
  Flame,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Profile() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const { t } = useSettings();
  const updateProfile = useMutation(api.profile.updateProfile);
  const stats = useQuery(api.profile.myStats, {});

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [dhammaName, setDhammaName] = useState("");
  const [bio, setBio] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setDhammaName(user.dhammaName ?? "");
      setBio(user.bio ?? "");
      setBirthYear(user.birthYear ? String(user.birthYear) : "");
    }
  }, [user]);

  if (isLoading) {
    return (
      <AppShell title="Hồ sơ" subtitle="Thông tin tài khoản của bạn">
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  // Chưa đăng nhập: mời đăng nhập để lưu tiến trình, không chặn xem app
  if (!isAuthenticated || !user) {
    return (
      <AppShell
        title={t("navProfile")}
        subtitle={t("guestNotice")}
      >
        <div className="mx-auto max-w-md space-y-4">
          <div className="rounded-2xl border border-gold/40 bg-gradient-to-b from-gold/10 to-transparent p-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/50 bg-gold/10">
              <UserRound className="h-8 w-8 text-gold" />
            </div>
            <h2 className="text-lg font-bold">{t("guestNotice")}</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("guestNotice")}
            </p>
            <Button asChild size="lg" className="mt-4 w-full gap-2">
              <Link to="/auth?returnTo=%2Fprofile">
                <LogIn className="h-4 w-4" /> {t("loginRegister")}
              </Link>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Khi là khách, lịch sử xem và phiên thiền sẽ không được lưu.
          </p>
        </div>
      </AppShell>
    );
  }

  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();
  const isAnonymous = user.isAnonymous === true;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name,
        dhammaName,
        bio,
        birthYear: birthYear ? Number(birthYear) : undefined,
      });
      toast.success("Đã cập nhật hồ sơ.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Hồ sơ" subtitle="Thông tin và tiến trình tu tập của bạn">
      <div className="space-y-6">
        {/* ---------- Thẻ thông tin ---------- */}
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
          <div className="flex items-center gap-4 p-5">
            {/* Avatar chữ cái */}
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-gold/25 to-primary/10 text-3xl font-bold text-primary">
                {initial}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-background">
                <DhammaWheel size={26} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold">
                {isAnonymous
                  ? "Hành giả ẩn danh"
                  : user.name || user.email?.split("@")[0] || "Hành giả"}
              </h2>
              {user.dhammaName && (
                <p className="text-sm text-gold">Pháp danh: {user.dhammaName}</p>
              )}
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {isAnonymous ? "Tài khoản khách" : user.email}
              </p>
              {user.birthYear && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  Sinh năm {user.birthYear}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing((v) => !v)}
              className="gap-1.5 shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Đóng" : "Sửa"}
            </Button>
          </div>

          {/* Form chỉnh sửa */}
          {editing && (
            <div className="space-y-3 border-t border-border/60 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tên hiển thị">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </Field>
                <Field label="Pháp danh (không bắt buộc)">
                  <Input
                    value={dhammaName}
                    onChange={(e) => setDhammaName(e.target.value)}
                    placeholder="Tâm Minh"
                  />
                </Field>
                <Field label="Năm sinh (không bắt buộc)">
                  <Input
                    value={birthYear}
                    onChange={(e) =>
                      setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    inputMode="numeric"
                    placeholder="1990"
                  />
                </Field>
              </div>
              <Field label="Giới thiệu bản thân (không bắt buộc)">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Vài dòng về hành trình tu tập của bạn…"
                  className="w-full rounded-xl border border-border/70 bg-card/80 p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Check className="h-4 w-4" />
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          )}

          {/* Bio hiển thị */}
          {!editing && user.bio && (
            <p className="border-t border-border/60 p-5 text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          )}
        </section>

        {/* ---------- Thống kê ---------- */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Eye className="h-4 w-4 text-gold" />}
            value={stats === undefined ? "…" : String(stats.watchCount)}
            label="Pháp thoại đã xem"
          />
          <StatCard
            icon={<Check className="h-4 w-4 text-gold" />}
            value={stats === undefined ? "…" : String(stats.completedCount)}
            label="Hoàn thành"
          />
          <StatCard
            icon={<Flame className="h-4 w-4 text-gold" />}
            value={
              stats === undefined ? "…" : `${stats.meditationSessions} phiên`
            }
            label="Thiền định"
          />
          <StatCard
            icon={<BookOpen className="h-4 w-4 text-gold" />}
            value={stats === undefined ? "…" : String(stats.suttasRead)}
            label="Kinh đã đọc xong"
          />
        </section>

        {/* ---------- Tài khoản ---------- */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-semibold">Tài khoản</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Loại tài khoản:{" "}
              <span className="font-medium text-foreground/80">
                {isAnonymous ? "Khách (dữ liệu chỉ trên thiết bị này)" : "Email"}
              </span>
            </p>
            <p>
              Ứng dụng phiên bản {APP_VERSION} — dữ liệu của bạn được đồng bộ
              an toàn theo tài khoản.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void signOut()}
            className="mt-4 gap-2"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-xl font-bold">{value}</p>
    </div>
  );
}
