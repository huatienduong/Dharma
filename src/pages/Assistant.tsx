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
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Namo Tassa Bhagavato Arahato Sammā Sambuddhassa. Xin chào, tôi là Trợ lý Pháp. Hãy hỏi về giáo lý, kinh điển Pāli, thiền định hay thực hành theo truyền thống Theravāda — tôi sẽ trả lời trong phạm vi Phật học.";

export default function Assistant() {
  const { isAuthenticated, isLoading } = useAuth();
  const ask = useAction(api.aiChat.ask);
  const append = useMutation(api.aiChat.appendMessages);
  const clear = useMutation(api.aiChat.clearMessages);
  const saved = useQuery(api.aiChat.listMessages, {});

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Msg[]>([]); // tin nhắn chưa lưu
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  // Ảnh đính kèm (nén về max 1024px, JPEG ~0.82)
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ----- Chế độ Call: đàm thoại 2 bên bằng giọng nói -----
  const [callMode, setCallMode] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
  const { speak: speakVI, stop: stopSpeaking, speaking, engine: ttsEngine } = useVietnameseTTS();
  const scrollRef = useRef<HTMLDivElement>(null);

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
          void append({ items: [
            { role: "user", content: display },
            { role: "assistant", content: reply },
          ]});
          setPending([]);
        }
        if (speakOn || callMode) {
          setCallStatus("speaking");
          speakVI(reply, () => {
            if (callMode) setCallStatus("listening");
          });
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Không gửi được câu hỏi.",
        );
      } finally {
        setBusy(false);
      }
    },
    [ask, append, busy, image, isAuthenticated, pending, saved, speakOn, callMode, speakVI],
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
      <AppShell title="Trợ lý Pháp">
        <div className="animate-pulse text-sm text-muted-foreground">
          Đang tải…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Trợ lý Pháp — Trò chuyện Phật pháp cùng AI"
      subtitle="Hỏi đáp trong phạm vi Phật học Theravāda · Hỏi bằng giọng nói · AI trả lời bằng giọng nói"
    >
      <div className="mx-auto flex h-[calc(100dvh-13rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50">
        {/* ---------- Thanh công cụ trên ---------- */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-gold" />
            Trợ lý Pháp
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant={callMode ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                setCallMode((c) => !c);
                setCallStatus("idle");
                if (callMode) {
                  // Rời call: dừng mọi âm thanh + nghe
                  stop();
                  stopSpeaking();
                }
              }}
              title={callMode ? "Kết thúc call" : "Đàm thoại bằng giọng nói"}
              className={cn(
                "h-8 gap-1.5 text-xs",
                callMode && "bg-destructive text-white hover:bg-destructive/90",
              )}
            >
              {callMode ? (
                <PhoneOff className="h-3.5 w-3.5" />
              ) : (
                <Phone className="h-3.5 w-3.5" />
              )}
              {callMode ? "Kết thúc" : "Call"}
            </Button>
            <Button
              variant={speakOn ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSpeakOn((s) => !s);
                if (speakOn) stopSpeaking(); // dừng đọc triệt để cả server + browser
              }}
              title={speakOn ? "Tắt đọc đáp án" : "Bật đọc đáp án"}
              className="h-8 gap-1.5 text-xs"
            >
              {speakOn ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {speakOn ? "Đang đọc đáp án" : "Đã tắt đọc"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void clearAll()}
              className="h-8 gap-1.5 text-xs"
            >
              <Eraser className="h-3.5 w-3.5" />
              Xóa hội thoại
            </Button>
          </div>
        </div>

        {/* ---------- Khung hội thoại ---------- */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          <Bubble role="assistant" content={GREETING} />

          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}

          {busy && (
            <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
              <AudioLines className="h-3.5 w-3.5 animate-pulse text-gold" />
              Trợ lý đang suy nghĩ…
            </div>
          )}

          {speaking && (
            <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5 animate-pulse text-gold" />
              Đang đọc đáp án {ttsEngine === "server" ? "(giọng Việt chuẩn)" : "(giọng máy)"} ·
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

        {/* ---------- Chế độ Call (đàm thoại 2 bên bằng giọng nói) ---------- */}
        {callMode && (
          <div className="flex flex-col items-center gap-3 border-b border-border/60 bg-gradient-to-b from-gold/10 to-transparent px-4 py-6">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 text-3xl transition",
                callStatus === "listening" && "animate-pulse ring-4 ring-gold/30",
                callStatus === "speaking" && "ring-4 ring-primary/30",
              )}
            >
              {callStatus === "listening" ? "🎙" : callStatus === "speaking" ? "🔊" : "🧘"}
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
              <div className="flex items-center gap-3">
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
              </div>
            )}
          </div>
        )}

        {/* ---------- Ô nhập + giọng nói ---------- */}
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
          <div className="flex items-end gap-2">
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
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
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-border/70 bg-background/80 p-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
              className="h-10 w-10 shrink-0 rounded-xl"
              aria-label="Gửi câu hỏi"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {!isAuthenticated && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Bạn đang trò chuyện với tư cách khách — hội thoại sẽ không được
              lưu. Đăng nhập tại Hồ sơ để lưu lịch sử.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Bong bóng chat                                                      */
/* ------------------------------------------------------------------ */

function Bubble({ role, content }: { role: Msg["role"]; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border/60 bg-background/80",
        )}
      >
        {content}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nút mic hỏi bằng giọng nói                                          */
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
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
        listening &&
          "border-destructive/60 bg-destructive/10 text-destructive",
      )}
    >
      <Mic className="h-4 w-4" />
      {listening && (
        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
      )}
    </button>
  );
}
