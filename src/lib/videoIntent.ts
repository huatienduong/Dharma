/**
 * NHẬN DIỆN Ý ĐỊNH "XEM VIDEO" TRONG CÂU HỎI CỦA NGƯỜI DÙNG.
 *
 * Người dùng chỉ cần hỏi hoặc dán link, phần còn lại ứng dụng lo:
 *   1. AI trả lời câu hỏi như bình thường.
 *   2. Sau đó tìm video trên YouTube và nhúng thẳng vào khung chat.
 *
 * Không cần AI trả về mã riêng: nhận diện ở đây giữ cho prompt AI gọn và
 * không phụ thuộc vào việc model có "làm đúng" hay không.
 */

import { deaccent } from "@/lib/chatHelpers";

/** Một video YouTube gọn, đủ để dựng thẻ xem trong khung chat. */
export type VideoInfo = {
  /** Khóa video 11 ký tự của YouTube. */
  videoId: string;
  title: string;
  /** Tên kênh đăng video. */
  channel: string;
  /** Ảnh nhỏ (thumbnail) để hiện trước khi bấm xem. */
  thumbnail: string;
  /** Thời lượng dạng "12:34" nếu lấy được. */
  duration?: string;
  /** Số lượt xem (dùng ở danh sách gợi ý). */
  viewCount?: number;
};

const ID = "[A-Za-z0-9_-]{11}";

/**
 * Trích `videoId` từ mọi dạng link YouTube phổ biến:
 * watch?v=, youtu.be/, /embed/, /shorts/, /live/, kèm tham số phía sau.
 * Không có link → null (người dùng chỉ hỏi bằng lời).
 */
export function youtubeVideoId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (!/youtu\.?be/i.test(text)) return null;
  const patterns = [
    new RegExp(`[?&]v=(${ID})`),
    new RegExp(`youtu\\.be/(${ID})`),
    new RegExp(`/embed/(${ID})`),
    new RegExp(`/shorts/(${ID})`),
    new RegExp(`/live/(${ID})`),
    new RegExp(`/v/(${ID})`),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Từ khoá nói về video (đã bỏ dấu, chữ thường). */
const VIDEO_WORDS = [
  "video",
  "youtube",
  "clip",
  "video nao",
  "xem video",
  "xem clip",
  "bai hat",
  "bai giang video",
];

/**
 * Người dùng có đang muốn xem video không?
 *  - có link YouTube → luôn đúng;
 *  - hoặc câu có từ khoá video/YouTube/nhạc/bài giảng.
 */
export function isVideoRequest(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  if (youtubeVideoId(text)) return true;
  const t = deaccent(text.toLowerCase());
  if (t.includes("video") || t.includes("youtube") || t.includes("youtu.be")) {
    return true;
  }
  return VIDEO_WORDS.some((w) => t.includes(w));
}

/**
 * Cụm từ để tìm trên YouTube: bỏ mấy từ dẫn vô nghĩa ("cho mình xem",
 * "có video", "link") để câu tìm sát chủ đề hơn.
 */
export function videoSearchQuery(raw: string): string {
  const q = youtubeVideoId(raw) ? "" : raw;
  return q
    .replace(/https?:\/\/\S+/g, " ")
    .replace(
      /\b(xem|cho|minh|ban|co|coi|mo|giup|tim|ve|video|clip|tren|youtube|cua|nao|nho|gi|het|roi)\b/gi,
      " ",
    )
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * AI ĐÃ MỜI XEM VIDEO — nhận ra lời kết của chính Trợ lý kiểu "mình để video
 * ngay dưới câu này", "bấm nút play là xem". Khi đó ứng dụng cũng phải tìm
 * và gắn video, nếu không lời hứa trong câu trả lời sẽ hụt.
 */
export function aiInvitesVideo(raw: string): boolean {
  const t = deaccent(raw.toLowerCase());
  return (
    /video ngay duoi|ngay duoi cau nay|duoi cau tra loi|nam nut play|bam nut play|play la xem|xem ngay trong khung chat/.test(
      t,
    )
  );
}
