import { useAudioPlayer } from "@/lib/audioPlayer";
import { formatTime } from "@/lib/player";
import { cn } from "@/lib/utils";
import { Loader2, Music, Pause, Play, X } from "lucide-react";

/**
 * THANH AUDIO MINI nổi phía trên bottom nav — hiện khi đang phát kinh/
 * nhạc thiền. Trình phát audio độc lập với trình phát video (DockPlayer).
 */
export function AudioBar() {
  const { current, isPlaying, isBuffering, position, duration, toggle, seek, close } =
    useAudioPlayer();

  if (!current) return null;
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[4.25rem] z-40 px-3 pb-1 lg:bottom-4 lg:left-64 lg:pl-5 lg:pr-5 lg:[left:0] lg:[position:fixed]">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-3xl bg-card/95 px-4 py-2.5 shadow-[0_8px_28px_rgba(63,50,33,0.18)] backdrop-blur">
        {/* Icon loại nội dung */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-gold">
          <Music className="h-4.5 w-4.5" />
        </span>

        {/* Tên bài + tiến trình */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight">
            {current.title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">
              {formatTime(position)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, duration)}
              value={position}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Tua âm thanh"
              className={cn(
                "h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted",
                "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                "[&::-webkit-slider-thumb]:bg-[var(--gold)]",
              )}
              style={{
                background: `linear-gradient(to right, var(--gold) ${pct}%, var(--muted) ${pct}%)`,
              }}
            />
            <span className="w-9 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Điều khiển */}
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Tạm dừng" : "Phát"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
        >
          {isBuffering ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4.5 w-4.5" />
          ) : (
            <Play className="h-4.5 w-4.5 translate-x-[1px]" />
          )}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Đóng trình phát"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
