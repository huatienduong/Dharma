/**
 * MÀN CHÀO KHI HỘI THOẠI CÒN TRỐNG — logo robot to ở giữa, phần "Xin chào"
 * và câu hỏi "cần được hỗ trợ gì" nằm ngay bên dưới.
 *
 * YÊU CẦU "KHÔNG ĐỂ TRỐNG Ở GIỮA": trước đây nội dung gom gọn ở giữa nên
 * hai bên trên/dưới lại hở ra một khoảng trống lớn. Nay nội dung được TRẢI
 * hết chiều cao: logo co giãn theo màn hình, các kiểu hỗ trợ là những hàng
 * `flex-1` giãn đều, nên không còn khoảng hở nào đáng kể.
 *
 * Các kiểu hỗ trợ là NHÃN TĨNH, không bấm được — cố ý không đưa lại danh
 * sách câu hỏi gợi ý. Khi màn hình quá thấp thì ẩn hẳn khối này để tuyệt
 * đối không phát sinh thanh cuộn.
 */

import { BotAvatar } from "@/components/BotAvatar";
import {
  BookOpen,
  FileSearch,
  MessageSquareWarning,
  Phone,
  Volume2,
} from "lucide-react";

const HELP_KINDS: {
  Icon: typeof BookOpen;
  title: string;
  text: string;
}[] = [
  {
    Icon: BookOpen,
    title: "Hỏi về Phật học",
    text: "Giáo lý Theravāda, kinh điển, tu tập",
  },
  {
    Icon: FileSearch,
    title: "Gửi hình ảnh hoặc tệp",
    text: "Đọc chữ trong ảnh, đọc và tóm tắt tệp",
  },
  {
    Icon: Volume2,
    title: "Nghe lại câu trả lời",
    text: "Bấm biểu tượng loa dưới câu trả lời",
  },
  {
    Icon: Phone,
    title: "Đàm thoại bằng giọng nói",
    text: "Bấm điện thoại ở góc trên trái",
  },
  {
    Icon: MessageSquareWarning,
    title: "Báo lỗi và góp ý",
    text: 'Gõ "báo lỗi: nội dung cụ thể"',
  },
];

export function HomeGreeting() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-4 overflow-hidden sm:gap-6">
      {/* ---------- Logo robot to, co giãn theo màn hình ---------- */}
      <div className="relative flex shrink-0 items-center justify-center">
        {/* Quầng sáng mềm phía sau avatar, cùng tông nâu của ứng dụng */}
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

      {/* ---------- Lời chào + câu hỏi cần được hỗ trợ gì ---------- */}
      <div className="shrink-0 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="mt-2 text-base font-bold text-primary sm:text-lg">
          Bạn cần được hỗ trợ gì?
        </p>
      </div>

      {/* ---------- Các kiểu hỗ trợ: giãn hết khoảng trống còn lại ---------- */}
      <ul className="flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center gap-1.5 [@media(max-height:560px)]:hidden sm:gap-2">
        {HELP_KINDS.map(({ Icon, title, text }) => (
          <li
            key={title}
            className="flex min-h-0 flex-1 items-center gap-2.5 rounded-2xl border border-border/60 bg-card/60 px-3 py-1.5 sm:px-4"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary sm:size-9">
              <Icon className="size-4 sm:size-[18px]" />
            </span>
            <p className="min-w-0 text-[13px] font-semibold leading-tight text-foreground sm:text-sm">
              {title}
              <span className="ml-1.5 font-normal text-muted-foreground sm:text-[13px]">
                — {text}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
