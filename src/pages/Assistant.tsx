import { Button } from "@/components/ui/button";
import { showServiceNotice } from "@/components/ServiceNotice";
import { api } from "@/convex/_generated/api";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { loadVoicePref } from "@/lib/aiVoices";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import { cn } from "@/lib/utils";
import { useAction } from "convex/react";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  BookOpen,
  Eraser,
  Heart,
  ImagePlus,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Scale,
  Send,
  Settings,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const SUGGESTIONS: { icon: typeof BookOpen; text: string }[] = [
  { icon: Sparkles, text: "Tứ Diệu Đế là gì?" },
  { icon: Heart, text: "Hướng dẫn thiền niệm hơi thở cho người mới" },
  { icon: BookOpen, text: "Kinh Ananda khác Kinh Kim Cang chỗ nào?" },
  { icon: Scale, text: "Mình nên bắt đầu tập tu như thế nào?" },
];

/* ------------------------------------------------------------------ */
/* Nhận diện giọng nói cho chế độ ĐÀM THOÁI RẢNH TAY (continuous)      */
/* — tách khỏi useVoiceSearch (chỉ nghe từng câu) để tự khởi động lại  */
/* ------------------------------------------------------------------ */

type RecResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type RecLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function newRecognition(): RecLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecLike;
    webkitSpeechRecognition?: new () => RecLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/* ------------------------------------------------------------------ */
/* Lịch sử hội thoại lưu CỤC BỘ trên thiết bị (không cần đăng nhập)     */
/* ------------------------------------------------------------------ */

const CHAT_KEY = "ds-assistant-history";

function loadLocalChat(): Msg[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Msg[];
    if (!Array.isArray(parsed)) return [];
    // Tin nhắn cũ chưa có mốc giờ → gán thời gian lệch nhau theo thứ tự
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m, i, arr) => ({
        ...m,
        ts:
          typeof m.ts === "number"
            ? m.ts
            : Date.now() - (arr.length - i) * 60_000,
      }));
  } catch {
    return [];
  }
}

function saveLocalChat(msgs: Msg[]) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-100)));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

