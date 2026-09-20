import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Search, Mic, X, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * THANH CÔNG CỤ TÌM KIẾM DÙNG CHUNG — đồng bộ toàn ứng dụng.
 * Bố cục: [mic] [ô nhập] [X khi có chữ] [kính lúp] — tất cả trong 1 pill tròn.
 */
export function SearchToolbar({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  ariaLabel = "Tìm kiếm",
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();

  // Esc để dừng nghe
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stop]);

  const hasText = value.trim().length > 0;

  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-1 rounded-full border border-border/70 bg-card/80 pl-2 pr-3 shadow-sm transition",
        (listening || hasText) && "border-primary/45",
        listening && "ring-2 ring-primary/20",
        className,
      )}
      role="search"
    >
      {/* Mic — bên trái trong pill */}
      {micSupported ? (
        <button
          type="button"
          onClick={() => (listening ? stop() : start((text) => onChange(text)))}
          aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"}
          title={listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
            listening
              ? "bg-destructive/10 text-destructive"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {listening ? (
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
              <Mic className="relative h-4 w-4" />
            </span>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/40">
          <Mic className="h-4 w-4" />
        </span>
      )}

      {/* Ô nhập */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
        placeholder={
          listening ? "Đang nghe…" : (placeholder ?? "Tìm kiếm…")
        }
        aria-label={ariaLabel}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      />

      {/* Xóa từ khóa — hiện khi có chữ */}
      {hasText && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Xóa từ khóa"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Kính lúp — bên phải trong pill */}
      <button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit ? () => onSubmit(value) : undefined}
        aria-label="Tìm"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          onSubmit
            ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {listening ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
