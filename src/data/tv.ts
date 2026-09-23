/**
 * KÊNH TRUYỀN HÌNH PHẬT GIÁO — phát trực tiếp (livestream) YouTube.
 *
 * — TRUYỀN HÌNH HTV5: livestream 24/7 chính thức từ kênh YouTube HTV
 *   (Trung tâm Sản xuất Phim Truyền hình TP.HCM).
 * — TRUYỀN HÌNH AN VIÊN: livestream 24/7 chính thức từ kênh YouTube
 *   An Viên (AVG, Báo CHĐ & Phát thanh - Truyền hình Đồng Nai).
 *
 * Cả hai kênh phát liên tục trên YouTube — nhúng iframe YouTube trực
 * tiếp (URL /live/) để xem ngay trong ứng dụng, không cần mở YouTube.
 */

export type TvChannel = {
  id: string;
  name: string;
  short: string; // tên ngắn gọn (badge kênh)
  desc: string;
  /** URL nhúng YouTube — /live/<channelId> tự phát livestream đang chạy */
  embedUrl: string;
  /** Trang gốc (mở khi cần) */
  channelUrl: string;
  /** Màu đại diện kênh */
  color: string;
};

export const TV_CHANNELS: TvChannel[] = [
  {
    id: "htv5",
    name: "Truyền hình HTV5",
    short: "HTV5",
    desc: "Kênh giải trí tổng hợp TP.HCM — phát trực tiếp 24/7",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCk__cxsW-QRFUTSt9ueGAPA",
    channelUrl: "https://www.youtube.com/@HTVOfficial/live",
    color: "#e11d48",
  },
  {
    id: "anvien",
    name: "Truyền hình An Viên",
    short: "An Viên",
    desc: "Kênh AVG — phim, văn hóa và Phật pháp truyền hình — 24/7",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCB9UoNc5Zaawq2eTzvCc9BQ",
    channelUrl: "https://www.youtube.com/@AnVienOfficial/live",
    color: "#0f766e",
  },
];