export default function Assistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";
  const ask = useAction(api.aiChat.ask);

  const [history, setHistory] = useState<Msg[]>(loadLocalChat);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  // FIX "không phản hồi": đếm thời gian chờ AI — quá 60s hiển thị lỗi
  // thay vì đứng ở "đang suy niệm" vĩnh viễn (provider treo không trả).
  const [stalled, setStalled] = useState(false);
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const { speak: speakVI, stop: stopSpeaking } = useVietnameseTTS();
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ----- Giọng đọc người dùng chọn (lưu cục bộ, dùng cho chat + đàm thoại) ----- */
  const [voiceId, setVoiceId] = useState<string>(loadVoicePref);
  const voiceIdRef = useRef(voiceId);
  useEffect(() => {
    voiceIdRef.current = voiceId;
  }, [voiceId]);

  /* ================= CHẾ ĐỘ ĐÀM THOÁI (kiểu Gemini Live) ============== */
  /* Nói như gọi điện: AI nghe liên tục, tự gửi khi bạn ngừng câu, tự     */
  /* trả lời bằng giọng nói rồi lại nghe tiếp — KHÔNG cần bấm mic.        */

  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "listening" | "thinking" | "speaking" | "muted"
  >("listening");
  const [interim, setInterim] = useState("");

  const callActiveRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const sendingRef = useRef(false);
  const mutedRef = useRef(false);
  const micDeniedRef = useRef(false);
  const busyRef = useRef(false);
  const lastAiWordAtRef = useRef(0);
  const lastAssistantEventAtRef = useRef(0);
  const recRef = useRef<RecLike | null>(null);
  const startListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  /* ----- Watchdog đàm thoại 2 chiều: nếu phiên nghe mic rơi/treo quá 12s
   * (trình duyệt âm thầm dừng SpeechRecognition, tab bị treo ngắn…) thì tự
   * khởi động lại — cuộc gọi không bao giờ "đứng hình" vô tiếng. ----- */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (
        callActiveRef.current &&
        !mutedRef.current &&
        !micDeniedRef.current &&
        !aiSpeakingRef.current &&
        !sendingRef.current &&
        Date.now() - lastAssistantEventAtRef.current > 12_000
      ) {
        lastAssistantEventAtRef.current = Date.now();
        startListeningRef.current();
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  // Đồng hồ phòng treo: nếu AI không trả lời trong 60s → báo lỗi ra UI
  useEffect(() => {
    if (!busy) {
      setStalled(false);
      return;
    }
    const id = window.setTimeout(() => setStalled(true), 30_000);
    return () => window.clearTimeout(id);
  }, [busy]);

  /* ----- Mở khóa autoplay âm thanh (chạm/bấm đầu tiên) ----- */
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new AudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        void ctx.resume();
      } catch {
        /* trình duyệt cũ — bỏ qua */
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* ----- Gộp lịch sử cục bộ + tin nhắn phiên ----- */
  const messages: Msg[] = [...history, ...pending];

  // Tự cuộn xuống cuối
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, busy]);

  /* ----- Gửi câu hỏi (chat + đàm thoại dùng chung) ----- */
  const send = useCallback(
    async (text: string, opts?: { fromCall?: boolean }) => {
      const q = text.trim();
      if (!q || busy) return;

      const base: Msg[] = [...history, ...pending];
      const userMsg: Msg = { role: "user", content: q, ts: Date.now() };

      if (!opts?.fromCall) {
        setInput("");
        setImage(null);
      }
      // Luôn thêm vào phiên (kể cả call) để giữ ngữ cảnh và không mất lịch sử
      setPending((p) => [...p, userMsg]);
      setBusy(true);

      // FIX "không phản hồi": thử lại 1 lần khi lỗi mạng nhất thời —
      // chỉ lỗi nghiệp vụ (câu hỏi trống…) mới dừng ngay.
      const askOnce = () =>
        ask({
          messages: [...base, { role: "user", content: q }],
          imageBase64: opts?.fromCall ? undefined : image?.base64,
          imageMime: opts?.fromCall ? undefined : image?.mime,
          ...getDeviceMeta(),
        });

      try {
        let reply: string;
        try {
          reply = await askOnce();
        } catch (firstErr) {
          const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
          // Lỗi nhất thời (mạng/giới hạn tốc độ/treo provider) → thử lại 1 lần
          if (/hết giờ|timeout|network|fetch|rate|429|5\d\d|ECONN/i.test(msg)) {
            reply = await askOnce();
          } else {
            throw firstErr;
          }
        }
        const replyMsg: Msg = { role: "assistant", content: reply, ts: Date.now() };
        setPending((p) => p.filter((m) => m !== userMsg));
        setHistory((h) => {
          const next = [...h, userMsg, replyMsg];
          saveLocalChat(next);
          return next;
        });
        if (opts?.fromCall) {
          // Trong cuộc gọi: đọc to bằng giọng người dùng đã chọn — server TTS
          // trước (Gemini/OpenAI), quá 12s hoặc lỗi thì tự rơi về giọng trình
          // duyệt; đọc xong tự nghe tiếp → đàm thoại 2 chiều liền mạch.
          if (!callActiveRef.current) return;
          aiSpeakingRef.current = true;
          sendingRef.current = false;
          setInterim("");
          setCallStatus("speaking");
          lastAssistantEventAtRef.current = Date.now();
          void speakVI(reply, {
            voice: voiceIdRef.current,
            onDone: () => {
              aiSpeakingRef.current = false;
              lastAiWordAtRef.current = Date.now();
              lastAssistantEventAtRef.current = Date.now();
              if (!callActiveRef.current) return;
              setCallStatus("listening");
              startListeningRef.current();
            },
          });
        } else {
          // CHAT: ĐÃ LOẠI BỎ tự động đọc âm thanh — chỉ trả lời văn bản;
          // muốn nghe thì bấm nút loa ở từng câu trả lời.
        }
      } catch (err) {
        if (!opts?.fromCall) {
          toast.error(
            err instanceof Error ? err.message : "Không gửi được câu hỏi.",
          );
        } else {
          toast.error(
            err instanceof Error ? err.message : "Không kết nối được trợ lý.",
          );
          // Tính năng không phản hồi do sự cố kết nối → hiện thông báo dịch vụ
          if (/không kết nối|hết giờ|timeout|network|fetch/i.test(String(err))) {
            showServiceNotice("upgrade");
          }
          sendingRef.current = false;
          if (callActiveRef.current) {
            setCallStatus("listening");
            window.setTimeout(() => startListeningRef.current(), 800);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [ask, busy, history, image, pending],
  );

  /* ----- Đàm thoại: xử lý một câu người dùng vừa nói ----- */
  const handleUtterance = useCallback(
    (text: string) => {
      if (busyRef.current || sendingRef.current) {
        window.setTimeout(() => startListeningRef.current(), 600);
        return;
      }
      setInterim("");
      sendingRef.current = true;
      setCallStatus("thinking");
      lastAssistantEventAtRef.current = Date.now();
      void send(text, { fromCall: true });
    },
    [send],
  );

  /* ----- Đàm thoại: bắt đầu một phiên nghe liên tục ----- */
  const startListening = useCallback(() => {
    if (
      !callActiveRef.current ||
      mutedRef.current ||
      micDeniedRef.current ||
      aiSpeakingRef.current ||
      sendingRef.current
    ) {
      return;
    }
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    const rec = newRecognition();
    if (!rec) {
      micDeniedRef.current = true;
      setCallStatus("muted");
      return;
    }
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalBuf = "";
    rec.onstart = () => {
      lastAssistantEventAtRef.current = Date.now();
      if (callActiveRef.current) setCallStatus("listening");
    };
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += r[0].transcript;
        else setInterim(r[0].transcript);
      }
      const t = finalBuf.trim();
      if (
        t.length >= 2 &&
        !aiSpeakingRef.current &&
        !sendingRef.current &&
        Date.now() - lastAiWordAtRef.current > 350
      ) {
        finalBuf = "";
        recRef.current = null;
        try {
          rec.onend = null;
          rec.stop();
        } catch {
          /* noop */
        }
        handleUtterance(t);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        micDeniedRef.current = true;
        setCallStatus("muted");
        toast.error("Cần cấp quyền micro để đàm thoại bằng giọng nói.");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      if (
        callActiveRef.current &&
        !mutedRef.current &&
        !micDeniedRef.current &&
        !aiSpeakingRef.current &&
        !sendingRef.current
      ) {
        window.setTimeout(() => {
          if (callActiveRef.current) startListeningRef.current();
        }, 300);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* đã start — bỏ qua */
    }
  }, [handleUtterance]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const openCall = useCallback(() => {
    if (!micSupported) {
      toast.error(
        "Trình duyệt không hỗ trợ micro. Hãy dùng Chrome/Safari mới nhất.",
      );
      return;
    }
    stopSpeaking();
    micDeniedRef.current = false;
    mutedRef.current = false;
    sendingRef.current = false;
    aiSpeakingRef.current = false;
    busyRef.current = false;
    setInterim("");
    setCallStatus("listening");
    setCallOpen(true);
    callActiveRef.current = true;
    lastAssistantEventAtRef.current = Date.now();
    window.setTimeout(() => startListeningRef.current(), 400);
  }, [micSupported, stopSpeaking]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    recRef.current = null;
    stopSpeaking();
    sendingRef.current = false;
    aiSpeakingRef.current = false;
    setCallOpen(false);
    setCallStatus("listening");
  }, [stopSpeaking]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
      setInterim("");
      setCallStatus("muted");
    } else {
      lastAssistantEventAtRef.current = Date.now();
      setCallStatus("listening");
      startListeningRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const pickImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setImage({ base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearAll = async () => {
    setPending([]);
    setHistory([]);
    try {
      localStorage.removeItem(CHAT_KEY);
    } catch {
      /* noop */
    }
  };

  const onVoiceChat = useCallback(
    (text: string) => {
      void send(text);
    },
    [send],
  );

  const isEmpty = messages.length === 0;

  /* ================================================================ */
  /* FULL MÀN HÌNH — cả viewport là Trợ lý Phật học Dharma AI            */
  /* ================================================================ */
  return (
    <div className="fb-bg flex h-[100dvh] flex-col overflow-hidden">
      {/* ---------- Header mảnh, cân đối ---------- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background px-2 sm:px-4">
        {/* Trái: Đàm thoại (+ nút quay lại khi mở từ trang khác) */}
        <div className="flex shrink-0 items-center gap-1">
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Button
            onClick={openCall}
            className="h-9 gap-1.5 rounded-full px-3 shadow-sm sm:px-4"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Đàm thoại</span>
          </Button>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[15px] font-extrabold uppercase tracking-[0.18em] leading-tight text-foreground">
            Trợ lý Phật học
          </p>
        </div>
        {/* Phải: Cài đặt + Xóa hội thoại */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings?section=about")}
            title="Cài đặt & cập nhật ứng dụng"
            aria-label="Cài đặt và cập nhật ứng dụng"
            className="h-9 w-9 rounded-full"
          >
            <Settings className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void clearAll()}
            title="Xóa hội thoại"
            aria-label="Xóa hội thoại"
            className="h-9 w-9 rounded-full"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ---------- Khu hội thoại: chiếm toàn bộ phần còn lại ---------- */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Xin chào 🙏
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Hôm nay tôi có thể giúp gì cho bạn trên con đường Phật pháp?
            </p>
            <div className="mt-7 grid w-full max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => void send(s.text)}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-[15px] leading-snug text-foreground/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">{s.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-7 px-3 pb-8 pt-3 sm:px-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={i} content={m.content} ts={m.ts} />
              ) : (
                <AssistantMessage key={i} content={m.content} ts={m.ts} />
              ),
            )}
            {busy && (stalled ? (
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="pt-2 text-sm text-muted-foreground">
                  Trả lời quá lâu hoặc kết nối không ổn định — hãy thử gửi lại câu hỏi.
                </p>
              </div>
            ) : (
              <AssistantThinking />
            ))}
          </div>
        )}
      </div>

      <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4"
        >
          {image && (
            <div className="mb-2 flex items-center gap-2 pl-1">
              <div className="relative">
                <img
                  src={`data:${image.mime};base64,${image.base64}`}
                  alt="Ảnh sẽ gửi"
                  className="h-16 w-16 rounded-xl border border-border/60 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                  aria-label="Xóa ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                Ảnh kèm câu hỏi
              </span>
            </div>
          )}

          <div className="flex items-end gap-1 rounded-[26px] border border-border/70 bg-card p-2 shadow-lg transition focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              aria-label="Gửi ảnh cho AI"
              title="Gửi ảnh (tượng Phật, kinh sách, chữ Pāli…)"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder=""
              className="max-h-40 min-h-12 flex-1 resize-none self-center bg-transparent py-2.5 text-[17px] outline-none placeholder:text-muted-foreground/60 sm:text-lg"
            />

            {micSupported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start(onVoiceChat))}
                aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
                  listening && "bg-destructive/10 text-destructive",
                )}
              >
                <Mic className="h-5 w-5" />
                {listening && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  </span>
                )}
              </button>
            )}

            <Button
              type="submit"
              size="icon"
              disabled={busy || (!input.trim() && !image)}
              className="h-10 w-10 shrink-0 rounded-full"
              aria-label="Gửi câu hỏi"
            >
              {busy ? (
                <AudioLines className="h-5 w-5 animate-pulse" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

        </form>

      {callOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#09090b] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55rem 38rem at 50% 42%, rgba(245,158,11,0.15), transparent 62%), linear-gradient(180deg, rgba(17,17,17,0.96), rgba(9,9,11,1))",
            }}
          />

          <div className="relative z-10 flex h-full w-full max-w-[1800px] flex-col">
            <div className="flex w-full items-center justify-between px-5 pt-5 sm:px-8">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-700">
                  <Bot className="h-4 w-4 text-white" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                    Trợ lý Phật học
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={endCall}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-6">
              <div
                className={cn(
                  "orb-shell h-52 w-52 sm:h-64 sm:w-64 lg:h-80 lg:w-80",
                  callStatus === "listening" && "orb-listening",
                  callStatus === "speaking" && "orb-speaking",
                  callStatus === "thinking" && "orb-thinking",
                  callStatus === "muted" && "opacity-50",
                )}
              >
                <div className="orb-core" />
              </div>

              <p className="mt-8 text-center text-xl font-medium tracking-wide text-white/90 sm:text-2xl">
                {callStatus === "listening"
                  ? "Đang nghe"
                  : callStatus === "thinking"
                    ? "Đang suy niệm"
                    : callStatus === "speaking"
                      ? "Đang trả lời"
                      : "Micro đã tắt"}
              </p>

              {/* Chỉ hiển thị trạng thái ngắn — không còn văn bản trả lời/caption */}
            </div>

            <div className="relative z-10 flex items-center justify-center gap-6 pb-[max(1.6rem,env(safe-area-inset-bottom))] pt-2">
              {callStatus !== "muted" ? (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                  aria-label="Tắt micro"
                  title="Tắt micro"
                >
                  <Mic className="h-7 w-7" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-amber-500/20 backdrop-blur transition hover:bg-amber-500/30"
                  aria-label="Bật micro"
                  title="Bật micro"
                >
                  <MicOff className="h-7 w-7" />
                </button>
              )}

              <button
                type="button"
                onClick={endCall}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition hover:bg-red-400 active:scale-95"
                aria-label="Kết thúc đàm thoại"
                title="Kết thúc"
              >
                <PhoneOff className="h-8 w-8" />
              </button>

              <div className="flex h-16 w-16 items-center justify-center">
                {callStatus === "speaking" && (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      aiSpeakingRef.current = false;
                      sendingRef.current = false;
                      lastAssistantEventAtRef.current = Date.now();
                      setCallStatus("listening");
                      startListeningRef.current();
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                    aria-label="Ngừng đọc"
                    title="Ngừng đọc"
                  >
                    <Square className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AssistantMessage({ content, ts }: { content: string; ts: number }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap text-[17px] leading-[1.85] text-foreground/95 sm:text-lg">
          {content}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground/70">{formatTs(ts)}</p>
      </div>
    </div>
  );
}

function UserMessage({ content, ts }: { content: string; ts: number }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-muted px-4 py-3 text-[17px] leading-[1.75] sm:text-lg">
        {content}
      </div>
      <p className="mt-1 pr-2 text-xs text-muted-foreground/70">{formatTs(ts)}</p>
    </div>
  );
}

/** Định dạng thời gian tin nhắn: "14:05" hôm nay, "14:05 · 24/09" hôm trước. */
function formatTs(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return time;
  const date = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${time} · ${date}`;
}

function AssistantThinking() {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex h-10 items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-gold/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
