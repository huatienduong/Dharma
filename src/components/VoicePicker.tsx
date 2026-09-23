import { Button } from "@/components/ui/button";
import {
  AI_VOICES,
  VOICE_LIST,
  getVoice,
} from "@/lib/aiVoices";
import { cn } from "@/lib/utils";
import { Check, Volume2 } from "lucide-react";
import { useState } from "react";

/**
 * Bộ chọn GIỌNG NÓI của Trợ lý Phật học — popover lưới 2 cột, mỗi giọng
 * có nút nghe thử. Chọn xong lưu localStorage (aiVoices.saveVoicePref).
 */
export function VoicePicker({
  value,
  onChange,
  onPreview,
  align = "end",
  className,
}: {
  value: string;
  onChange: (voiceId: string) => void;
  /** Nghe thử giọng: gọi callback với tên giọng (client tự đọc mẫu). */
  onPreview?: (voiceId: string) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = getVoice(value);

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        title="Chọn giọng đọc của AI"
        aria-label="Chọn giọng đọc"
        className="h-9 gap-1.5 rounded-full px-2.5 text-xs"
      >
        <Volume2 className="h-4 w-4" />
        <span className="hidden max-w-[72px] truncate sm:inline">
          {current.name}
        </span>
      </Button>

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
              "absolute z-50 mt-2 w-[300px] rounded-2xl border border-border/70 bg-popover p-2 shadow-xl",
              align === "end" ? "right-0" : "left-0",
            )}
            role="listbox"
            aria-label="Danh sách giọng đọc"
          >
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Giọng đọc AI
            </p>
            <div className="grid grid-cols-2 gap-1">
              {VOICE_LIST.map((v) => {
                const active = AI_VOICES[value]?.id === v.id;
                return (
                  <div key={v.id} className="relative">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(v.id);
                        onPreview?.(v.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:bg-accent",
                        active &&
                          "border-gold/40 bg-gold/10 hover:bg-gold/15",
                      )}
                    >
                      <span className="flex w-full items-center gap-1 text-[13px] font-semibold text-foreground">
                        <span className="truncate">{v.name}</span>
                        {active && (
                          <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-gold" />
                        )}
                      </span>
                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {v.desc}
                      </span>
                    </button>
                    {onPreview && !active && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(v.id);
                        }}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 transition hover:bg-accent hover:text-foreground"
                        aria-label={`Nghe thử giọng ${v.name}`}
                        title="Nghe thử"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="px-2 pb-1 pt-2 text-[10px] leading-relaxed text-muted-foreground/80">
              Máy chủ ưu tiên giọng AI tự nhiên (Gemini/OpenAI TTS); nếu chưa
              có khóa sẽ dùng giọng đọc của trình duyệt.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
