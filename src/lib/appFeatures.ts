/**
 * SỔ ĐĂNG KÝ TÍNH NĂNG CỦA TRỢ LÝ PHẬT HỌC.
 *
 * MỤC ĐÍCH: AI phải TỰ BIẾT ứng dụng hiện có những gì, và danh sách này phải
 * được cập nhật tự động theo ứng dụng chứ không phải viết tay trong prompt.
 *
 * CÁCH DÙNG:
 *  1. Thêm/sửa một tính năng → thêm mục vào `FEATURES` (và `FEATURE_TIPS` nếu cần).
 *  2. Prompt của AI (`convex/aiChat.ts` và `convex/visionChat.ts`) tự nối mảng
 *     này vào mục "TÍNH NĂNG HIỆN CÓ" — không cần sửa gì thêm.
 *
 * Ghi rõ tên nút/nhóm mà người dùng nhìn thấy trên màn hình, để AI hướng dẫn
 * đúng chỗ thay vì nói chung chung.
 */

export type AppFeature = {
  /** Tên tính năng, đúng như người dùng thấy trên màn hình. */
  name: string;
  /** Cách dùng ngắn gọn, hướng dẫn đúng thao tác. */
  how: string;
};

/** Số ảnh tối đa mỗi lượt — giữ khớp với visionChat.MAX_IMAGES_PER_REQUEST. */
export const MAX_IMAGES_PER_MESSAGE = 6;

/** Số giọng đọc đang có trong mục Cài đặt → Giọng nói. */
export const VOICE_COUNT = 8;

export const FEATURES: AppFeature[] = [
  {
    name: "Trò chuyện bằng văn bản",
    how: "Gõ câu hỏi rồi bấm nút Gửi (hoặc Enter). Trợ lý nhớ toàn bộ nội dung hội thoại trong phiên này và tiếp tục đúng mạch.",
  },
  {
    name: "Đàm thoại bằng giọng nói (nút tròn có sóng âm)",
    how: "Bấm để mở màn đàm thoại, nói tự nhiên như gọi điện. Trợ lý tự chốt câu khi bạn ngừng nói, tự trả lời bằng giọng rồi lại nghe tiếp. Bấm dấu tròn đỏ để kết thúc, bấm mic để tắt/bật.",
  },
  {
    name: "Gửi ảnh để phân tích (nút ảnh cạnh ô nhập)",
    how: `Chọn tối đa ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt (bấm nút ảnh nhiều lần để cộng dồn), rồi gửi kèm câu hỏi. Trợ lý nhìn và giải thích từng ảnh, có so sánh giữa các ảnh. Ảnh quá 20 MB sẽ được báo để chọn ảnh nhỏ hơn.`,
  },
  {
    name: "Tạo hình minh hoạ Phật pháp",
    how: 'Chỉ cần nhờ bằng lời, ví dụ "vẽ hình hoa sen", "minh hoạ tứ thánh đế" — hệ thống tự vẽ và hiện ảnh kèm câu giải thích.',
  },
  {
    name: "Nghe câu trả lời bằng giọng nói",
    how: "Bấm biểu tượng loa trên câu trả lời để nghe lại. Trong đàm thoại, giọng đọc phát tự động.",
  },
  {
    name: `Chọn ${VOICE_COUNT} giọng đọc (Cài đặt → Giọng nói)`,
    how: "Vào Cài đặt, mục Giọng nói, nghe thử và chọn giọng mình thích — giọng đã chọn được dùng cho cả chat lẫn đàm thoại.",
  },
  {
    name: "Gợi ý câu hỏi",
    how: "Khi hội thoại còn trống, ứng dụng gợi ý các câu hỏi về Bát Chánh Đạo, Tứ Thánh Đế... để bạn bấm vào hỏi ngay.",
  },
  {
    name: "Thu hồi tin nhắn",
    how: "Bấm vào tin nhắn của bạn để thu hồi, hoặc thu hồi riêng ảnh đã gửi.",
  },
  {
    name: "Chia sẻ cuộc trò chuyện",
    how: "Bấm biểu tượng chia sẻ để sao chép nội dung hội thoại ra ngoài.",
  },
  {
    name: "Xóa hội thoại",
    how: 'Bấm biểu tượng thùng rác, hoặc chỉ cần nói với trợ lý: "xoá hội thoại", "bắt đầu lại", "quên hết đi" — trợ lý sẽ xóa sạch và kết thúc cuộc trò chuyện.',
  },
  {
    name: "Cài đặt",
    how: "Vào Cài đặt để đổi giọng đọc, xem thông tin ứng dụng, điều khoản và gửi góp ý.",
  },
];

/**
 * Cách mở đầu câu trả lời về ứng dụng — dùng khi người dùng hỏi "ứng dụng có
 * tính năng gì", "làm sao dùng...", "có thể làm gì...".
 */
export const FEATURE_TIPS = [
  "Trả lời NGẮN GỌN: nêu đúng 2–4 tính năng liên quan tới câu hỏi, kèm cách bấm cụ thể.",
  'Khi người dùng hỏi chung "có tính năng gì" thì liệt kê tên các tính năng chính, không dàn trải hết mọi chi tiết.',
  "Danh sách tính năng được hệ thống tự động cập nhật theo ứng dụng — hãy tin danh sách này, đừng bịa thêm tính năng không có.",
  "Nếu người dùng hỏi về tính năng chưa có trong danh sách, nói thẳng là hiện chưa có và gợi ý tính năng gần nhất.",
];

/** Dựng phần mô tả tính năng để chèn vào system prompt. */
export function featuresPrompt(): string {
  const lines = FEATURES.map(
    (f) => `- ${f.name}: ${f.how}`,
  ).join("\n");
  return [
    "## TÍNH NĂNG HIỆN CÓ CỦA ỨNG DỤNG (danh sách này do hệ thống tự động cập nhật)",
    "Đây là các tính năng Trợ lý Phật học đang có. Khi người dùng hỏi về ứng dụng, cách dùng, hoặc muốn biết ứng dụng làm được gì, hãy dựa vào danh sách này và hướng dẫn đúng tên nút trên màn hình:",
    lines,
    "",
    "CÁCH TRẢ LỜI VỀ ỨNG DỤNG:",
    ...FEATURE_TIPS.map((t) => `- ${t}`),
  ].join("\n");
}
