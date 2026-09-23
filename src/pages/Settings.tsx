import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { APP_VERSION } from "@/lib/version";
import {
  useSettings,
  type ThemeMode,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  Bug,
  CheckCircle2,
  Download,
  Info,
  KeyRound,
  Lightbulb,
  Loader2,
  Moon,
  RefreshCw,
  Send,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";

export default function Settings() {
  const {
    settings,
    t,
    setTheme,
    setNotifications,
  } = useSettings();
  const submitFeedback = useMutation(api.library.submitFeedback);
  const meta = useQuery(api.library.getAppVersion, {});
  const checkAiProviders = useAction(api.aiChat.providerStatus);

  // Trạng thái kết nối AI — kiểm tra theo yêu cầu, cảnh báo khóa còn thiếu
  const [aiChecking, setAiChecking] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    checks: { key: string; label: string; purpose: string; ready: boolean; required: boolean }[];
    missingRequired: string[];
    ready: boolean;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleCheckAi = async () => {
    setAiChecking(true);
    setAiError(null);
    try {
      const res = await checkAiProviders({});
      setAiStatus(res);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? "Không kiểm tra được — máy chủ chưa sẵn sàng. Hãy thử lại sau ít phút."
          : "Không kiểm tra được kết nối AI.",
      );
      setAiStatus(null);
    } finally {
      setAiChecking(false);
    }
  };

  const [fbType, setFbType] = useState<"idea" | "bug">("idea");
  const [fbMessage, setFbMessage] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbFile, setFbFile] = useState<File | null>(null);
  const [fbAppVersion, setFbAppVersion] = useState(APP_VERSION);
  const [fbDevice, setFbDevice] = useState("");
  const fbFileRef = useRef<HTMLInputElement>(null);
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

  // Thiết bị/hệ điều hành phát hiện tự động từ trình duyệt
  const detectedDevice = useMemo(() => {
    if (typeof navigator === "undefined") return "";
    const ua = navigator.userAgent;
    const os = /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
        ? "iOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac OS X/i.test(ua)
            ? "macOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "Không xác định";
    const browser = /Edg\//.test(ua)
      ? "Edge"
      : /OPR\//.test(ua)
        ? "Opera"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /Firefox\//.test(ua)
              ? "Firefox"
              : "Trình duyệt khác";
    return `${os} · ${browser}`;
  }, []);

  // Tự điền thiết bị nếu ô nhập còn trống
  useEffect(() => {
    setFbDevice((d) => d || detectedDevice);
  }, [detectedDevice]);

  const handleSend = async () => {
    if (fbMessage.trim().length < 5) {
      toast.error("Nội dung góp ý quá ngắn.");
      return;
    }
    setSending(true);
    try {
      // Báo lỗi có đính kèm: ghi chú tệp + thiết bị vào nội dung (lưu cùng feedback)
      const attachmentNote =
        fbType === "bug" && fbFile
          ? `\n\n[Đính kèm: ${fbFile.name} — ${(fbFile.size / 1024).toFixed(0)}KB]`
          : "";
      const deviceNote =
        fbType === "bug" && fbDevice.trim()
          ? `\n[Thiết bị: ${fbDevice.trim()}]`
          : "";
      await submitFeedback({
        type: fbType,
        message: `${fbMessage}${attachmentNote}${deviceNote}`,
        email: fbEmail || undefined,
        appVersion: fbType === "bug" && fbAppVersion.trim() ? fbAppVersion.trim() : APP_VERSION,
      });
      toast.success(
        fbType === "bug"
          ? "Đã gửi báo lỗi. Xin cảm ơn bạn!"
          : "Đã gửi góp ý. Xin cảm ơn bạn!",
      );
      setFbMessage("");
      setFbEmail("");
      setFbFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell
      title="Cài đặt"
    >
      <div className="space-y-6">
        {/* ---------- Giao diện ---------- */}
        <Section title={t("sectionAppearance")} icon={<Sun className="h-4 w-4 text-gold" />}>
          {/* Chế độ sáng/tối: chỉ Sáng và Tối (đã bỏ Theo hệ thống) */}
          <ChoiceRow label={t("modeLabel")}>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    key: "light",
                    label: t("themeLight"),
                    desc: t("lightDesc"),
                    icon: <Sun className="h-5 w-5" />,
                  },
                  {
                    key: "dark",
                    label: t("themeDark"),
                    desc: t("darkDesc"),
                    icon: <Moon className="h-5 w-5" />,
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

          {/* Thông báo */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{t("notifications")}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t("notifDesc")}.
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
        <Section title={t("appSection")} icon={<Info className="h-4 w-4 text-gold" />}>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {t("version")} {APP_VERSION}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("developer")}: Hứa Tiến Dương
                </p>
                <a
                  href="https://facebook.com/huatienduong.official"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] font-medium text-foreground/85 transition hover:border-primary/40 hover:bg-accent"
                  aria-label="Liên hệ nhà phát triển qua Facebook"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#1877F2]" aria-hidden>
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                  Liên hệ Facebook
                </a>
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

        {/* ---------- Trợ lý Phật học — kiểm tra kết nối AI ---------- */}
        <Section
          title="Trợ lý Phật học — kết nối AI"
          icon={<Sparkles className="h-4 w-4 text-gold" />}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
              Kiểm tra các khóa API đang kết nối. Nếu thiếu khóa bắt buộc, hãy bổ
              sung ngay trong mục <strong>Keys / API keys</strong> của dự án để
              Trợ lý Phật học không bị gián đoạn.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCheckAi()}
              disabled={aiChecking}
              className="gap-1.5"
            >
              {aiChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {aiChecking ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
            </Button>
          </div>

          {aiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed">{aiError}</p>
            </div>
          )}

          {aiStatus && (
            <div className="space-y-2">
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-3",
                  aiStatus.ready
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-destructive/40 bg-destructive/10",
                )}
              >
                {aiStatus.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                )}
                <p className="text-xs font-medium leading-relaxed">
                  {aiStatus.ready
                    ? "Trợ lý Phật học đã kết nối đầy đủ."
                    : `Thiếu khóa bắt buộc: ${aiStatus.missingRequired.join(", ")} — hãy thêm ngay trong mục Keys / API keys.`}
                </p>
              </div>
              <ul className="space-y-1.5">
                {aiStatus.checks.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/40 p-2.5"
                  >
                    <KeyRound
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        c.ready ? "text-green-600" : "text-muted-foreground/60",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">
                        {c.label}
                        {c.required && (
                          <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                            bắt buộc
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] leading-relaxed text-muted-foreground">
                        {c.purpose}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/80">
                        {c.key}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        c.ready
                          ? "bg-green-500/15 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {c.ready ? "Sẵn sàng" : "Chưa có"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            placeholder=""
            aria-label="Nội dung góp ý hoặc báo lỗi"
            className="w-full rounded-xl border border-border/70 bg-card/80 p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />

          {/* BÁO LỖI: đính kèm ảnh/video + thông tin phiên bản & thiết bị */}
          {fbType === "bug" && (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fbFileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFbFile(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fbFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground/85 transition hover:bg-accent"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Đính kèm ảnh / video
                  </button>
                  {fbFile && (
                    <button
                      type="button"
                      onClick={() => setFbFile(null)}
                      className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive transition hover:bg-destructive/20"
                    >
                      <X className="h-3 w-3" />
                      {fbFile.name.length > 28
                        ? `${fbFile.name.slice(0, 26)}…`
                        : fbFile.name}
                    </button>
                  )}
                </div>
                {fbFile && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Tệp đã sẵn sàng — dung lượng tối đa khuyến nghị 10MB.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Số phiên bản ứng dụng
                  </span>
                  <input
                    value={fbAppVersion}
                    onChange={(e) => setFbAppVersion(e.target.value)}
                    placeholder=""
                    className="mt-1 w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <label className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Thiết bị / hệ điều hành
                  </span>
                  <input
                    value={fbDevice}
                    onChange={(e) => setFbDevice(e.target.value)}
                    placeholder=""
                    className="mt-1 w-full bg-transparent text-sm outline-none"
                  />
                </label>
              </div>
            </>
          )}

          <Button
            onClick={handleSend}
            disabled={sending}
            className="gap-2 w-full sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {sending ? "Đang gửi…" : fbType === "bug" ? "Gửi báo lỗi" : "Gửi góp ý"}
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
