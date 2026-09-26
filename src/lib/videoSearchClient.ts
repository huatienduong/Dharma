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

import { isBuddhistTopic } from "@/lib/buddhistVideoFilter";
import { youtubeVideoId, type VideoInfo } from "@/lib/videoIntent";

/**
 * KHOÁ API YOUTUBE (tạm thời đặt ở client).
 *
 * Máy chủ Convex chưa deploy được nên nhánh tìm chính thức chưa chạy; để
 * người dùng vẫn tìm được video theo chủ đề, ứng dụng gọi thẳng YouTube
 * Data API v3 bằng khoá này. Khi function máy chủ lên, xoá hằng số này và
 * để `videoSearch:find` dùng khoá trong môi trường Convex — như vậy khoá
 * không còn nằm trong gói mã gửi tới trình duyệt.
 *
 * Khoá nên được giới hạn trong Google Cloud: API → YouTube Data API v3,
 * và hạn chế HTTP referrer.
 */
const YOUTUBE_API_KEY = "AIzaSyCi2pjHLYet8nhf6XIdhf_saL6SgXy5yBg";

/** "PT1H2M10S" → "1:02:10" hoặc "02:10". */
function isoDuration(raw: string | undefined): string | undefined {
  const m = raw?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return undefined;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const sec = Number(m[3] ?? 0);
  return h > 0
    ? `${h}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${min}:${String(sec).padStart(2, "0")}`;
}

/** "1.234.567" → "1,2 triệu lượt xem" (gọn cho danh sách gợi ý). */
export function viewCountText(n: number | undefined): string {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(".", ",")} triệu lượt xem`;
  }
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} nghìn lượt xem`;
  return `${n} lượt xem`;
}

/**
 * Gọi YouTube Data API v3: tìm video (có thêm số lượt xem từ `statistics`).
 * Dùng chung cho tìm theo chủ đề và cho danh sách gợi ý.
 */
async function searchYouTube(
  query: string,
  maxResults: number,
): Promise<VideoInfo[]> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&relevanceLanguage=vi&q=${encodeURIComponent(query)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`,
      { signal: ctl.signal },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: {
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
        };
      }[];
    };
    const items = json.items ?? [];
    const ids = items
      .map((it) => it.id?.videoId)
      .filter((x): x is string => Boolean(x));

    // Nhịp hai: thời lượng + số lượt xem cho các video vừa tìm.
    let extra: Record<
      string,
      { duration?: string; viewCount?: number }
    > = {};
    if (ids.length) {
      try {
        const detail = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids.join(",")}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`,
        );
        if (detail.ok) {
          const dj = (await detail.json()) as {
            items?: {
              id?: string;
              contentDetails?: { duration?: string };
              statistics?: { viewCount?: string };
            }[];
          };
          extra = Object.fromEntries(
            (dj.items ?? []).map((it) => [
              it.id ?? "",
              {
                duration: isoDuration(it.contentDetails?.duration),
                viewCount: it.statistics?.viewCount
                  ? Number(it.statistics.viewCount)
                  : undefined,
              },
            ]),
          );
        }
      } catch {
        /* thiếu số liệu thì bỏ trống, không sao */
      }
    }

    return items
      .map((it): VideoInfo | null => {
        const videoId = it.id?.videoId;
        if (!videoId) return null;
        return {
          videoId,
          title: it.snippet?.title ?? "",
          channel: it.snippet?.channelTitle ?? "",
          thumbnail:
            it.snippet?.thumbnails?.high?.url ??
            it.snippet?.thumbnails?.medium?.url ??
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: extra[videoId]?.duration,
          viewCount: extra[videoId]?.viewCount,
        };
      })
      .filter((x): x is VideoInfo => x !== null);
  } catch {
    return [];
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * DANH SÁCH GỢI Ý — video Phật giáo hay xem, tối đa `limit` video, tải khi
 * mở màn hình. Trả về [] nếu mạng lỗi thì màn hình vẫn dùng được.
 */
export async function fetchSuggestedVideos(limit = 20): Promise<VideoInfo[]> {
  const queries = [
    "phat hoc",
    "giao ly phat gia",
    "thien tap",
    "kinh phat gia",
  ];
  const seen = new Set<string>();
  const out: VideoInfo[] = [];
  for (const q of queries) {
    if (out.length >= limit) break;
    const batch = await searchYouTube(q, 10);
    for (const v of batch) {
      if (out.length >= limit) break;
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      out.push(v);
    }
  }
  return out.slice(0, limit);
}

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

  const topic = toQuery(raw);
  if (!topic) return [];
  // Người dùng gõ chủ đề tuỳ ý ("thiền", "dukkha"…): thêm "Phật giáo" vào câu
  // tìm để YouTube trả về đúng nhóm video liên quan tới Phật giáo, thay vì
  // chặn lại chủ đề lạ. Câu đã nói rõ Phật giáo thì giữ nguyên.
  const query = isBuddhistTopic(topic) ? topic : `${topic} Phật giáo`;

  // 2. Hỏi bằng lời → tìm bằng YouTube Data API (có tên kênh + thời lượng).
  const byKey = await searchYouTube(query, 5);
  if (byKey.length) return byKey;

  // 3. Không được thì thử instance Invidious công khai.
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
