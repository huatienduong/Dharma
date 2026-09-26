/**
 * MÀN ĐÀM THOẠI — lớp giao diện phủ kín màn hình.
 *
 * Tách riêng khỏi trang chat để file trang gọn và dễ sửa. Ở đây hiện đúng
 * ba thứ người dùng cần: trạng thái, CÂU ĐANG NGHE (để biết Trợ lý nghe
 * đúng chưa), và ba nút điều khiển.
 */

import type { CallStatus } from "@/hooks/useCallSession";
import { cn } from "@/lib/utils";
import { BotAvatar } from "@/components/BotAvatar";
import { Mic, MicOff, PhoneOff, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

export type CallOverlayProps = {
  callStatus: CallStatus;
  /** Lời người dùng đang nói, do trình duyệt nghe được. */
  interim: string;
  onEnd: () => void;
  onToggleMute: () => void;
  /** Ngừng đọc và mở lại mic ngay lập tức. */
  onInterrupt: () => void;
};

export function CallOverlay({
  callStatus,
  interim,
  onEnd,
  onToggleMute,
  onInterrupt,
}: CallOverlayProps) {
  const statusText =
    callStatus === "listening"
      ? "Đang nghe"
      : callStatus === "thinking"
        ? "Đang suy niệm"
        : callStatus === "speaking"
          ? "Đang trả lời"
          : "Micro đã tắt";

  /**
   * THỜI LƯỢNG ĐÀM THOẠI — đồng hồ đếm từ lúc mở cuộc gọi, hiển thị dạ
   * phút:giây. Màn đàm thoại chỉ hiện khi `callOpen` nên chỉ cần nhớ mốc bắt
   * đầu là đủ; component bị gỡ thì đồng hồ dừng theo.
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    setElapsed(0);
    const id = window.setInterval(
      () => setElapsed(Date.now() - startedAt),
      1000,
    );
    return () => window.clearInterval(id);
  }, []);
  const mm = String(Math.floor(elapsed / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((elapsed % 60_000) / 1000)).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#09090b] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55rem 38rem at 50% 42%, rgba(245,158,11,0.15), transparent 62%), linear-gradient(180deg, rgba(17,17,17,0.96), rgba(9,9,11,1))",
        }}
      />

      <div className="relative z-10 flex h-full w-full max-w-[1800px] flex-col">
        <div className="flex w-full items-center justify-between px-5 pt-5 sm:px-8">
          {/* Chỉ còn nút đóng: đã bỏ icon nhỏ + chữ “Trợ lý Phật học” theo yêu
              cầu, phần nhận diện do logo robot ở giữa màn đảm nhiệm. */}
          <span aria-hidden />

          <button
            type="button"
            onClick={onEnd}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-6">
          {/* Logo robot thay cho quả cầu sóng âm cũ */}
          <div
            className={cn(
              "relative flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64 lg:h-80 lg:w-80",
              callStatus === "muted" && "opacity-50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-4 rounded-full bg-primary/20 blur-3xl",
                callStatus === "listening" && "animate-pulse",
                callStatus === "speaking" && "animate-pulse",
              )}
            />
            <BotAvatar
              size="lg"
              glow
              className="relative h-[70%] w-[70%] shrink-0"
            />
          </div>

          <p className="mt-8 text-center text-xl font-medium tracking-wide text-white/90 sm:text-2xl">
            {statusText}
          </p>

          {/* Thời lượng cuộc gọi hiện dưới trạng thái */}
          <p
            className="mt-1.5 text-sm font-medium tabular-nums tracking-widest text-white/60"
            aria-label="Thời lượng đàm thoại"
          >
            {mm}:{ss}
          </p>

          {/* CÂU ĐANG NGHE: trước đây không hiện, người dùng không biết
              Trợ lý nghe đúng chưa nên nhiều khi phải nói lại. */}
          <div className="mt-4 flex min-h-[3.5rem] w-full max-w-xl items-start justify-center px-2">
            {interim ? (
              <p
                key={interim}
                className="animate-in fade-in slide-in-from-bottom-1 text-center text-[17px] leading-relaxed text-white/80"
              >
                {interim}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-6 pb-[max(1.6rem,env(safe-area-inset-bottom))] pt-2">
          {callStatus !== "muted" ? (
            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
              aria-label="Tắt micro"
              title="Tắt micro"
            >
              <Mic className="h-7 w-7" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-amber-500/20 backdrop-blur transition hover:bg-amber-500/30"
              aria-label="Bật micro"
              title="Bật micro"
            >
              <MicOff className="h-7 w-7" />
            </button>
          )}

          <button
            type="button"
            onClick={onEnd}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition hover:bg-red-400 active:scale-95"
            aria-label="Kết thúc đàm thoại"
            title="Kết thúc"
          >
            <PhoneOff className="h-8 w-8" />
          </button>

          <div className="flex h-16 w-16 items-center justify-center">
            {callStatus === "speaking" && (
              <button
                type="button"
                onClick={onInterrupt}
                className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                aria-label="Ngừng đọc"
                title="Ngừng đọc"
              >
                <Square className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
