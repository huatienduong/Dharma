import { api } from "@/convex/_generated/api";
import { LegalDocs } from "@/components/LegalDocs";
import { wipeSecureStorage } from "@/lib/secureStorage";
import { loadYouTubeKey, saveYouTubeKey } from "@/lib/youtubeKey";
import {
  APP_DEVELOPER,
  APP_NAME,
  APP_VERSION,
} from "@/lib/version";
import {
  useSettings,
} from "@/lib/settings";
import { Button } from "@/components/ui/button";
import {
  VOICE_LIST,
  loadVoicePref,
  saveVoicePref,
  type AiVoice,
} from "@/lib/aiVoices";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import {
  ArrowLeft,
  Bell,
  Bug,
  CheckCircle2,
  ChevronRight,
  Download,
  KeyRound,
  Lightbulb,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router";

/** Câu thử giọng — ngắn để tiết kiệm hạn mức TTS nhưng đủ để nghe chất giọng. */
const VOICE_PREVIEW_TEXT =
  "Xin chào bạn. Tôi là trợ lý Phật học của bạn.";

const FEEDBACK_BUG_MESSAGE =
  "Chúng tôi đã ghi nhận yêu cầu hỗ trợ khắc phục sự cố và sẽ tiến hành kiểm tra khắc phục. Xin trân thành cảm ơn!";
const FEEDBACK_IDEA_MESSAGE =
  "Chúng tôi đã ghi nhận và sẽ xem xét để cải thiện, cảm ơn bạn đã góp ý cho Trợ lý Phật học!";

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    t,
    setNotifications,
  } = useSettings();
  const meta = useQuery(api.library.getAppVersion, {});
  // Đọc khoá đã lưu để hiện đúng trạng thái trong Cài đặt.
  useEffect(() => {
    let alive = true;
    void loadYouTubeKey().then((k) => {
      if (alive) setYtKey(k);
    });
    return () => {
      alive = false;
    };
  }, []);
  const submitFeedback = useMutation(api.library.submitFeedback);
  const sendFeedbackEmail = useAction(api.library.emailFeedback);

  // Mục đang mở rộng (accordion) — mỗi mục một thẻ trắng như app hệ thống.
  // Hỗ trợ deep-link từ Trợ lý: /settings?section=about mở sẵn phần Giới thiệu
  // (kiểm tra & cập nhật phiên bản ứng dụng).
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const validSection =
    sectionParam === "appearance" ||
    sectionParam === "voice" ||
    sectionParam === "video" ||
    sectionParam === "about" ||
    sectionParam === "feedback" ||
    sectionParam === "legal"
      ? sectionParam
      : null;
  const [openCard, setOpenCard] = useState<
    null | "appearance" | "voice" | "video" | "about" | "feedback" | "legal"
  >(validSection);
  const toggle = (key: typeof openCard) =>
    setOpenCard((cur) => (cur === key ? null : key));

  // Giọng đọc: lưu localStorage, Trợ lý đọc lại mỗi khi mở nên chọn ở đây
  // có hiệu lực ngay (không cần tải lại ứng dụng).
  const [voiceId, setVoiceId] = useState<string>(loadVoicePref);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const { speak, stop } = useVietnameseTTS();

  const pickVoice = (v: AiVoice) => {
    setVoiceId(v.id);
    saveVoicePref(v.id);
    toast.success(`Đã chọn giọng ${v.name.replace(/^(Nữ|Nam) — /, "")}`);
  };

  const previewVoice = async (v: AiVoice) => {
    // Bấm lại đúng giọng đang phát → dừng. Bấm giọng KHÁC → cắt giọng cũ và
    // phát giọng mới ngay. Trước đây mọi lượt bấm đều chỉ dừng, nên bấm thử
    // giọng thứ hai không bao giờ ra tiếng — người dùng tưởng mẫu giọng bị
    // treo hoặc đọc sai.
    if (previewing === v.id) {
      stop();
      setPreviewing(null);
      return;
    }
    if (previewing) stop();
    setPreviewing(v.id);
    const myId = v.id;
    try {
      await speak(VOICE_PREVIEW_TEXT, {
        voice: v.id,
        male: v.male,
        // Chỉ mở nút của đúng lượt này khi nó kết thúc — nếu không, onDone
        // của lượt cũ sẽ tắt luôn nút của lượt mới đang phát.
        onDone: () => setPreviewing((cur) => (cur === myId ? null : cur)),
      });
    } catch {
      setPreviewing((cur) => (cur === myId ? null : cur));
    }
  };

  // Khoá API YouTube (tìm & xem video trong khung chat) — lưu mã hoá trên
  // thiết bị, không gửi đi đâu. Rỗng = không dán khoá, vẫn xem được video
  // khi dán link YouTube.
  const [ytKey, setYtKey] = useState("");
  const [ytKeyInput, setYtKeyInput] = useState("");

  const saveYtKey = async () => {
    await saveYouTubeKey(ytKeyInput);
    setYtKeyInput("");
    setYtKey("");
    toast.success("Đã lưu khoá YouTube. Từ giờ hỏi về video là xem được ngay.");
  };
  const removeYtKey = async () => {
    await saveYouTubeKey("");
    setYtKeyInput("");
    setYtKey("");
    toast.success("Đã xoá khoá YouTube khỏi thiết bị.");
  };

  const [fbType, setFbType] = useState<"idea" | "bug">("idea");
  const [fbMessage, setFbMessage] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbFile, setFbFile] = useState<File | null>(null);
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
        fbType === "bug" && detectedDevice
          ? `\n[Thiết bị: ${detectedDevice}]`
          : "";
      const ticketMessage = `${fbMessage}${attachmentNote}${deviceNote}`;
      const result = await submitFeedback({
        type: fbType,
        message: ticketMessage,
        email: fbEmail || undefined,
        appVersion: APP_VERSION,
      });

      try {
        await sendFeedbackEmail({
          type: fbType,
          message: ticketMessage,
          email: fbEmail || undefined,
          appVersion: APP_VERSION,
          ticketCode: result.ticketCode,
        });
      } catch {
        // Phiếu vẫn được lưu an toàn nếu chưa thể gửi email.
      }

      toast.success(
        fbType === "bug" ? FEEDBACK_BUG_MESSAGE : FEEDBACK_IDEA_MESSAGE,
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
        <div className="flex items-center justify-center">
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
        {/* Giao diện: ứng dụng chỉ có MỘT tông màu nâu, đã bỏ tuỳ chọn
            Sáng/Tối nên không còn mục này ở đây. */}

        {/* ---------- Thông báo (toggle ngay trên hàng) ---------- */}
        <div className="ds-card flex items-center justify-between gap-4 px-5 py-5">
          <p className="text-[16px] font-semibold">{t("notifications")}</p>
          <Switch
            checked={settings.notifications}
            onChange={(v) => setNotifications(v)}
            label="Thông báo"
          />
        </div>

        {/* ---------- Giọng nói ---------- */}
        <RowCard
          label="Giọng nói"
          open={openCard === "voice"}
          onClick={() => toggle("voice")}
        >
          <div className="pt-1">
            <div className="grid gap-2 sm:grid-cols-2">
              {VOICE_LIST.map((v) => {
                const active = voiceId === v.id;
                const playing = previewing === v.id;
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition",
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pickVoice(v)}
                      aria-pressed={active}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          active ? "text-primary" : "text-foreground/85",
                        )}
                      >
                        {v.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {v.desc}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void previewVoice(v)}
                      aria-label={`Thử giọng ${v.name}`}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                        active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary",
                      )}
                    >
                      {playing ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </RowCard>

        {/* ---------- Giới thiệu / Phiên bản ---------- */}
        {/* ---------- Video YouTube ---------- */}
        <RowCard
          label="Video YouTube"
          open={openCard === "video"}
          onClick={() => toggle("video")}
        >
          <div className="space-y-3 pt-1">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Muốn hỏi Trợ lý về video và xem ngay trong khung chat thì dán
              khoá YouTube Data API v3 vào đây. Khoá được mã hoá và chỉ lưu
              trên máy này, không gửi đi đâu.
            </p>
            {ytKey ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <p className="text-sm font-semibold">Đã có khoá</p>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    ••••{ytKey.slice(-4)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={removeYtKey}
                  className="w-full gap-1.5 rounded-full"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xoá khoá
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={ytKeyInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setYtKeyInput(e.target.value)
                  }
                  placeholder="Dán khoá API YouTube"
                  aria-label="Khoá API YouTube"
                  className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
                />
                <Button
                  size="sm"
                  onClick={saveYtKey}
                  disabled={!ytKeyInput.trim()}
                  className="w-full gap-1.5 rounded-full"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Lưu khoá
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Chưa có khoá vẫn xem được video khi bạn dán link YouTube
                  vào khung chat.
                </p>
              </div>
            )}
          </div>
        </RowCard>

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
                  <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Phiên bản ứng dụng
                    </span>
                    <span className="mt-0.5 block w-full text-sm text-foreground/90">
                      {APP_VERSION}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Thiết bị / hệ điều hành
                    </span>
                    <span className="mt-0.5 block w-full text-sm text-foreground/90">
                      {detectedDevice}
                    </span>
                  </div>
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
