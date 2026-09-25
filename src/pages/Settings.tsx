import { api } from "@/convex/_generated/api";
import { LegalDocs } from "@/components/LegalDocs";
import { wipeSecureStorage } from "@/lib/secureStorage";
import {
  APP_DEVELOPER,
  APP_NAME,
  APP_VERSION,
} from "@/lib/version";
import {
  useSettings,
  type ThemeMode,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import {
  ArrowLeft,
  Bell,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Lightbulb,
  Moon,
  Paperclip,
  RefreshCw,
  Send,
  Sun,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";
import {
  getVoice,
  loadVoicePref,
  saveVoicePref,
  VOICE_LIST,
} from "@/lib/aiVoices";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    t,
    setTheme,
    setNotifications,
  } = useSettings();
  const meta = useQuery(api.library.getAppVersion, {});
  const submitFeedback = useMutation(api.library.submitFeedback);

  // Mục đang mở rộng (accordion) — mỗi mục một thẻ trắng như app hệ thống.
  // Hỗ trợ deep-link từ Trợ lý: /settings?section=about mở sẵn phần Giới thiệu
  // (kiểm tra & cập nhật phiên bản ứng dụng).
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const validSection =
    sectionParam === "appearance" ||
    sectionParam === "about" ||
    sectionParam === "voice" ||
    sectionParam === "feedback" ||
    sectionParam === "legal"
      ? sectionParam
      : null;
  const [openCard, setOpenCard] = useState<
    null | "appearance" | "about" | "voice" | "feedback" | "legal"
  >(validSection);
  const toggle = (key: typeof openCard) =>
    setOpenCard((cur) => (cur === key ? null : key));

  // Giọng đọc trợ lý — chọn + nghe thử ngay tại đây
  const [voiceId, setVoiceId] = useState<string>(loadVoicePref);
  const { speak: speakVI, stop: stopSpeaking } = useVietnameseTTS();
  const currentVoice = getVoice(voiceId);

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
    // So sánh với phiên bản mới nhất trên server
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

  const handleReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Xóa toàn bộ dữ liệu đã lưu trên thiết bị này?")
    ) {
      return;
    }
    try {
      // Trợ lý Phật học: dữ liệu cục bộ gồm hội thoại (đÃ MÃ HÓA) + lựa chọn giọng.
      // wipeSecureStorage xóa cả khóa mã hóa → dữ liệu mã hóa cũ không thể đọc lại.
      localStorage.removeItem("ds-assistant-voice");
      wipeSecureStorage();
    } catch {
      /* bỏ qua */
    }
    toast.success("Đã đặt lại dữ liệu cục bộ.");
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="fb-bg flex min-h-screen flex-col">
      {/* ---------- Header mảnh đồng bộ với màn Trợ lý Phật học ---------- */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-2 backdrop-blur sm:px-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
          aria-label="Quay lại trợ lý"
        >
          <ArrowLeft />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-extrabold uppercase tracking-[0.18em] leading-tight text-foreground">
            Trợ lý Phật học
          </p>
        </div>
        <span className="h-10 w-10 shrink-0" aria-hidden />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-16 pt-5 sm:px-5">
        <h1 className="mb-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Cài đặt
        </h1>

      <div className="space-y-3.5">
        {/* ---------- Giao diện ---------- */}
        <RowCard
          label={t("sectionAppearance")}
          open={openCard === "appearance"}
          onClick={() => toggle("appearance")}
        >
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {(
              [
                {
                  key: "light",
                  label: t("themeLight"),
                  icon: <Sun className="h-5 w-5" />,
                },
                {
                  key: "dark",
                  label: t("themeDark"),
                  icon: <Moon className="h-5 w-5" />,
                },
              ] as { key: ThemeMode; label: string; icon: React.ReactNode }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTheme(opt.key)}
                aria-pressed={settings.theme === opt.key}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition",
                  settings.theme === opt.key
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-muted/50 text-foreground/80 hover:bg-accent",
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>


        </RowCard>

        {/* ---------- Thông báo (toggle ngay trên hàng) ---------- */}
        <div className="ds-card flex items-center justify-between gap-4 px-5 py-5">
          <p className="text-[16px] font-semibold">{t("notifications")}</p>
          <Switch
            checked={settings.notifications}
            onChange={(v) => setNotifications(v)}
            label="Thông báo"
          />
        </div>

        {/* ---------- Lựa chọn giọng nói ---------- */}
        <RowCard
          label="Lựa chọn giọng nói"
          open={openCard === "voice"}
          onClick={() => toggle("voice")}
        >
          <div className="space-y-1 pt-1">
            {/* Giọng đang chọn — dòng tổng quan gọn */}
            <div className="mb-2.5 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-sm font-semibold">{currentVoice.name}</p>
              <p className="text-xs text-muted-foreground">{currentVoice.desc}</p>
            </div>
            {VOICE_LIST.map((v) => {
              const active = v.id === voiceId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setVoiceId(v.id);
                    saveVoicePref(v.id);
                    stopSpeaking();
                    void speakVI("Xin chào, tôi là trợ lý Phật học của bạn.", {
                      voice: v.id,
                    });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                    active
                      ? "bg-primary/10"
                      : "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Volume2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        active ? "text-primary" : "text-foreground",
                      )}
                    >
                      {v.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.desc}
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-4.5 w-4.5 shrink-0 text-primary" />
                  ) : (
                    <Volume2
                      className="h-4 w-4 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </RowCard>

        {/* ---------- Giới thiệu / Phiên bản ---------- */}
        <RowCard
          label="Giới thiệu"
          open={openCard === "about"}
          onClick={() => toggle("about")}
        >
          <div className="space-y-3 pt-1">
            {/* Đồng bộ với chân trang Trang chủ: nhà phát triển + phiên bản */}
            <div className="rounded-2xl bg-muted/50 px-4 py-4 text-center">
              <p className="text-[13px] font-semibold text-foreground/90">
                Nhà phát triển ứng dụng: {APP_DEVELOPER}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {APP_NAME} · Phiên bản {APP_VERSION}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-sm font-semibold">Cập nhật ứng dụng</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCheckUpdate}
                disabled={checking}
                className="gap-1.5 rounded-full"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
                {checking ? "Đang kiểm tra…" : "Kiểm tra"}
              </Button>
            </div>

            {/* Kết quả kiểm tra hiện sau khi bấm */}
            {checkResult && (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl p-3",
                  hasUpdate
                    ? "bg-gold/10"
                    : "bg-green-500/10",
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
                    <Button
                      size="sm"
                      className="mt-2 gap-1.5 rounded-full"
                      onClick={() => window.location.reload()}
                    >
                      <Download className="h-3.5 w-3.5" /> Tải bản mới
                    </Button>
                  )}
                </div>
              </div>
            )}

          </div>
        </RowCard>

        {/* ---------- Chính sách & Điều khoản ---------- */}
        <RowCard
          label="Chính sách & Điều khoản"
          open={openCard === "legal"}
          onClick={() => toggle("legal")}
        >
          <LegalDocs />
        </RowCard>

        {/* ---------- Góp ý & Báo lỗi ---------- */}
        <RowCard
          label="Góp ý & Báo lỗi"
          open={openCard === "feedback"}
          onClick={() => toggle("feedback")}
        >
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFbType("idea")}
                aria-pressed={fbType === "idea"}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition",
                  fbType === "idea"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent",
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" /> Đề xuất
              </button>
              <button
                type="button"
                onClick={() => setFbType("bug")}
                aria-pressed={fbType === "bug"}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition",
                  fbType === "bug"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted/50 text-muted-foreground hover:bg-accent",
                )}
              >
                <Bug className="h-3.5 w-3.5" /> Báo lỗi
              </button>
            </div>
            <textarea
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              rows={4}
              placeholder=""
              aria-label="Nội dung góp ý hoặc báo lỗi"
              className="w-full rounded-2xl border border-border/60 bg-muted/40 p-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />

            {/* BÁO LỖI: đính kèm ảnh/video + thông tin phiên bản & thiết bị */}
            {fbType === "bug" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/85 transition hover:bg-accent"
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="rounded-2xl bg-muted/40 px-3 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Phiên bản ứng dụng
                    </span>
                    <input
                      value={fbAppVersion}
                      onChange={(e) => setFbAppVersion(e.target.value)}
                      placeholder=""
                      className="mt-0.5 w-full bg-transparent text-sm outline-none"
                    />
                  </label>
                  <label className="rounded-2xl bg-muted/40 px-3 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Thiết bị / hệ điều hành
                    </span>
                    <input
                      value={fbDevice}
                      onChange={(e) => setFbDevice(e.target.value)}
                      placeholder=""
                      className="mt-0.5 w-full bg-transparent text-sm outline-none"
                    />
                  </label>
                </div>
              </>
            )}

            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full gap-2 rounded-full"
            >
              <Send className="h-4 w-4" />
              {sending ? "Đang gửi…" : fbType === "bug" ? "Gửi báo lỗi" : "Gửi góp ý"}
            </Button>
          </div>
        </RowCard>
      </div>

      {/* ---------- Nút pill lớn cuối trang ---------- */}
      <div className="mt-10 flex justify-center pb-4">
        <Button
          onClick={handleReset}
          className="h-13 w-full max-w-sm rounded-full text-[15px] font-bold shadow-[0_6px_18px_rgba(180,83,9,0.35)]"
        >
          Đặt lại ứng dụng
        </Button>
      </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hàng mục: thẻ trắng riêng — nhãn trái, mũi tên phải, mở rộng tại chỗ */
/* ------------------------------------------------------------------ */

function RowCard({
  label,
  open,
  onClick,
  children,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="ds-card overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
      >
        <span className="text-[16px] font-semibold leading-snug">{label}</span>
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
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
        "relative h-7 w-12 shrink-0 rounded-full transition",
        checked ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
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
