import { AppLogo } from "@/components/AppLogo";
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
import { useAction, useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useMemo } from "react";
import {
  ArrowLeft,
  Bell,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  LifeBuoy,
  Lightbulb,
  MessageSquare,
  Moon,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Sun,
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

const FEEDBACK_RECEIVED_MESSAGE =
  "Đã tạo phiếu hỗ trợ. Hứa Tiến Dương đã nhận được yêu cầu hỗ trợ của bạn. Hãy theo dõi phiếu hỗ trợ để cập nhật thêm thông tin. Xin cảm ơn!";

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    t,
    setTheme,
    setNotifications,
  } = useSettings();
  const meta = useQuery(api.library.getAppVersion, {});
  const currentUser = useQuery(api.users.currentUser, {});
  const myTickets = useQuery(api.library.listMyFeedback);
  const adminTickets = useQuery(api.library.listAllFeedback);
  const submitFeedback = useMutation(api.library.submitFeedback);
  const sendFeedbackEmail = useAction(api.library.emailFeedback);
  const replyFeedback = useMutation(api.library.replyToFeedback);
  const replyAsDeveloper = useMutation(api.library.replyToFeedbackAsDeveloper);

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
  const [replyingId, setReplyingId] = useState<GenericId<"feedback"> | null>(null);
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [adminReplyingId, setAdminReplyingId] = useState<GenericId<"feedback"> | null>(null);
  const [adminReplies, setAdminReplies] = useState<Record<string, string>>({});
  const isDeveloper =
    currentUser?.email?.trim().toLowerCase() === "huatienduong@protonmail.com" ||
    currentUser?.role === "admin";

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
      const ticketMessage = `${fbMessage}${attachmentNote}${deviceNote}`;
      const result = await submitFeedback({
        type: fbType,
        message: ticketMessage,
        email: fbEmail || undefined,
        appVersion: fbType === "bug" && fbAppVersion.trim() ? fbAppVersion.trim() : APP_VERSION,
      });

      try {
        await sendFeedbackEmail({
          type: fbType,
          message: ticketMessage,
          email: fbEmail || undefined,
          appVersion: fbType === "bug" && fbAppVersion.trim() ? fbAppVersion.trim() : APP_VERSION,
          ticketCode: result.ticketCode,
        });
      } catch {
        // Phiếu vẫn được lưu an toàn nếu chưa thể gửi email.
      }

      toast.success(FEEDBACK_RECEIVED_MESSAGE);
      setFbMessage("");
      setFbEmail("");
      setFbFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  const handleTicketReply = async (ticketId: GenericId<"feedback">) => {
    const message = ticketReplies[ticketId]?.trim() ?? "";
    if (message.length < 2) {
      toast.error("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setReplyingId(ticketId);
    try {
      await replyFeedback({ feedbackId: ticketId, message });
      setTicketReplies((current) => ({ ...current, [ticketId]: "" }));
      toast.success("Đã gửi phản hồi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gửi được phản hồi.");
    } finally {
      setReplyingId(null);
    }
  };

  const handleDeveloperReply = async (
    ticketId: GenericId<"feedback">,
    status: "reading" | "resolved" = "reading",
  ) => {
    const message =
      status === "resolved"
        ? adminReplies[ticketId]?.trim() || "Đã xử lý yêu cầu hỗ trợ."
        : adminReplies[ticketId]?.trim() ?? "";
    if (message.length < 2) {
      toast.error("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setAdminReplyingId(ticketId);
    try {
      await replyAsDeveloper({ feedbackId: ticketId, message, status });
      setAdminReplies((current) => ({ ...current, [ticketId]: "" }));
      toast.success(
        status === "resolved"
          ? "Đã đóng phiếu hỗ trợ."
          : "Đã gửi phản hồi tới người dùng.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gửi được phản hồi.");
    } finally {
      setAdminReplyingId(null);
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
      {/* ---------- Header đồng bộ với màn Trợ lý Phật học: lưới 3 cột ---------- */}
      <header className="sticky top-0 z-40 grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-border/60 bg-background/95 px-2 backdrop-blur sm:px-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-accent justify-self-start"
          aria-label="Quay lại trợ lý"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center justify-center gap-2">
          <AppLogo className="h-8 w-8 shrink-0 rounded-xl object-contain" />
          <p className="whitespace-nowrap text-sm font-extrabold uppercase tracking-[0.08em] leading-tight text-foreground sm:text-[17px] sm:tracking-[0.16em]">
            Trợ lý Phật học
          </p>
        </div>
        <span className="h-11 w-11 justify-self-end" aria-hidden />
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
          label="Giọng nói"
          open={openCard === "voice"}
          onClick={() => toggle("voice")}
        >
          <div className="space-y-2.5 pt-1">
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
                    "flex w-full items-center gap-3 rounded-full border py-3 px-4 text-left backdrop-blur-sm transition",
                    active
                      ? "border-gold/40 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        active ? "text-gold" : "text-foreground",
                      )}
                    >
                      {v.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.desc}
                    </span>
                  </span>
                  {active && <Check className="h-4.5 w-4.5 shrink-0 text-gold" />}
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

            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Phiếu hỗ trợ của bạn</p>
              </div>

              {myTickets === undefined ? (
                <p className="text-xs text-muted-foreground">Đang tải phiếu hỗ trợ…</p>
              ) : myTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Chưa có phiếu hỗ trợ nào.
                </p>
              ) : (
                <div className="space-y-3">
                  {myTickets.map((ticket) => (
                    <div key={ticket._id} className="rounded-2xl bg-muted/45 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {ticket.subject || "Phiếu hỗ trợ"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {ticket.ticketCode || `Phiếu ${ticket._creationTime}`}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
                            ticket.status === "resolved"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : ticket.status === "reading"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-primary/10 text-primary",
                          )}
                        >
                          {supportStatusLabel(ticket.status)}
                        </span>
                      </div>

                      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                        {ticket.messages.map((item) => (
                          <div
                            key={item._id}
                            className={cn(
                              "rounded-xl px-3 py-2 text-xs leading-relaxed",
                              item.authorRole === "developer"
                                ? "bg-primary/10 text-foreground"
                                : "bg-background/80 text-foreground/85",
                            )}
                          >
                            <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                              {item.authorRole === "developer" ? "Hứa Tiến Dương" : "Bạn"}
                            </p>
                            <p className="whitespace-pre-wrap">{item.message}</p>
                          </div>
                        ))}
                      </div>

                      {ticket.status !== "resolved" && (
                        <div className="mt-3 flex gap-2">
                          <input
                            value={ticketReplies[ticket._id] ?? ""}
                            onChange={(event) =>
                              setTicketReplies((current) => ({
                                ...current,
                                [ticket._id]: event.target.value,
                              }))
                            }
                            placeholder="Phản hồi thêm cho nhà phát triển"
                            className="min-w-0 flex-1 rounded-full border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                          />
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => void handleTicketReply(ticket._id)}
                            disabled={replyingId === ticket._id}
                            className="h-9 w-9 shrink-0 rounded-full"
                            aria-label="Gửi phản hồi"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isDeveloper && (
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold">Bảng quản trị phiếu hỗ trợ</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chỉ Hứa Tiến Dương được nhìn thấy và phản hồi các phiếu từ người dùng.
                  </p>
                  {adminTickets === undefined ? (
                    <p className="text-xs text-muted-foreground">Đang tải phiếu hỗ trợ…</p>
                  ) : adminTickets.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa có phiếu hỗ trợ nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {adminTickets.map((ticket) => (
                        <div key={ticket._id} className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {ticket.subject || "Phiếu hỗ trợ"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {ticket.ticketCode || `Phiếu ${ticket._creationTime}`} · {ticket.type === "bug" ? "Báo lỗi" : "Góp ý"}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                              {supportStatusLabel(ticket.status)}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-background/70 p-3 text-xs leading-relaxed">
                            {ticket.message}
                          </p>
                          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                            {ticket.messages.map((item) => (
                              <div
                                key={item._id}
                                className={cn(
                                  "rounded-xl px-3 py-2 text-xs leading-relaxed",
                                  item.authorRole === "developer"
                                    ? "bg-primary/15"
                                    : "bg-background/70",
                                )}
                              >
                                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                                  {item.authorRole === "developer" ? "Bạn" : "Người dùng"}
                                </p>
                                <p className="whitespace-pre-wrap">{item.message}</p>
                              </div>
                            ))}
                          </div>
                          {ticket.status !== "resolved" && (
                            <div className="mt-3 space-y-2">
                              <div className="flex gap-2">
                                <input
                                  value={adminReplies[ticket._id] ?? ""}
                                  onChange={(event) =>
                                    setAdminReplies((current) => ({
                                      ...current,
                                      [ticket._id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Nhận phản hồi cho người dùng"
                                  className="min-w-0 flex-1 rounded-full border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  onClick={() => void handleDeveloperReply(ticket._id)}
                                  disabled={adminReplyingId === ticket._id}
                                  className="h-9 w-9 shrink-0 rounded-full"
                                  aria-label="Gửi phản hồi"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeveloperReply(ticket._id, "resolved")}
                                disabled={adminReplyingId === ticket._id}
                                className="w-full gap-2 rounded-full"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Đánh dấu đã xử lý
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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

function supportStatusLabel(status: string): string {
  if (status === "resolved") return "Đã xử lý";
  if (status === "reading") return "Đang xem xét";
  return "Đã tiếp nhận";
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
