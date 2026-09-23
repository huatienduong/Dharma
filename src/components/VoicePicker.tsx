import { getVoice, VOICE_LIST } from "@/lib/aiVoices";
import { cn } from "@/lib/utils";
import { Check, Volume2 } from "lucide-react";
import { useState } from "react";

/**
 * Bộ chọn GIỌNG NÓI của Trợ lý Phật học — popover lưới 2 cột gọn gàng:
 * mỗi ô = tên giọng + mô tả ngắn, ô chưa chọn có nút nghe thử nhỏ.
 * `dark` dùng cho màn đàm thoại nền tối (nút mở popover chữ trắng).
 */
export function VoicePicker({
  value,
  onChange,
  onPreview,
  align = "end",
  dark,
  className,
}: {
  value: string;
  onChange: (voiceId: string) => void;
  /** Nghe thử giọng: gọi callback với id giọng (client tự đọc mẫu). */
  onPreview?: (voiceId: string) => void;
  align?: "start" | "end";
  /** Nút mở popover trên nền tối (màn đàm thoại) */
  dark?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = getVoice(value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Chọn giọng đọc"
        title={current.desc}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition",
          dark
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/20"
            : "text-foreground hover:bg-accent",
        )}
      >
        <Volume2 className="h-4 w-4" />
        <span className="hidden max-w-[72px] truncate sm:inline">
          {current.name}
        </span>
      </button>

      {open && (
        <>
          {/* Lớp bắt click ngoài để đóng */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={cn(
              "absolute z-50 mt-2 w-[272px] rounded-3xl bg-popover p-1.5 shadow-[0_8px_30px_rgba(16,24,40,0.18)]",
              align === "end" ? "right-0" : "left-0",
            )}
            role="listbox"
            aria-label="Chọn giọng đọc"
          >
            <div className="grid grid-cols-2 gap-1">
              {VOICE_LIST.map((v) => {
                const active = v.id === value;
                return (
                  <div
                    key={v.id}
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "flex items-center gap-0.5 rounded-2xl pl-2.5 transition",
                      active ? "bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    {/* Chọn giọng */}
                    <button
                      type="button"
                      onClick={() => {
                        onChange(v.id);
                        onPreview?.(v.id);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 text-left"
                    >
                      <span
                        className={cn(
                          "truncate text-[13px] font-semibold",
                          active ? "text-primary" : "text-foreground",
                        )}
                      >
                        {v.name}
                      </span>
                      <span className="truncate text-[11px] leading-tight text-muted-foreground">
                        {v.desc}
                      </span>
                    </button>
                    {/* Nghe thử (ô chưa chọn) hoặc dấu tích (đang chọn) */}
                    {active ? (
                      <span className="flex h-9 w-8 shrink-0 items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </span>
                    ) : onPreview ? (
                      <button
                        type="button"
                        onClick={() => onPreview(v.id)}
                        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-r-2xl text-muted-foreground/60 transition hover:text-primary"
                        aria-label={`Nghe thử giọng ${v.name}`}
                        title="Nghe thử"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="w-2 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
