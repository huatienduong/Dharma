/**
 * LỌC VIDEO THEO CHỦ ĐỀ PHẬT GIÁO.
 *
 * Trợ lý Phật học chỉ tìm và đề xuất nội dung về Phật giáo (Theravāda là
 * chính, nhưng cũng nhận các truyền thống Phật giáo khác). Video không
 * liên quan tới Phật học — kể cả khi YouTube trả về khi tìm theo từ khoá
 * chung chung — sẽ không hiển thị.
 *
 * Cách lọc: chủ đề người dùng gõ và tiêu đề/kênh của video đều phải có dấu
 * hiệu Phật học. Dùng `deaccent` để "Tuệ", "Tuệ", "đức Phật"… vẫn khớp.
 */

import { deaccent } from "@/lib/chatHelpers";
import type { VideoInfo } from "@/lib/videoIntent";

/** Từ khoá nhận diện nội dung Phật giáo (đã bỏ dấu khi so khớp). */
const BUDDHIST_WORDS = [
  // nền tảng
  "phat",
  "phat gia",
  "phat giao",
  "buddhism",
  "buddha",
  "buddhist",
  "theravada",
  "theravada",
  "kinh",
  "sut ra",
  "giao ly",
  "tang",
  "giam",
  "tam hp",
  "ba ba",
  "hieu phap",
  // khái niệm
  "tu de",
  "tu diep",
  "nhan duyen",
  "nang dao",
  "duc phat",
  "phat huyen",
  "phanh",
  "nhanh",
  "duc du",
  "vong nga",
  "khong ton tai",
  "vo nga",
  "chu phat",
  "phat tinh",
  "chinh kien",
  "nhan loi",
  "nghiep",
  "nghiep qua",
  "luoi nha",
  "tinh tao",
  "tinh niem",
  "an cuu",
  "tru an",
  "sat tru",
  "than tuyet",
  "gioi",
  "hat tuyet",
  // thực hành
  "thien",
  "vipassana",
  "anapanasati",
  "samatha",
  "thiền quán",
  "ngoi",
  "tap cham",
  "cuong chi",
  "giac phap",
  "tu tap",
  "hoa giai",
  "trung dao",
  "bat nha",
  "bam nich",
  "kim cang",
  "amitabha",
  "tay phat",
  "tu bi",
  "hoa khai",
  "cong dung",
  "trung quan",
  "tam ma",
];

/** Chủ đề có phải về Phật giáo không (dùng cho ô tìm kiếm và gợi ý nhanh). */
export function isBuddhistTopic(text: string): boolean {
  const t = deaccent(text.toLowerCase());
  return BUDDHIST_WORDS.some((w) => t.includes(w));
}

/** Một video có phải nội dung Phật giáo không (xét tiêu đề + tên kênh). */
export function isBuddhistVideo(v: VideoInfo): boolean {
  return isBuddhistTopic(`${v.title} ${v.channel}`);
}

/**
 * Chỉ giữ lại video về Phật giáo.
 *
 * `strict = true` dùng ở màn hình tìm video: nếu tên video không nói rõ
 * chủ đề Phật học thì bỏ hẳn, để không hiện nội dung lạc đề.
 */
export function keepBuddhistVideos(
  videos: VideoInfo[],
  strict = false,
): VideoInfo[] {
  if (!strict) return videos;
  return videos.filter(isBuddhistVideo);
}

/** Lời nhắc dùng chung khi không có video Phật giáo nào để hiện. */
export const NO_BUDDHIST_VIDEO_MESSAGE =
  "Trợ lý chỉ tìm và đề xuất video về Phật giáo. Bạn thử chủ đề như Tứ Đế, Tánh niệm, Vipassana, Nghiệp quả hay Luật Tứ Phần nhé.";
