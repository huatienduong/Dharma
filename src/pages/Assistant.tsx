import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AudioLines,
  Eraser,
  ImagePlus,
  Mic,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Namo Tassa Bhagavato Arahato Sammā Sambuddhassa.\n\nXin chào, tôi là Trợ lý Phật học. Hãy hỏi về giáo lý, kinh điển Pāli, thiền định hay thực hành theo truyền thống Theravāda — tôi sẽ trả lời trong phạm vi Phật học.";

const SUGGESTIONS = [
  "Tứ Diệu Đế là gì?",
  "Hướng dẫn thiền niệm hơi thở cho người mới",
  "Thiền Vipassanā khác Samatha như thế nào?",
  "Ý nghĩa của Bát Chánh Đạo",
];

export default function Assistant() {
  const { isAuthenticated, isLoading } = useAuth();
  const ask = useAction(api.aiChat.ask);
  const append = useMutation(api.aiChat.appendMessages);
  const clear = useMutation(api.aiChat.clearMessages);
  const saved = useQuery(api.aiChat.listMessages, {});

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Msg[]>([]); // tin nhắn chưa lưu
  const [busy, setBusy] = useState(false);
  // Đọc đáp án MẶC ĐỊNH BẬT — ẩn khỏi giao diện (theo yêu cầu)
  // Ảnh đính kèm (nén về max 1024px, JPEG ~0.82)
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ----- Chế độ Call: đàm thoại 2 bên bằng giọng nói -----
  const [callMode, setCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");

  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const { speak: speakVI, stop: stopSpeaking, speaking, engine: ttsEngine } =
    useVietnameseTTS();
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ----- MỞ KHÓA AUTOPLAY ÂM THANH -----
     Trình duyệt chặn Audio.play() cho đến khi người dùng tương tác (bấm/
     chạm). Ghi lại flag sau tương tác ĐẦU TIÊN (bấm mic/bấm bất kỳ nút)
     để TTS được phát tự động mà không bị chặn lần đầu. */
  const audioUnlockedRef = useRef(false);
  useEffect(() => {
    const unlock = () => {
      audioUnlockedRef.current = true;
      // Tạo + phát 1 audio tĩnh vô thanh để "mở khóa" autoplay policy
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
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Gộp: lịch sử đã lưu + tin nhắn mới trong phiên
  const messages: Msg[] = [
    ...(saved ?? []).map((m) => ({
      role: m.role as Msg["role"],
      content: m.content,
    })),
    ...pending,
  ];

  // Tự cuộn xuống cuối
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, busy]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if ((!q && !image) || busy) return;
      const img = image;
      const display = q || "📷 Hình ảnh";

      // Gom lịch sử + câu hỏi hiện tại
      const history: Msg[] = [
        ...(saved ?? []).map((m) => ({
          role: m.role as Msg["role"],
          content: m.content,
        })),
        ...pending,
      ];
      const userMsg: Msg = { role: "user", content: display };
      setInput("");
      setImage(null);
      setPending((p) => [...p, userMsg]);
      setBusy(true);
      setCallStatus("thinking");
      try {
        const reply = await ask({
          messages: [...history, { role: "user", content: display }],
          imageBase64: img?.base64,
          imageMime: img?.mime,
        });
        setPending((p) => [...p, { role: "assistant", content: reply }]);
        if (isAuthenticated) {
          void append({
            items: [
              { role: "user", content: display },
              { role: "assistant", content: reply },
            ],
          });
          setPending([]);
        }
        // Luôn đọc đáp án (tự động, không cần bật tắt).
        // Nếu autoplay bị chặn (người dùng chưa từng tương tác) → báo lỗi
        // rõ ràng để họ bấm nút loa nghe lại thay vì im lặng vô căn cứ.
        if (callMode) setCallStatus("speaking");
        try {
          await speakVI(reply, () => {
            if (callMode) setCallStatus("listening");
          });
        } catch {
          toast.error(
            "Trình duyệt chặn âm thanh tự động. Bấm nút loa hoặc chạm màn hình rồi thử lại.",
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Không gửi được câu hỏi.",
        );
      } finally {
        setBusy(false);
      }
    },
    [
      ask,
      append,
      busy,
      image,
      isAuthenticated,
      pending,
      saved,
      callMode,
      speakVI,
    ],
  );

  // Hỏi bằng giọng nói → tự gửi (trong call: nghe → gửi → đọc → nghe tiếp)
  const onVoice = useCallback(
    (text: string) => {
      if (callMode) {
        void send(text);
      } else {
        setInput(text);
        void send(text);
      }
    },
    [send, callMode],
  );

  // ----- Nén ảnh trước khi gửi (canvas resize tối đa 1024px) -----
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
        setImage({
          base64: dataUrl.split(",")[1] ?? "",
          mime: "image/jpeg",
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Dừng đọc khi rời trang
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearAll = async () => {
    setPending([]);
    if (isAuthenticated) {
      try {
        await clear({});
      } catch {
        /* noop */
      }
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Trợ lý Phật học">
        <div className="animate-pulse text-sm text-muted-foreground">
          Đang tải…
        </div>
      </AppShell>
    );
  }

  const isEmpty = messages.length === 0;

  return (
    <AppShell title="Trợ lý Phật học">
      <div className="mx-auto flex h-[calc(100dvh-11.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
        {/* ---------- Thanh trên: tối giản kiểu ChatGPT ---------- */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Trợ lý Phật học
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              · Theravāda
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={callMode ? "default" : "ghost"}
              size="icon"
              onClick={() => {
                setCallMode((c) => !c);
                setCallStatus("idle");
                if (callMode) {
                  stop();
                  stopSpeaking();
                }
              }}
              title={callMode ? "Kết thúc đàm thoại" : "Đàm thoại bằng giọng nói"}
              className={cn(
                "h-8 w-8",
                callMode && "bg-destructive text-white hover:bg-destructive/90",
              )}
            >
              {callMode ? (
                <PhoneOff className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void clearAll()}
              title="Xóa hội thoại"
              className="h-8 w-8"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ---------- Chế độ Call (đàm thoại 2 bên bằng giọng nói) ---------- */}
        {callMode && (
          <div className="flex flex-col items-center gap-3 border-b border-border/60 bg-gradient-to-b from-primary/10 to-transparent px-4 py-6">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl transition",
                callStatus === "listening" && "animate-pulse ring-4 ring-primary/25",
                callStatus === "speaking" && "ring-4 ring-primary/20",
              )}
            >
              {callStatus === "listening"
                ? "🎙"
                : callStatus === "speaking"
                  ? "🔊"
                  : "🧘"}
            </div>
            <p className="text-sm font-medium">
              {callStatus === "listening"
                ? "Đang nghe — hãy hỏi về Phật pháp"
                : callStatus === "thinking"
                  ? "Trợ lý đang suy nghĩ…"
                  : callStatus === "speaking"
                    ? "Trợ lý đang trả lời…"
                    : "Nhấn micro để bắt đầu hỏi"}
            </p>
            {micSupported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start(onVoice))}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
                  listening
                    ? "bg-destructive text-white"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                )}
                aria-label={listening ? "Dừng nói" : "Nói câu hỏi"}
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        {/* ---------- Khung hội thoại ---------- */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            /* ----- Empty state kiểu ChatGPT ----- */
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Sparkles className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-xl font-bold tracking-tight">
                Hôm nay tôi có thể giúp gì cho bạn?
              </h2>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Hỏi về giáo lý, kinh điển Pāli, thiền định, Luật tạng — hoặc gửi
                ảnh kinh sách để tôi giải nghĩa.
              </p>
              <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-xl border border-border/60 bg-background/70 px-3.5 py-2.5 text-left text-[13px] leading-snug text-foreground/90 transition hover:border-primary/40 hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
              <AssistantMessage content={GREETING} />

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserMessage key={i} content={m.content} />
                ) : (
                  <AssistantMessage
                    key={i}
                    content={m.content}
                    onSpeak={() => speakVI(m.content)}
                  />
                ),
              )}

              {busy && (
                <AssistantThinking />
              )}

              {speaking && (
                <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground">
                  <Volume2 className="h-3.5 w-3.5 animate-pulse text-gold" />
                  Đang đọc đáp án{" "}
                  {ttsEngine === "server" ? "(giọng Việt chuẩn)" : "(giọng máy)"} ·
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="text-destructive underline-offset-2 hover:underline"
                  >
                    dừng
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------- Ô nhập kiểu ChatGPT: pill tròn, nút bên trong ---------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-border/60 p-3"
        >
          {/* Xem trước ảnh đính kèm */}
          {image && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative">
                <img
                  src={`data:${image.mime};base64,${image.base64}`}
                  alt="Ảnh sẽ gửi"
                  className="h-16 w-16 rounded-lg border border-border/60 object-cover"
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
                Ảnh sẽ được gửi kèm câu hỏi
              </span>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background/85 p-2 shadow-sm transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              aria-label="Gửi ảnh cho AI"
              title="Gửi ảnh (tượng Phật, kinh sách, chữ Pāli…)"
            >
              <ImagePlus className="h-4 w-4" />
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
              placeholder={
                listening
                  ? "Đang nghe… hãy hỏi về Phật pháp"
                  : "Hỏi về giáo lý, kinh điển, thiền định…"
              }
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/60"
            />

            {micSupported && (
              <VoiceAskButton
                listening={listening}
                onStart={() => start(onVoice)}
                onStop={stop}
              />
            )}

            <Button
              type="submit"
              size="icon"
              disabled={busy || (!input.trim() && !image)}
              className="h-9 w-9 shrink-0 rounded-full"
              aria-label="Gửi câu hỏi"
            >
              {busy ? (
                <AudioLines className="h-4 w-4 animate-pulse" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {!isAuthenticated && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Đăng nhập để lưu lịch sử hội thoại.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Bong bóng chat kiểu ChatGPT                                         */
/* ------------------------------------------------------------------ */

function AssistantMessage({
  content,
  onSpeak,
}: {
  content: string;
  onSpeak?: () => void;
}) {
  return (
    <div className="group flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 whitespace-pre-wrap pt-1 text-sm leading-relaxed text-foreground/95">
        {content}
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            title="Nghe câu trả lời"
            aria-label="Nghe câu trả lời bằng giọng nói"
            className="ml-2 inline-flex h-6 w-6 translate-y-1 items-center justify-center rounded-full text-muted-foreground opacity-60 transition hover:bg-accent hover:text-foreground hover:opacity-100 group-hover:opacity-100"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantThinking() {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="flex h-9 items-center gap-1.5 pt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nút mic hỏi bằng giọng nói (nằm trong ô nhập)                       */
/* ------------------------------------------------------------------ */

function VoiceAskButton({
  listening,
  onStart,
  onStop,
}: {
  listening: boolean;
  onStart(): void;
  onStop(): void;
}) {
  return (
    <button
      type="button"
      onClick={() => (listening ? onStop() : onStart())}
      aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
      title={listening ? "Đang nghe — bấm để dừng" : "Hỏi bằng giọng nói"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
        listening && "bg-destructive/10 text-destructive",
      )}
    >
      <Mic className="h-4 w-4" />
      {listening && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
      )}
    </button>
  );
}
