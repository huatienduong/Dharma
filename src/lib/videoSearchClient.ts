/**
 * TÌM VIDEO NGAY TRONG TRÌNH DUYỆT — đường dự phòng cho tìm video.
 *
 * Vì sao cần: tìm video chính (YouTube Data API có khoá) chạy ở máy chủ
 * Convex; nếu máy chủ chưa sẵn sàng thì người dùng phải chờ vô ích. Ở đây ta
 * gọi thẳng server Invidious công khai (CORS mở) để vẫn tìm được video ngay
 * trên máy người dùng. Khi có link YouTube thì chỉ cần ghép ảnh nhỏ, không
 * cần mạng.
 *
 * Ưu tiên: dán link → dựng video ngay; hỏi bằng lời → lần lượt thử các
 * instance Invidious, instance nào sống thì dùng.
 */

import { youtubeVideoId, type VideoInfo } from "@/lib/videoIntent";

/** Các instance Invidious công khai, thử theo thứ tự. */
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nervin.fr",
  "https://yewtu.be",
];

/** "PT1H2M10S" → "1:02:10" hoặc "02:10". */
function durationText(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Câu người dùng gõ → cụm từ tìm trên YouTube (bỏ từ dẫn vô nghĩa). */
function toQuery(raw: string): string {
  return raw
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
 * Tìm video để đưa vào khung chat. Trả về `[]` nếu không tìm được (khi đó
 * người dùng có thể dán link YouTube).
 *
 * Ứng dụng tự dùng khoá của hệ thống qua máy chủ, người dùng KHÔNG phải
 * dán khoá. Hàm này chỉ là đường dự phòng chạy ngay trong trình duyệt:
 * dán link YouTube thì xem được luôn, ngoài ra thử các instance Invidious
 * công khai.
 */
export async function searchVideoInBrowser(raw: string): Promise<VideoInfo[]> {
  // 1. Dán link YouTube → không cần mạng, ghép ảnh nhỏ là xem được ngay.
  const id = youtubeVideoId(raw);
  if (id) {
    return [
      {
        videoId: id,
        title: "",
        channel: "",
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      },
    ];
  }

  const query = toQuery(raw);
  if (!query) return [];

  // 2. Hỏi bằng lời → tìm qua instance Invidious công khai.
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), 7000);
      const res = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: ctl.signal },
      );
      window.clearTimeout(timer);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        type?: string;
        videoId?: string;
        title?: string;
        author?: string;
        videoThumbnails?: { url: string }[];
        lengthSeconds?: number;
      }[];
      const videos: VideoInfo[] = data
        .filter((it) => it.type === "video" && it.videoId && it.title)
        .slice(0, 3)
        .map((it) => ({
          videoId: it.videoId as string,
          title: it.title as string,
          channel: it.author ?? "",
          thumbnail:
            it.videoThumbnails?.[it.videoThumbnails.length - 1]?.url ??
            `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`,
          duration: durationText(it.lengthSeconds),
        }));
      if (videos.length) return videos;
    } catch {
      /* instance này chết hoặc mạng chặn CORS → thử instance tiếp theo */
    }
  }
  return [];
}
