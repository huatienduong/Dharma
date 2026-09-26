/**
 * MÀN CHÀO TRANG CHỦ — chỉ hiện khi hội thoại còn trống.
 *
 * Hai phần: lời chào và hướng dẫn sử dụng. Danh sách câu hỏi đề xuất đã
 * được gỡ, nên phần còn lại được phóng to cho dễ đọc, dễ bấm.
 *
 * RẤT QUAN TRỌNG: khối này nằm trong vùng `overflow-hidden` của trang chat
 * nên TUYỆT ĐỐI không được sinh nội dung dài hơn tầm nhìn — vì vậy dùng
 * `h-full` thay vì `min-h-full` (min-height sẽ đẩy trang dài ra và tạo
 * thanh cuộn, đúng thứ cần tránh) và `overflow-hidden` để chặn tràn.
 */

import { BotAvatar } from "@/components/BotAvatar";
import {
  BookOpen,
  FileText,
  Image as ImageIcon,
  MessageSquareWarning,
  Phone,
  Volume2,
} from "lucide-react";

type Guide = {
  Icon: typeof BookOpen;
  title: string;
  text: string;
};

const GUIDES: Guide[] = [
  {
    Icon: BookOpen,
    title: "Hỏi về Phật học",
    text: "Gõ câu hỏi bằng chữ, mình giải thích theo giáo lý Theravāda.",
  },
  {
    Icon: ImageIcon,
    title: "Gửi hình ảnh",
    text: "Chọn ảnh ở góc trái ô nhập để nhờ đọc chữ hoặc giải thích hình.",
  },
  {
    Icon: FileText,
    title: "Gửi tệp",
    text: "Gửi tệp văn bản, CSV, JSON, PDF để mình đọc và tóm tắt.",
  },
  {
    Icon: Phone,
    title: "Đàm thoại",
    text: "Bấm biểu tượng điện thoại ở góc trên trái để nói bằng giọng nói.",
  },
  {
    Icon: Volume2,
    title: "Nghe lại",
    text: "Bấm biểu tượng loa dưới câu trả lời để nghe lại bằng giọng đọc.",
  },
  {
    Icon: MessageSquareWarning,
    title: "Báo lỗi, góp ý",
    text: 'Gõ "báo lỗi: nội dung cụ thể" ở đầu câu để gửi thẳng cho bộ phận kỹ thuật.',
  },
];

export function HomeWelcome() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-4 overflow-hidden sm:gap-6">
      {/* ---------- Lời chào ---------- */}
      <div className="flex shrink-0 flex-col items-center gap-2.5 text-center">
        <BotAvatar size="lg" glow className="size-16 shadow-lg sm:size-20" />
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Hỏi về Phật học, gửi hình hoặc tệp, hay nói chuyện bằng giọng nói —
          tất cả ngay tại đây.
        </p>
      </div>

      {/* ---------- Hướng dẫn sử dụng ----------
          Màn hình thấp (điện thoại nằm ngang) thì ẩn hẳn khối này để mọi thứ
          vẫn vừa tầm nhìn — tuyệt đối không để trang phải cuộn. */}
      <ul className="grid w-full shrink-0 grid-cols-1 gap-2.5 [@media(max-height:620px)]:hidden sm:grid-cols-2 sm:gap-3">
        {GUIDES.map(({ Icon, title, text }) => (
          <li
            key={title}
            className="flex min-w-0 items-start gap-3 rounded-3xl border border-border/60 bg-card/60 px-3.5 py-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary sm:size-10">
              <Icon className="size-5" />
            </span>
            <p className="min-w-0 text-sm leading-snug text-muted-foreground sm:text-[15px]">
              <span className="mb-0.5 block text-[15px] font-bold text-foreground sm:text-base">
                {title}
              </span>
              {text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
