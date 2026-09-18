import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { APP_VERSION } from "@/lib/version";
import {
  FONT_SCALES,
  useSettings,
  type Language,
  type ThemeMode,
} from "@/lib/settings";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Bug,
  Check,
  Download,
  Lightbulb,
  Monitor,
  Moon,
  Send,
  Sun,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const {
    settings,
    setTheme,
    setFontScale,
    setLanguage,
    setNotifications,
  } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const submitFeedback = useMutation(api.library.submitFeedback);
  const meta = useQuery(api.library.getAppVersion, {});

  const [fbType, setFbType] = useState<"idea" | "bug">("idea");
  const [fbMessage, setFbMessage] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [sending, setSending] = useState(false);

  const latest = meta?.latestVersion ?? APP_VERSION;
  const hasUpdate = compareVersions(latest, APP_VERSION) > 0;

  const handleSend = async () => {
    if (fbMessage.trim().length < 5) {
      toast.error("Nội dung góp ý quá ngắn.");
      return;
    }
    setSending(true);
    try {
      await submitFeedback({
        type: fbType,
        message: fbMessage,
        email: fbEmail || undefined,
        appVersion: APP_VERSION,
      });
      toast.success("Đã gửi góp ý. Xin cảm ơn bạn!");
      setFbMessage("");
      setFbEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell
      title="Cài đặt"
      subtitle="Tùy chỉnh ứng dụng theo nhu cầu của bạn"
    >
      <div className="space-y-6">
        {/* ---------- Giao diện ---------- */}
        <Section title="Giao diện" icon={<Sun className="h-4 w-4 text-gold" />}>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Chế độ sáng / tối
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "light", label: "Sáng", icon: <Sun className="h-4 w-4" /> },
                  { key: "dark", label: "Tối", icon: <Moon className="h-4 w-4" /> },
                  {
                    key: "system",
                    label: "Hệ thống",
                    icon: <Monitor className="h-4 w-4" />,
                  },
                ] as { key: ThemeMode; label: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition",
                    settings.theme === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Cỡ chữ
            </p>
            <div className="flex flex-wrap gap-2">
              {FONT_SCALES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFontScale(f.value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                    settings.fontScale === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
                  )}
                  style={{ fontSize: `${0.8 * f.value}rem` }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Ngôn ngữ
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "vi", label: "Tiếng Việt" },
                  { key: "en", label: "English" },
                ] as { key: Language; label: string }[]
              ).map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLanguage(l.key)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                    settings.language === l.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Bell className="h-4 w-4" /> Thông báo ứng dụng
              </p>
              <p className="text-[11px] text-muted-foreground">
                Nhắc nhở thực hành thiền và ngày Uposatha.
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onChange={(v) => setNotifications(v)}
              label="Thông báo"
            />
          </div>
        </Section>

        {/* ---------- Phiên bản ---------- */}
        <Section
          title="Ứng dụng"
          icon={<Download className="h-4 w-4 text-gold" />}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                Phiên bản hiện tại: {APP_VERSION}
              </p>
              {hasUpdate ? (
                <p className="text-xs text-gold">
                  Có phiên bản mới {latest} — cập nhật để nhận tính năng mới!
                </p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-green-600" /> Bạn đang dùng
                  phiên bản mới nhất.
                </p>
              )}
              {meta?.releaseNotes && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Ghi chú: {meta.releaseNotes}
                </p>
              )}
            </div>
            {hasUpdate && (
              <Button size="sm" className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" /> Cập nhật
              </Button>
            )}
          </div>
        </Section>

        {/* ---------- Góp ý / báo lỗi ---------- */}
        <Section
          title="Góp ý & Báo lỗi"
          icon={<Lightbulb className="h-4 w-4 text-gold" />}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFbType("idea")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition",
                fbType === "idea"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:bg-accent",
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" /> Đề xuất tính năng
            </button>
            <button
              type="button"
              onClick={() => setFbType("bug")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition",
                fbType === "bug"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border/70 text-muted-foreground hover:bg-accent",
              )}
            >
              <Bug className="h-3.5 w-3.5" /> Báo cáo lỗi
            </button>
          </div>
          <textarea
            value={fbMessage}
            onChange={(e) => setFbMessage(e.target.value)}
            rows={4}
            placeholder={
              fbType === "bug"
                ? "Mô tả lỗi: bạn làm gì, thấy gì, mong đợi điều gì…"
                : "Bạn mong muốn ứng dụng có tính năng gì tiếp theo?"
            }
            className="w-full rounded-xl border border-border/70 bg-card/80 p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={fbEmail}
            onChange={(e) => setFbEmail(e.target.value)}
            placeholder="Email liên hệ (không bắt buộc)"
            type="email"
            className="w-full rounded-xl border border-border/70 bg-card/80 p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            onClick={handleSend}
            disabled={sending}
            className="gap-2 w-full sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {sending ? "Đang gửi…" : "Gửi góp ý"}
          </Button>
        </Section>

        {/* ---------- Về ứng dụng ---------- */}
        <Section title="Về ứng dụng" icon={<Check className="h-4 w-4 text-gold" />}>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground/80">Dhamma Stream</span>{" "}
              — Xem, nghe pháp thoại và học Phật pháp theo truyền thống
              Theravāda.
            </p>
            <p>
              Phiên bản {APP_VERSION} · Nhà phát triển:{" "}
              <span className="font-medium text-foreground/80">
                Hứa Tiến Dương
              </span>
            </p>
            {isAuthenticated && user?.email && (
              <p>Tài khoản: {user.email}</p>
            )}
            <p>
              Nội dung Kinh/Luật theo bản dịch Pāḷi truyền thống; pháp thoại
              thuộc bản quyền các kênh YouTube tương ứng.
            </p>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[1.375rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
