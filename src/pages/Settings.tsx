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
  Bell,
  Bug,
  Check,
  CheckCircle2,
  Download,
  Info,
  Lightbulb,
  Monitor,
  Moon,
  RefreshCw,
  Send,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const {
    settings,
    t,
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

  // Kiểm tra cập nhật: chỉ chạy khi bấm nút, hiển thị kết quả
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<null | {
    ok: boolean;
    message: string;
    releaseNotes?: string;
  }>(null);

  const latest = meta?.latestVersion ?? APP_VERSION;
  const hasUpdate = compareVersions(latest, APP_VERSION) > 0;

  const handleCheckUpdate = async () => {
    setChecking(true);
    setCheckResult(null);
    // Mô phỏng thao tác kiểm tra — so sánh với phiên bản mới nhất trên server
    await new Promise((r) => setTimeout(r, 600));
    const up = compareVersions(latest, APP_VERSION) > 0;
    setCheckResult({
      ok: true,
      message: up
        ? `Có phiên bản mới ${latest}. Cập nhật để nhận tính năng và sửa lỗi mới.`
        : `Bạn đang dùng phiên bản mới nhất (${APP_VERSION}).`,
      releaseNotes: up ? meta?.releaseNotes : undefined,
    });
    setChecking(false);
  };

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
          {/* Chế độ sáng/tối: card lựa chọn */}
          <ChoiceRow label="Chế độ sáng / tối">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    key: "light",
                    label: "Sáng",
                    desc: "Nền nâu sáng",
                    icon: <Sun className="h-5 w-5" />,
                  },
                  {
                    key: "dark",
                    label: "Tối",
                    desc: "Dễ mắt khi đêm",
                    icon: <Moon className="h-5 w-5" />,
                  },
                  {
                    key: "system",
                    label: "Hệ thống",
                    desc: "Theo thiết bị",
                    icon: <Monitor className="h-5 w-5" />,
                  },
                ] as { key: ThemeMode; label: string; desc: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  aria-pressed={settings.theme === opt.key}
                  className={cn(
                    "group flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition",
                    settings.theme === opt.key
                      ? "border-gold/70 bg-gold/10 shadow-sm"
                      : "border-border/60 bg-card/40 hover:border-border hover:bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition",
                      settings.theme === opt.key
                        ? "bg-gold/20 text-gold"
                        : "bg-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {opt.icon}
                    </span>
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </ChoiceRow>

          {/* Cỡ chữ: 4 mức dạng segmented */}
          <ChoiceRow label="Cỡ chữ">
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-border/60 bg-card/40 p-1.5">
              {FONT_SCALES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFontScale(f.value)}
                  aria-pressed={settings.fontScale === f.value}
                  className={cn(
                    "rounded-lg py-2 text-center transition",
                    settings.fontScale === f.value
                      ? "bg-gold/20 font-semibold text-gold shadow-inner"
                      : "text-muted-foreground hover:bg-accent/40",
                  )}
                  style={{ fontSize: `${0.8 + f.value * 0.12}rem` }}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </ChoiceRow>

          {/* Ngôn ngữ */}
          <ChoiceRow label="Ngôn ngữ ứng dụng">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
                  { key: "en", label: "English", flag: "🇬🇧" },
                ] as { key: Language; label: string; flag: string }[]
              ).map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLanguage(l.key)}
                  aria-pressed={settings.language === l.key}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition",
                    settings.language === l.key
                      ? "border-gold/70 bg-gold/10 text-gold"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <span aria-hidden>{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </ChoiceRow>

          {/* Thông báo */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Thông báo ứng dụng</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Nhắc nhở thực hành thiền và ngày Uposatha.
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifications}
              onChange={(v) => setNotifications(v)}
              label="Thông báo"
            />
          </div>
        </Section>

        {/* ---------- Phiên bản ---------- */}
        <Section title="Ứng dụng" icon={<Info className="h-4 w-4 text-gold" />}>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Phiên bản {APP_VERSION}
                </p>
                <p className="text-xs text-muted-foreground">
                  Nhà phát triển: Hứa Tiến Dương
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckUpdate}
                disabled={checking}
                className="gap-1.5"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
                {checking ? "Đang kiểm tra…" : "Kiểm tra cập nhật"}
              </Button>
            </div>

            {/* Kết quả kiểm tra hiện sau khi bấm */}
            {checkResult && (
              <div
                className={cn(
                  "mt-3 flex items-start gap-2.5 rounded-lg border p-3",
                  hasUpdate
                    ? "border-gold/50 bg-gold/10"
                    : "border-green-500/40 bg-green-500/10",
                )}
              >
                {hasUpdate ? (
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-relaxed">
                    {checkResult.message}
                  </p>
                  {checkResult.releaseNotes && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Ghi chú: {checkResult.releaseNotes}
                    </p>
                  )}
                  {hasUpdate && (
                    <Button size="sm" className="mt-2 gap-1.5" onClick={() => window.location.reload()}>
                      <Download className="h-3.5 w-3.5" /> Tải bản mới
                    </Button>
                    )}
                </div>
              </div>
            )}

            {!checkResult && !checking && meta?.releaseNotes && (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Bản mới nhất trên máy chủ: {latest}
              </p>
            )}
          </div>
        </Section>

        {/* ---------- Góp ý / báo lỗi ---------- */}
        <Section
          title="Góp ý & Báo lỗi"
          icon={<Lightbulb className="h-4 w-4 text-gold" />}
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFbType("idea")}
              aria-pressed={fbType === "idea"}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition",
                fbType === "idea"
                  ? "border-gold/70 bg-gold/10 text-gold"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-accent/40",
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" /> Đề xuất tính năng
            </button>
            <button
              type="button"
              onClick={() => setFbType("bug")}
              aria-pressed={fbType === "bug"}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition",
                fbType === "bug"
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-accent/40",
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
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

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
        "relative h-6 w-11 shrink-0 rounded-full transition",
        checked ? "bg-gold" : "bg-border",
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
