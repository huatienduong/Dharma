import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AudioLines,
  Eraser,
  Mic,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Namo Tassa Bhagavato Arahato Sammā Sambuddhassa. Xin chào, tôi là Trợ lý Pháp. Hãy hỏi về giáo lý, kinh điển Pāli, thiền định hay thực hành theo truyền thống Theravāda — tôi sẽ trả lời trong phạm vi Phật học.";

/** Đọc văn bản bằng giọng tiếng Việt của hệ điều hành (nếu có). */
function speakVietnamese(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "vi-VN";
  u.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  const vi =
    voices.find((v) => v.lang?.toLowerCase().startsWith("vi")) ?? undefined;
  if (vi) u.voice = vi;
  if (onEnd) {
    u.onend = () => onEnd();
    u.onerror = () => onEnd();
  }
  window.speechSynthesis.speak(u);
}

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
  const [speaking, setSpeaking] = useState(false);

  const { supported: micSupported, listening, start, stop } = useVoiceSearch();
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
      if (!q || busy) return;

      // Người dùng chưa đăng nhập → trả lời trực tiếp, không lưu
      if (!isAuthenticated) {
        setInput("");
        setPending((p) => [...p, { role: "user", content: q }]);
        setBusy(true);
        try {
          const reply = await ask({ messages: [{ role: "user", content: q }] });
          setPending((p) => [...p, { role: "assistant", content: reply }]);
          if (speakOn) {
            setSpeaking(true);
            speakVietnamese(reply, () => setSpeaking(false));
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Không gửi được câu hỏi.",
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      // Đã đăng nhập → lưu lịch sử vào Convex
      setInput("");
      setPending((p) => [...p, { role: "user", content: q }]);
      setBusy(true);
      try {
        const history: Msg[] = [
          ...(saved ?? []).map((m) => ({
            role: m.role as Msg["role"],
            content: m.content,
          })),
          ...pending,
          { role: "user" as const, content: q },
        ];
        const reply = await ask({ messages: history });
        setPending((p) => [
          ...p,
          { role: "assistant", content: reply },
        ]);
        void append({ items: [
          { role: "user", content: q },
          { role: "assistant", content: reply },
        ]});
        // Xóa pending vì đã lưu xuống DB
        setPending([]);
        if (speakOn) {
          setSpeaking(true);
          speakVietnamese(reply, () => setSpeaking(false));
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Không gửi được câu hỏi.",
        );
      } finally {
        setBusy(false);
      }
    },
    [ask, append, busy, isAuthenticated, pending, saved, speakOn],
  );

  // Hỏi bằng giọng nói → tự gửi
  const onVoice = useCallback(
    (text: string) => {
      setInput(text);
      void send(text);
    },
    [send],
  );

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
              variant={speakOn ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSpeakOn((s) => !s);
                if (speakOn && window.speechSynthesis)
                  window.speechSynthesis.cancel();
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
              Đang đọc đáp án…
              <button
                type="button"
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setSpeaking(false);
                }}
                className="text-destructive underline-offset-2 hover:underline"
              >
                dừng
              </button>
            </div>
          )}
        </div>

        {/* ---------- Ô nhập + giọng nói ---------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="border-t border-border/60 p-3"
        >
          <div className="flex items-end gap-2">
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
              disabled={busy || !input.trim()}
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
