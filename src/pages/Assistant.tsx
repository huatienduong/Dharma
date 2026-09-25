import { Button } from "@/components/ui/button";
import { showServiceNotice } from "@/components/ServiceNotice";
import { api } from "@/convex/_generated/api";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { loadVoicePref } from "@/lib/aiVoices";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import {
  CHAT_STORAGE_KEY as CHAT_KEY,
  decryptString,
  encryptString,
} from "@/lib/secureStorage";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
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

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  /** Ảnh đi kèm tin nhắn (base64) — chỉ hiển thị, không gửi lại AI */
  image?: { base64: string; mime: string };
};

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
/* Lịch sử hội thoại — MÃ HÓA AES-256-GCM trên thiết bị (không cần đăng  */
/* nhập). Dữ liệu cũ chưa mã hóa được nâng cấp tự động: đọc → mã hóa lại */
/* → ghi đè bản thô, người dùng không mất dữ liệu hiện có.               */
/* ------------------------------------------------------------------ */

async function loadLocalChatSecure(): Promise<Msg[] | null> {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return null;
    let parsed: unknown;
    if (raw.includes(":")) {
      // Bản mã có dạng "iv:cipher" — giải mã trước khi đọc
      const plain = await decryptString(raw);
      if (!plain) return null;
      parsed = JSON.parse(plain);
    } else {
      // Dữ liệu cũ chưa mã hóa → nâng cấp tự động: mã hóa lại, xóa bản thô
      parsed = JSON.parse(raw);
      const upgraded = await encryptString(JSON.stringify(parsed));
      try {
        localStorage.setItem(CHAT_KEY, upgraded);
      } catch {
        /* không ghi được bản mã → giữ nguyên bản thô */
      }
    }
    const arr = parsed as Msg[];
    if (!Array.isArray(arr)) return null;
    // Tin nhắn cũ chưa có mốc giờ → gán thời gian lệch nhau theo thứ tự
    return arr
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m, i, a) => ({
        ...m,
        ts:
          typeof m.ts === "number"
            ? m.ts
            : Date.now() - (a.length - i) * 60_000,
      }));
  } catch {
    return null;
  }
}

/** Lưu lịch sử — LUÔN mã hóa AES-256-GCM trước khi ghi xuống thiết bị. */
async function saveLocalChatSecure(msgs: Msg[]) {
  try {
    const enc = await encryptString(JSON.stringify(msgs.slice(-100)));
    localStorage.setItem(CHAT_KEY, enc);
  } catch {
    /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
  }
}

