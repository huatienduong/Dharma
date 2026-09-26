/**
 * MÀN CHÀO TRANG CHỦ — chỉ hiện khi hội thoại còn trống.
 *
 * Ba phần: lời chào, hướng dẫn sử dụng ngắn, và GỢI Ý CÂU HỎI NGẪU NHIÊN
 * tự đổi liên tục để luôn có gì đó mới để bấm.
 *
 * RẤT QUAN TRỌNG: khối này nằm trong vùng `overflow-hidden` của trang chat
 * nên TUYỆT ĐỐI không được sinh nội dung dài hơn tầm nhìn — vì vậy dùng
 * `line-clamp`, cỡ chữ vừa và `h-full` thay vì `min-h-full` (min-height
 * sẽ đẩy trang dài ra và tạo thanh cuộn, đúng thứ cần tránh).
 */

import { BotAvatar } from "@/components/BotAvatar";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Image as ImageIcon,
  MessageSquareWarning,
  Phone,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";

/** Ngân hàng câu hỏi gợi ý — vừa đủ rộng để mỗi lần đổi thấy câu khác nhau. */
const QUESTION_POOL: string[] = [
  "Bát Chánh Đạo gồm những chi nào?",
  "Vì sao gọi là vô thường, duyên khởi, vô ngã?",
  "Thập nhị nhân duyên là gì?",
  "Sự khác biệt giữa chính quán và thiền quán?",
  "Người mới học Phật nên bắt đầu tu tập thế nào?",
  "Trong Kinh Bát Nhã Tâm Kế, Đức Thế Tôn dạy điều gì?",
  "Ái và tham khác nhau ra sao?",
  "Đạo đế trong Abhidhamma được giải thích thế nào?",
  "Vô minh khác vô thức ở chỗ nào?",
  "Ý niệm vô ngã được hiểu thế nào?",
  "Làm sao nhận diện tâm sân trong từng phút?",
  "Tứ Thánh Đế giải thích điều gì là cốt lõi?",
  "Niệm hơi thở được thực tập thế nào cho đúng?",
  "Công đức của việc cúng dường được hiểu ra sao?",
];

/** Số câu hiện cùng lúc — đủ để có lựa chọn mà không chiếm chỗ. */
const VISIBLE_COUNT = 3;
/** Nhịp đổi câu gợi ý. */
const ROTATE_MS = 4200;

type Guide = {
  Icon: typeof BookOpen;
  title: string;
  text: string;
};

const GUIDES: Guide[] = [
  {
    Icon: BookOpen,
    title: "Hỏi về Phật học",
    text: "Gõ câu hỏi, mình giải thích theo giáo lý Theravāda.",
  },
  {
    Icon: ImageIcon,
    title: "Gửi hình ảnh",
    text: "Chọn ảnh ở góc trái ô nhập để nhờ đọc chữ.",
  },
  {
    Icon: FileText,
    title: "Gửi tệp",
    text: "Gửi tệp văn bản, CSV, JSON, PDF để mình đọc.",
  },
  {
    Icon: Phone,
    title: "Đàm thoại",
    text: "Bấm điện thoại ở góc trên trái để nói bằng giọng nói.",
  },
  {
    Icon: Volume2,
    title: "Nghe lại",
    text: "Bấm biểu tượng loa dưới câu trả lời để nghe lại.",
  },
  {
    Icon: MessageSquareWarning,
    title: "Báo lỗi, góp ý",
    text: 'Gõ "báo lỗi: nội dung" ở đầu câu để gửi cho kỹ thuật.',
  },
];

/** Chọn ngẫu nhiên `count` câu KHÁC NHAU trong kho câu hỏi. */
function seedPicks(): string[] {
  const pool = [...QUESTION_POOL];
  const out: string[] = [];
  while (out.length < VISIBLE_COUNT && pool.length > 0) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/**
 * Thay ngẫu nhiên MỘT câu trong danh sách hiện tại bằng câu chưa từng hiện.
 * Ưu tiên câu chưa có trong khung hiện tại để không lặp lại ngay trước mắt.
 */
function rotatePicks(current: string[]): string[] {
  const fresh = QUESTION_POOL.filter((q) => !current.includes(q));
  const source = fresh.length > 0 ? fresh : QUESTION_POOL;
  const nextQuestion = source[Math.floor(Math.random() * source.length)];
  const slot = Math.floor(Math.random() * current.length);
  const next = [...current];
  next[slot] = nextQuestion;
  return next;
}

export function HomeWelcome({ onPick }: { onPick: (question: string) => void }) {
  const [picks, setPicks] = useState<string[]>(seedPicks);

  // Câu gợi ý đổi liên tục. Tab ẩn thì dừng nhịp, quay lại mới đổi tiếp —
  // tránh đốt timer vô ích khi người dùng đang xem tab khác.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setPicks(rotatePicks);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden sm:gap-4">
      {/* ---------- Lời chào ---------- */}
      <div className="flex shrink-0 flex-col items-center gap-2 text-center">
        <BotAvatar size="lg" glow className="size-12 shadow-lg sm:size-14" />
        <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
          Xin chào, mình là Trợ lý Phật học
        </h1>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          Hỏi về Phật học, gửi hình hoặc tệp, hay nói chuyện bằng giọng nói —
          tất cả ngay tại đây.
        </p>
      </div>

      {/* ---------- Hướng dẫn sử dụng ----------
          Màn hình thấp (điện thoại ngang) thì ẩn hẳn khối này để mọi thứ
          vẫn vừa tầm nhìn — tuyệt đối không để trang phải cuộn. */}
      <ul className="grid w-full shrink-0 grid-cols-2 gap-2 [@media(max-height:600px)]:hidden">
        {GUIDES.map(({ Icon, title, text }) => (
          <li
            key={title}
            className="flex min-w-0 items-start gap-2 rounded-2xl border border-border/60 bg-card/60 px-2.5 py-2"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Icon className="size-4" />
            </span>
            <p className="min-w-0 text-xs leading-snug text-muted-foreground sm:text-[13px]">
              <span className="block font-semibold text-foreground">
                {title}
              </span>
              {text}
            </p>
          </li>
        ))}
      </ul>

      {/* ---------- Gợi ý câu hỏi ngẫu nhiên, tự đổi liên tục ---------- */}
      <div className="flex min-h-0 w-full shrink-0 flex-col items-center gap-2">
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Gợi ý câu hỏi
          <span className="font-medium normal-case tracking-normal text-muted-foreground/70">
            — tự đổi liên tục, bấm để hỏi
          </span>
        </p>
        <div className="flex w-full flex-col gap-1.5">
          {picks.map((q) => (
            <motion.button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex min-h-10 w-full items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3 py-1.5 text-left text-[13px] font-medium leading-snug text-foreground transition-colors hover:border-primary/60 hover:bg-primary/20"
            >
              <Sparkles className="size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2 min-w-0">{q}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
