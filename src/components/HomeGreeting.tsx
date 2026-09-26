/**
 * MÀN TRỐNG KHI HỘI THOẠI CÒN TRỐNG — chỉ còn đúng ba thứ theo yêu cầu:
 * logo robot, lời chào, và câu hỏi "cần được hỗ trợ gì".
 *
 * Không có mô tả, không có danh sách, không có gợi ý — càng gọn càng tốt.
 *
 * Vùng chứa khối này là `fixed` + `overflow-hidden` của trang chat, nên dùng
 * `h-full` + `overflow-hidden` để tuyệt đối không phát sinh thanh cuộn.
 */

import { BotAvatar } from "@/components/BotAvatar";

export function HomeGreeting() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-6 overflow-hidden text-center">
      {/* ---------- Logo robot ---------- */}
      <div className="relative flex shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="absolute -inset-5 rounded-full bg-primary/10 blur-2xl sm:-inset-7"
        />
        <BotAvatar
          size="lg"
          glow
          className="relative size-[min(30vh,200px)] shadow-xl sm:size-[min(34vh,240px)]"
        />
      </div>

      {/* ---------- Lời chào + câu hỏi ---------- */}
      <div className="shrink-0">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="mt-2 text-base font-bold text-primary sm:text-lg">
          Bạn cần được hỗ trợ gì?
        </p>
      </div>
    </div>
  );
}
