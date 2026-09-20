import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Mic } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Nút tìm kiếm bằng giọng nói — KIỂU YOUTUBE:
 * nút tròn ĐỘC LẬP đứng bên phải thanh tìm kiếm (variant "standalone"),
 * hoặc nằm trong ô input (variant "inside").
 */
export function VoiceSearchButton({
  onResult,
  variant = "standalone",
  className,
}: {
  onResult: (text: string) => void;
  variant?: "standalone" | "inside";
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
        variant === "standalone"
          ? // Nút tròn độc lập bên phải thanh tìm kiếm (kiểu YouTube)
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          : // Nút nhỏ nằm trong ô input
            "absolute left-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground",
        listening && "border-destructive/60 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Mic className={variant === "standalone" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {listening && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-destructive/60 animate-pulse",
            variant === "standalone" ? "inset-0" : "inset-0",
          )}
        />
      )}
      <span className="sr-only">{listening ? "Dừng nghe" : "Nói để tìm"}</span>
    </button>
  );
}
