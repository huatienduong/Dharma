import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Mic } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Nút tìm kiếm bằng giọng nói đặt bên trong ô tìm kiếm.
 * `onResult` nhận câu nói của người dùng khi họ ngừng nói.
 * Ẩn nếu trình duyệt không hỗ trợ Web Speech API.
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
        // Nút nhỏ nằm trong ô input, bên phải (cạnh kính lúp)
        "absolute right-2.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground",
        listening && "text-destructive",
        className,
      )}
    >
      <Mic className="h-3.5 w-3.5" />
      {listening && (
        <span className="absolute inset-0 rounded-full border-2 border-destructive/60 animate-pulse" />
      )}
      <span className="sr-only">{listening ? "Dừng nghe" : "Nói để tìm"}</span>
    </button>
  );
}
