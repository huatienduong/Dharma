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

export function HomeGreeting({
  /** Chiều cao bàn phím ảo đang che (px); dùng để nâng nội dung lên. */
  keyboardInset = 0,
}: {
  keyboardInset?: number;
}) {
  return (
    <div
      // Bàn phím bật thì khung nhập nổi lên che phần dưới — đệm đáy bằng
      // đúng chiều cao bàn phím để logo và chữ luôn nằm trong vùng nhìn.
      style={keyboardInset ? { paddingBottom: keyboardInset } : undefined}
      className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-6 overflow-hidden text-center"
    >
      {/* ---------- Logo robot (không vỏ ngoài) ---------- */}
      <div className="flex shrink-0 items-center justify-center">
        <BotAvatar size="lg" glow className="size-28 sm:size-40" />
      </div>

      {/* ---------- Lời chào + câu hỏi ---------- */}
      <div className="shrink-0">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="mt-2 text-base font-bold text-primary sm:text-lg">
          Bạn có thể đặt câu hỏi và yêu cầu trợ giúp ngay bây giờ nha.
        </p>
      </div>
    </div>
  );
}
