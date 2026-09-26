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
    how: "Gõ câu hỏi rồi bấm Gửi (hoặc Enter). Trợ lý nhớ toàn bộ hội thoại và tiếp tục đúng mạch.",
  },
  {
    name: "Đàm thoại bằng giọng nói (nút tròn có sóng âm)",
    how: "Nói tự nhiên như gọi điện; trợ lý tự chốt câu khi bạn ngừng nói, tự đọc trả lời rồi lại nghe tiếp. Dấu tròn đỏ để kết thúc. Cũng chỉ cần nhắn: 'mở đàm thoại'.",
  },
  {
    name: "Gửi ảnh để phân tích (nút ảnh cạnh ô nhập)",
    how: `Bấm nút ảnh nhiều lần để cộng dồn tối đa ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt (tối đa 20 MB/ảnh), rồi gửi kèm câu hỏi.`,
  },
  {
    name: "Tạo hình minh hoạ Phật pháp",
    how: 'Chỉ cần nhờ bằng lời: "vẽ hình hoa sen", "minh hoạ tứ thánh đế" — hệ thống tự vẽ.',
  },
  {
    name: "Nghe câu trả lời bằng giọng nói",
    how: "Bấm biểu tượng loa trên câu trả lời; trong đàm thoại thì phát tự động.",
  },
  {
    name: `Chọn ${VOICE_COUNT} giọng đọc (Cài đặt → Giọng nói)`,
    how: "Vào Cài đặt → Giọng nói, nghe thử và chọn; dùng cho cả chat lẫn đàm thoại.",
  },
  {
    name: "Gợi ý câu hỏi",
    how: "Khi hội thoại trống, ứng dụng gợi ý câu hỏi về Bát Chánh Đạo, Tứ Thánh Đế... để bấm vào hỏi ngay.",
  },
  {
    name: "Thu hồi tin nhắn",
    how: "Bấm vào tin nhắn của bạn để thu hồi, hoặc thu hồi riêng ảnh đã gửi.",
  },
  {
    name: "Chia sẻ cuộc trò chuyện",
    how: "Bấm biểu tượng chia sẻ để sao chép hội thoại ra ngoài.",
  },
  {
    name: "Xóa hội thoại",
    how: 'Bấm biểu tượng thùng rác, hoặc nói "xoá hội thoại", "bắt đầu lại", "quên hết đi" — sẽ xóa sạch và kết thúc cuộc trò chuyện.',
  },
  {
    name: "Cài đặt",
    how: "Vào Cài đặt để đổi giọng đọc, xem thông tin, điều khoản và gửi góp ý.",
  },
];

/**
 * Cách mở đầu câu trả lời về ứng dụng — dùng khi người dùng hỏi "ứng dụng có
 * tính năng gì", "làm sao dùng...", "có thể làm gì...".
 */
export const FEATURE_TIPS = [
  "Trả lời NGẮN GỌN: nêu 2–4 tính năng liên quan tới câu hỏi, kèm cách bấm cụ thể.",
  "Danh sách này do hệ thống tự động cập nhật theo ứng dụng — hãy tin danh sách, đừng bịa tính năng không có; hỏi về tính năng chưa có thì nói thẳng hiện chưa có.",
  'Muốn nói chuyện bằng giọng nói: bảo họ nhắn "mở đàm thoại" là màn đàm thoại mở ngay.',
];

/**
 * Dựng phần mô tả tính năng để chèn vào system prompt.
 *
 * `compact = true` chỉ giữ TÊN tính năng, bỏ hướng dẫn thao tác. Cần cho
 * nhánh dự phòng: hạn mức Groq tính bằng TOKEN mỗi phút cho cả tổ chức
 * (chỉ 8.000 token/phút), nên mỗi prompt thừa một câu cũng có thể khiến
 * cả nhóm người dùng bị chặn. Nhánh chính dùng bản đầy đủ.
 */
export function featuresPrompt(compact = false): string {
  if (compact) {
    return [
      "## TÍNH NĂNG ỨNG DỤNG (tự động cập nhật)",
      "Khi người dùng hỏi về ứng dụng, chỉ được nói các tính năng có trong danh sách này:",
      FEATURES.map((f) => `- ${f.name}`).join("\n"),
    ].join("\n");
  }
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
