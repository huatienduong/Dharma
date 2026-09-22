import { useVoiceSearch } from "@/hooks/use-voice-search";
import { Search, Mic, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * THANH CÔNG CỤ TÌM KIẾM DÙNG CHUNG — đồng bộ toàn ứng dụng.
 * Bố cục: [ô nhập — KHÔNG placeholder] ......... [mic][kính lúp]
 * Hai nút tròn nhỏ nằm cạnh nhau ở PHẢI, viền tròn đồng bộ.
 * Bật `sticky` để thanh tìm kiếm DÍNH CỐ ĐỊNH dưới header khi cuộn kết quả.
 */
export function SearchToolbar({
  value,
  onChange,
  onSubmit,
  className,
  ariaLabel = "Tìm kiếm",
  sticky = false,
}: {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: (text: string) => void;
  className?: string;
  ariaLabel?: string;
  /** Dính cố định dưới header (top-14) khi người dùng cuộn xuống */
  sticky?: boolean;
}) {
  const { supported: micSupported, listening, start, stop } = useVoiceSearch();

  // Esc để dừng nghe / xóa từ khóa
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, stop]);

  const hasText = value.trim().length > 0;

  const bar = (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-full border border-border/70 bg-muted/50 pl-4 pr-2 transition focus-within:border-primary/40 focus-within:bg-background",
        (listening || hasText) && "border-primary/45",
        listening && "ring-2 ring-primary/20",
        className,
      )}
      role="search"
    >
      {/* Ô nhập — KHÔNG có văn bản gợi ý */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit(value);
          }
          if (e.key === "Escape" && hasText) onChange("");
        }}
        aria-label={ariaLabel}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
      />

      {/* Cụm nút tròn PHẢI: [mic] [kính lúp] nằm cạnh nhau trong vòng tròn */}
      <div className="flex shrink-0 items-center gap-1.5">
        {micSupported ? (
          <button
            type="button"
            onClick={() => (listening ? stop() : start((text) => onChange(text)))}
            aria-label={listening ? "Đang nghe — bấm để dừng" : "Tìm bằng giọng nói"}
            title={listening ? "Đang nghe…" : "Tìm bằng giọng nói"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition",
              listening
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {listening ? (
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-60" />
                <Mic className="relative h-3.5 w-3.5" />
              </span>
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}

        <button
          type={onSubmit ? "button" : "submit"}
          onClick={onSubmit ? () => onSubmit(value) : undefined}
          aria-label="Tìm"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition",
            onSubmit
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              : "border-border/70 bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Xóa từ khóa — hiện khi có chữ, đứng trước cụm nút */}
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
    </div>
  );

  if (sticky) {
    return (
      <div
        className="sticky top-14 z-30 -mx-3 bg-background px-3 py-2.5 shadow-sm sm:-mx-5 sm:px-5"
      >
        {bar}
      </div>
    );
  }
  return bar;
}
