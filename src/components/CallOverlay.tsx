/**
 * MÀN ĐÀM THOẠI — lớp giao diện phủ kín màn hình, theo kiểu cuộc gọi của
 * Zalo: nền tối một mảng, tên + thời lượng ở giữa màn hình, cụm nút tròn
 * mảnh phía dưới và nút kết thúc màu đỏ.
 *
 * Tách riêng khỏi trang chat để file trang gọn và dễ sửa. Ở đây hiện đúng
 * ba thứ người dùng cần: trạng thái, CÂU ĐANG NGHE (để biết Trợ lý nghe
 * đúng chưa), và ba nút điều khiển.
 */

import type { CallStatus } from "@/hooks/useCallSession";
import type { VideoInfo } from "@/lib/videoIntent";
import { cn } from "@/lib/utils";
import { BotAvatar } from "@/components/BotAvatar";
import {
  ChevronDown,
  Mic,
  MicOff,
  PhoneOff,
  Square,
  VideoOff,
  Volume2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type CallOverlayProps = {
  callStatus: CallStatus;
  /** "video" = gọi video: màn hình chính là player, robot thu nhỏ lại góc. */
  mode?: "voice" | "video";
  /** Video đang được xem trong cuộc gọi video (null = chưa có video nào). */
  video?: VideoInfo | null;
  /** Bỏ video, quay lại màn hình robot. */
  onClearVideo?: () => void;
  /** Lời người dùng đang nói, do trình duyệt nghe được. */
  interim: string;
  onEnd: () => void;
  onToggleMute: () => void;
  /** Ngừng đọc và mở lại mic ngay lập tức. */
  onInterrupt: () => void;
};

/** Nút tròn kiểu Zalo: nền trắng mờ, đổi nền khi bấm. */
function RoundButton({
  label,
  title,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  tone?: "default" | "active";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full transition active:scale-95",
        tone === "active"
          ? "bg-white text-zinc-900"
          : "bg-white/12 text-white hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}

export function CallOverlay({
  callStatus,
  interim,
  onEnd,
  onToggleMute,
  onInterrupt,
  mode = "voice",
  video = null,
  onClearVideo,
}: CallOverlayProps) {
  const statusText =
    callStatus === "listening"
      ? "Đang nghe"
      : callStatus === "thinking"
        ? "Đang suy niệm"
        : callStatus === "speaking"
          ? "Đang trả lời"
          : "Micro đã tắt";

  /** Đang nói/suy niệm thì chấm trạng thái chạy, để thấy Trợ lý còn "sống". */
  const live = callStatus === "listening" || callStatus === "speaking";

  /**
   * THỜI LƯỢNG ĐÀM THOẠI — đồng hồ đếm từ lúc mở cuộc gọi, hiển thị dạng
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
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#1b1712] text-white">
      {/* Quầng sáng màu nâu rất nhạt phía sau — giữ chất nâu của ứng dụng
          mà vẫn đậm kiểu màn cuộc gọi. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(38rem 30rem at 50% 26%, rgba(224,133,42,0.20), transparent 68%), linear-gradient(180deg, #221b14 0%, #17120d 62%, #120e0a 100%)",
        }}
      />

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* Thanh trên: nút hạ màn hình (Zalo dùng mũi tên xuống) + trạng thái */}
        <div className="flex items-start justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
          <button
            type="button"
            onClick={onEnd}
            aria-label="Kết thúc đàm thoại"
            title="Kết thúc"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition active:scale-95 hover:bg-white/20"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                live ? "animate-pulse bg-emerald-400" : "bg-white/50",
              )}
            />
            {statusText}
            {mode === "video" ? " · gọi video" : ""}
          </div>

          <span aria-hidden className="h-10 w-10" />
        </div>

        {/* Giữa màn hình: tên + thời lượng, bên dưới là câu đang nghe */}
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* GỌI VIDEO: màn hình chính là player. Chưa có video thì hiện robot
              kèm lời nhắc, người dùng chỉ cần nói là Trợ lý tự tìm và phát. */}
          {mode === "video" && video ? (
            <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title={video.title || "Video trong cuộc gọi"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {/* Robot thu nhỏ làm góc tròn, kiểu khung hình nhỏ trong cuộc gọi */}
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-2.5 right-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/15 backdrop-blur",
                  live && "ring-2 ring-emerald-400/60",
                )}
              >
                <BotAvatar size="lg" glow className="h-[70%] w-[70%]" />
              </span>
              {onClearVideo ? (
                <button
                  type="button"
                  onClick={onClearVideo}
                  className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur transition hover:bg-black/80"
                >
                  <VideoOff className="h-3.5 w-3.5" />
                  Tắt video
                </button>
              ) : null}
            </div>
          ) : null}

          {mode === "voice" || !video ? (
            <>
              {/* Avatar tròn kiểu Zalo: vòng sáng nhẹ quanh robot, chập nháy nhẹ
                  khi Trợ lý đang nghe hoặc đang trả lời. */}
              <div className="relative flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-2 rounded-full bg-primary/25 blur-2xl",
                    live && "animate-pulse",
                  )}
                />
                <BotAvatar
                  size="lg"
                  glow
                  className={cn(
                    "relative h-[62%] w-[62%]",
                    callStatus === "muted" && "opacity-50",
                  )}
                />
              </div>
              {mode === "video" ? (
                <p className="mt-5 text-center text-sm text-white/60">
                  Nói với Trợ lý: “cho tôi xem video về …”
                </p>
              ) : null}
            </>
          ) : null}

          <p className={cn("text-center text-[22px] font-semibold tracking-tight", mode === "video" && video ? "mt-4" : "mt-6")}>
            Trợ lý Phật học
          </p>
          <p
            className="mt-1 text-sm font-medium tabular-nums tracking-wider text-white/60"
            aria-label="Thời lượng đàm thoại"
          >
            {mm}:{ss}
          </p>

          {/* CÂU ĐANG NGHE: trước đây không hiện, người dùng không biết
              Trợ lý nghe đúng chưa nên nhiều khi phải nói lại. */}
          <div className="mt-6 flex min-h-[3.5rem] w-full max-w-xl items-start justify-center px-2">
            {interim ? (
              <p
                key={interim}
                className="animate-in fade-in slide-in-from-bottom-1 text-center text-[17px] leading-relaxed text-white/85"
              >
                {interim}
              </p>
            ) : null}
          </div>
        </div>

        {/* Cụm nút: hai nút tròn nhỏ, nút kết thúc đỏ lớn ở giữa — bố cục
            giống màn cuộc gọi Zalo. */}
        <div className="flex items-center justify-center gap-7 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
          <RoundButton
            label={callStatus === "muted" ? "Bật micro" : "Tắt micro"}
            title={callStatus === "muted" ? "Bật micro" : "Tắt micro"}
            onClick={onToggleMute}
            tone={callStatus === "muted" ? "active" : "default"}
          >
            {callStatus === "muted" ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </RoundButton>

          <button
            type="button"
            onClick={onEnd}
            aria-label="Kết thúc cuộc gọi"
            title="Kết thúc cuộc gọi"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)] transition active:scale-95 hover:bg-red-600"
          >
            <PhoneOff className="h-8 w-8 rotate-[135deg]" />
          </button>

          {callStatus === "speaking" ? (
            <RoundButton
              label="Ngừng đọc"
              title="Ngừng đọc"
              onClick={onInterrupt}
            >
              <Square className="h-5 w-5" />
            </RoundButton>
          ) : (
            <span
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/25"
            >
              <Volume2 className="h-6 w-6" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