export default function Assistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";
  const ask = useAction(api.aiChat.ask);
  // Lời chào hằng ngày — tự đổi mới mỗi ngày (query reactive từ máy chủ)
  const dailyGreeting = useQuery(api.library.getDailyGreeting, {});

  const [history, setHistory] = useState<Msg[]>([]);

  // Nạp lịch sử ĐÃ MÃ HÓA từ thiết bị (WebCrypto là bất đồng bộ)
  useEffect(() => {
    let alive = true;
    void loadLocalChatSecure().then((msgs) => {
      if (alive && msgs) setHistory(msgs);
    });
    return () => {
      alive = false;
    };
  }, []);

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
      const userMsg: Msg = {
        role: "user",
        content: q,
        ts: Date.now(),
        // Lưu ảnh đi kèm tin nhắn để hiển thị lại trong hội thoại
        image:
          !opts?.fromCall && image
            ? { base64: image.base64, mime: image.mime }
            : undefined,
      };

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
          const msg = convexErrMessage(firstErr);
          // Lỗi nhất thời (mạng/giới hạn tốc độ/treo provider) → thử lại 1 lần
          if (/hết giờ|timeout|network|fetch|rate|429|5\d\d|ECONN|tạm chưa trả lời/i.test(msg)) {
            reply = await askOnce();
          } else {
            throw firstErr;
          }
        }
        const replyMsg: Msg = { role: "assistant", content: reply, ts: Date.now() };
        setPending((p) => p.filter((m) => m !== userMsg));
        setHistory((h) => {
          const next = [...h, userMsg, replyMsg];
          // Ảnh base64 nặng: chỉ giữ ảnh trong 40 tin nhắn gần nhất, tin cũ
          // hơn bỏ ảnh (giữ chữ) để lịch sử lưu trữ không phình to.
          const cut = Math.max(0, next.length - 40);
          const trimmed = next.map((m, idx) =>
            idx < cut && m.image ? { ...m, image: undefined } : m,
          );
          void saveLocalChatSecure(trimmed);
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
        const userMsg = convexErrMessage(err);
        if (!opts?.fromCall) {
          toast.error(userMsg || "Không gửi được câu hỏi.");
        } else {
          toast.error(userMsg || "Không kết nối được trợ lý.");
          // CHỈ khi lỗi lặp lại cả 2 lần (sự cố thật, không phải lỗi nhất
          // thời) → hiện thông báo dịch vụ; tránh banner sai do 429/timeout.
          const isTransient = /quá nhanh|giới hạn|429|hết giờ|timeout|ECONN|fetch|tạm chưa trả lời/i.test(
            userMsg,
          );
          if (!isTransient && /chưa kết nối được|máy chủ AI/i.test(userMsg)) {
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
      {/* ---------- Header: tiêu đề sát trái, cụm 3 nút sát phải ---------- */}
      <header className="grid h-16 shrink-0 grid-cols-[1fr_auto] items-center gap-1 border-b border-border/60 bg-background px-2 sm:px-4">
        {/* Trái: Tiêu đề sát lề trái (+ nút quay lại khi mở từ trang khác) */}
        <div className="flex items-center gap-1 justify-self-start">
          <p className="whitespace-nowrap text-sm font-extrabold uppercase tracking-[0.08em] leading-tight text-foreground sm:text-[17px] sm:tracking-[0.16em]">
            Trợ lý Phật học
          </p>
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-accent"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        {/* Phải: Đàm thoại (1) + Xóa hội thoại (2) + Cài đặt (3) — icon sát nhau, sát lề phải */}
        <div className="flex items-center gap-0 justify-self-end">
          <Button
            onClick={openCall}
            className="h-11 w-11 justify-center rounded-full p-0 shadow-sm sm:w-auto sm:px-4"
            aria-label="Đàm thoại bằng giọng nói"
          >
            <Phone className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline">Đàm thoại</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void clearAll()}
            title="Xóa hội thoại"
            aria-label="Xóa hội thoại"
            className="-ml-1.5 h-11 w-11 rounded-full"
          >
            <Eraser className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings?section=about")}
            title="Cài đặt & cập nhật ứng dụng"
            aria-label="Cài đặt và cập nhật ứng dụng"
            className="-ml-1.5 h-11 w-11 rounded-full"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* ---------- Khu hội thoại: chiếm toàn bộ phần còn lại ---------- */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Xin chào 🙏
            </h2>
            {/* Lời chào hằng ngày — tự đổi mới mỗi ngày từ máy chủ */}
            <p className="mt-2 max-w-md text-base font-medium leading-relaxed text-foreground/85">
              {dailyGreeting ?? "Chúc bạn một ngày an lạc."}
            </p>
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
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-base leading-snug text-foreground/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50"
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
          <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3 sm:px-4 [&>*:first-child]:mt-0">
            {messages.map((m, i) => {
              // Nhóm tin nhắn liên tiếp cùng người gửi — kiểu Messenger
              const grouped = i > 0 && messages[i - 1].role === m.role;
              return m.role === "user" ? (
                <UserMessage
                  key={i}
                  content={m.content}
                  ts={m.ts}
                  grouped={grouped}
                  image={m.image}
                />
              ) : (
                <AssistantMessage key={i} content={m.content} ts={m.ts} grouped={grouped} />
              );
            })}
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

          <div className="flex items-end gap-1.5 rounded-[26px] border border-border/70 bg-card p-2 shadow-lg transition focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15">
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
              className="max-h-40 min-h-14 flex-1 resize-none self-center bg-transparent py-2.5 text-[18px] leading-relaxed outline-none placeholder:text-muted-foreground/60 sm:text-[19px]"
            />

            {micSupported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start(onVoiceChat))}
                aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
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
              className="h-11 w-11 shrink-0 rounded-full"
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

function AssistantMessage({
  content,
  ts,
  grouped,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-2", grouped ? "mt-1.5" : "mt-5")}>
      {/* Avatar robot ở TRÊN — thẳng hàng đầu bong bóng trả lời */}
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 sm:max-w-[75%]">
        <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-2.5 text-[18px] leading-[1.8] text-foreground/95 shadow-sm sm:text-[19px]">
          {content}
        </div>
        <p className="mt-1 pl-2 text-[12px] text-muted-foreground/70">{formatTs(ts)}</p>
      </div>
    </div>
  );
}

function UserMessage({
  content,
  ts,
  grouped,
  image,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
  image?: { base64: string; mime: string };
}) {
  return (
    <div className={cn("flex justify-end", grouped ? "mt-1.5" : "mt-5")}>
      <div className="flex max-w-[86%] flex-col items-end sm:max-w-[78%]">
        {/* Ảnh đi kèm — nằm ngay trên bong bóng tin nhắn, bo góc mềm */}
        {image && (
          <img
            src={`data:${image.mime};base64,${image.base64}`}
            alt="Ảnh người dùng gửi kèm"
            className="mb-1.5 max-h-64 w-auto max-w-full rounded-2xl border border-border/60 object-cover shadow-sm"
          />
        )}
        {content && (
          <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[18px] leading-[1.8] text-primary-foreground shadow-sm sm:text-[19px]">
            {content}
          </div>
        )}
        <p className="mt-1 pr-2 text-[12px] text-muted-foreground/70">{formatTs(ts)}</p>
      </div>
    </div>
  );
}

/**
 * Định dạng thời gian tin nhắn — LUÔN có ngày tháng cạnh giờ:
 * hôm nay → "14:05 · Hôm nay"; hôm trước → "14:05 · 24/09";
 * khác năm → "14:05 · 24/09/2025".
 */
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
  if (sameDay) return `${time} · Hôm nay`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = sameYear
    ? d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    : d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  return `${time} · ${date}`;
}

/**
 * Bóc thông điệp lỗi từ backend Convex — ConvexError trên production gửi
 * thông điệp qua thuộc tính `data` (có thể bọc trong Error.message dạng
 * chuỗi JSON). Trả về chuỗi đọc được cho người dùng.
 */
function convexErrMessage(err: unknown): string {
  if (!err) return "";
  // ConvexError client-side: { data: "thông điệp" }
  const direct = (err as { data?: unknown }).data;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (direct && typeof direct === "object") {
    const m = (direct as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) {
    const raw = err.message;
    // Chuỗi dạng JSON: {"data":"..."} hoặc {"message":"..."}
    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw) as { data?: unknown; message?: unknown };
        if (typeof parsed.data === "string" && parsed.data.trim()) return parsed.data;
        if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      } catch {
        /* không phải JSON — dùng nguyên chuỗi */
      }
    }
    return raw;
  }
  return String(err);
}

function AssistantThinking() {
  return (
    <div className="mt-5 flex items-start gap-2">
      {/* Avatar robot ở TRÊN, đồng hàng với bong bóng chờ */}
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-4 w-4" />
      </span>
      <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-3.5 shadow-sm">
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
