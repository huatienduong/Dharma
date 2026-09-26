/**
 * BẢN KÊ TÍNH NĂNG — sinh tự động từ sổ tính năng `FEATURES`.
 *
 * MỤC ĐÍCH: AI tự nhận biết ứng dụng có gì và hướng dẫn đúng tên nút/mục,
 * kể cả sau khi ứng dụng được cập nhật. Danh sách này được sinh ra từ đúng
 * bản đang chạy (thêm/sửa một mục trong `FEATURES` là AI biết ngay), không
 * phải mô tả viết tay trong prompt nên không bao giờ lệch với thực tế.
 *
 * Cách dùng: trang chat gửi kèm bản kê này trong lượt đầu tiên của mỗi cuộc
 * trò chuyện; AI đọc là biết chính xác ứng dụng đang có những gì.
 */

import { FEATURES } from "@/lib/appFeatures";

/** Bản kê ngắn gọn, dán thẳng được vào prompt. */
export function appManifestText(): string {
  const lines = FEATURES.map((f) => `- ${f.name}: ${f.how}`).join("\n");
  return [
    "BẢN KÊ ỨNG DỤNG (tự sinh từ đúng bản đang chạy — luôn đúng hơn mọi trí nhớ cũ):",
    lines,
    "Cách dùng bản kê này:",
    "- Trả lời hướng dẫn theo ĐÚNG tên nút/mục/tính năng trong danh sách, nói rõ bấm ở đâu, theo thứ tự thao tác.",
    "- Chỉ được nhắc tới tính năng có trong danh sách; tuyệt đối không bịa tính năng, không tên nút không có, không dẫn tới mục Cài đặt không tồn tại.",
    "- Hỏi về tính năng chưa có trong danh sách thì nói thẳng là hiện chưa có, kèm gợi ý gần nhất.",
  ].join("\n");
}
