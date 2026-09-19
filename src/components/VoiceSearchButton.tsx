import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Mic } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Nút tìm kiếm bằng giọng nói. `onResult` nhận câu nói của người dùng
 * khi họ ngừng nói. Ẩn nếu trình duyệt không hỗ trợ.
 */
export function VoiceSearchButton({
  onResult,
  className,
}: {
  onResult: (text: string) => void;
  className?: string;
}) {
  const { supported, listening, start, stop } = useVoiceSearch();

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stop]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start(onResult))}
      aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"}
      title={listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
        listening && "border-destructive/60 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {listening ? (
        <>
          <Mic className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
          </span>
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="sr-only">{listening ? "Dừng nghe" : "Nói để tìm"}</span>
    </button>
  );
}
