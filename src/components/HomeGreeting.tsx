/**
 * MÀN CHÀO KHI HỘI THOẠI CÒN TRỐNG — logo robot to ở giữa, phần "Xin chào"
 * và câu hỏi "cần được hỗ trợ gì" nằm ngay bên dưới.
 *
 * CỐ Ý KHÔNG CÓ DANH SÁCH CÂU HỎI GỢI Ý: người dùng đã bỏ hẳn ở lượt
 * trước. Dưới đây chỉ là các KIỂU HỖ TRỢ (nhãn tĩnh, không bấm được) để
 * người dùng tự biết mình có thể nhờ gì.
 *
 * Vùng chứa khối này là `fixed` + `overflow-hidden` của trang chat, nên dùng
 * `h-full` + `overflow-hidden` và cỡ chữ vừa để tuyệt đối không phát sinh
 * thanh cuộn.
 */

import { BotAvatar } from "@/components/BotAvatar";

/** Các kiểu hỗ trợ — nhãn tĩnh, chỉ để người dùng thấy mình có thể nhờ gì. */
const HELP_KINDS: string[] = [
  "Hỏi về Phật học",
  "Gửi hình ảnh hoặc tệp",
  "Nghe lại câu trả lời",
  "Đàm thoại bằng giọng nói",
  "Báo lỗi và góp ý",
];

export function HomeGreeting() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-5 overflow-hidden text-center sm:gap-7">
      {/* ---------- Logo robot to, căn giữa ---------- */}
      <div className="relative shrink-0">
        {/* Quầng sáng mềm phía sau avatar, cùng tông nâu của ứng dụng */}
        <span
          aria-hidden
          className="absolute -inset-6 rounded-full bg-primary/10 blur-xl"
        />
        <BotAvatar
          size="lg"
          glow
          className="relative size-24 shadow-xl sm:size-28"
        />
      </div>

      {/* ---------- Lời chào + câu hỏi cần được hỗ trợ gì ---------- */}
      <div className="shrink-0">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="mt-2 text-sm font-semibold text-primary sm:text-base">
          Bạn cần được hỗ trợ gì?
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          Mình giải thích giáo lý theo Theravāda, đọc hình và tệp bạn gửi, và
          nói chuyện bằng giọng nói.
        </p>
      </div>

      {/* ---------- Các kiểu hỗ trợ ---------- */}
      <ul className="flex max-w-xl shrink-0 flex-wrap items-center justify-center gap-1.5 [@media(max-height:520px)]:hidden sm:gap-2">
        {HELP_KINDS.map((k) => (
          <li
            key={k}
            className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-medium text-foreground/85 sm:text-xs"
          >
            {k}
          </li>
        ))}
      </ul>
    </div>
  );
}
