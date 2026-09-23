/**
 * NGHE — nguồn âm thanh từ YouTube Data API.
 * Trang Nghe tải danh sách (kinh tụng / nhạc thiền / pháp âm) qua API
 * YouTube lúc mở trang, phát bằng trình phát audio độc lập
 * (audioPlayer.tsx — YouTube IFrame API ẩn, chỉ nghe âm thanh).
 */

export type AudioKind = "chant" | "music" | "dharma";

export type AudioTrack = {
  /** Khóa duy nhất = YouTube video ID */
  id: string;
  youtubeId: string;
  title: string;
  /** Tên kênh / giảng sư */
  author: string;
  kind: AudioKind;
  durationSec: number;
};

/** Nhãn nhóm hiển thị trong tab của trang Nghe. */
export const AUDIO_KIND_LABEL: Record<AudioKind, string> = {
  chant: "Kinh tụng",
  music: "Nhạc thiền",
  dharma: "Pháp âm",
};

/** Truy vấn YouTube cho từng nhóm — chạy song song khi mở trang. */
export const AUDIO_FEED_QUERIES: Record<AudioKind, string[]> = {
  chant: [
    "kinh tụng pāli theravada",
    "tụng kinh theravada tiếng pāli",
    "kinh tụng chùa phật giáo nguyên thủy",
  ],
  music: [
    "nhạc thiền định thư giãn",
    "nhạc thiền phật giáo không lời",
    "nhạc chuông chùa thiền định",
  ],
  dharma: [
    "pháp thoại theravada nghe",
    "pháp âm phật giáo nguyên thủy",
    "thuyết pháp theravada tiếng việt",
  ],
};

/** Ảnh đại diện video YouTube. */
export function ytThumb(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
}
