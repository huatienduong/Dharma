/**
 * TÌM VIDEO YOUTUBE — action Convex.
 *
 * Luồng:
 *  1. Người dùng dán link YouTube → trả về đúng video đó (không cần khoá).
 *  2. Người dùng chỉ hỏi bằng lời ("xem video về nghiệp cú") → tìm bằng
 *     YouTube Data API v3 nếu có `YOUTUBE_API_KEY`; nếu chưa có khoá thì thử
 *     một server Invidious công khai, và luôn kèm lời nhắc dán link.
 *
 * Chỉ trả về dữ liệu công khai (tiêu đề, kênh, ảnh nhỏ) — không tải video về,
 * không lưu gì trong database: client nhúng trực tiếp bằng iframe.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/** Kết quả trả về cho client (giống hệt `VideoInfo` bên frontend). */
const videoOut = v.object({
  videoId: v.string(),
  title: v.string(),
  channel: v.string(),
  thumbnail: v.string(),
  duration: v.optional(v.string()),
});

/** Rút `videoId` 11 ký tự từ mọi dạng link YouTube. */
function videoIdFromUrl(raw: string): string | null {
  const ID = "[A-Za-z0-9_-]{11}";
  const patterns = [
    new RegExp(`[?&]v=(${ID})`),
    new RegExp(`youtu\\.be/(${ID})`),
    new RegExp(`/embed/(${ID})`),
    new RegExp(`/shorts/(${ID})`),
    new RegExp(`/live/(${ID})`),
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return m[1];
  }
  return null;
}

/** "PT1H2M10S" (định dạng API) → "1:02:10" hoặc "02:10". */
function isoDuration(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return undefined;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const mm = h > 0 ? String(min).padStart(2, "0") : String(min);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

type SearchItem = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
};

/** Tín hiệu huỷ sau `ms` — runtime của Convex không bảo đảm có
 *  `AbortSignal.timeout`, nên tự đặt hẹn giờ cho chắc chắn. */
function timeoutSignal(ms: number): AbortSignal {
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
}

/** Server Invidious công khai — dự phòng khi chưa có khoá API. */
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
];

/** Tìm bằng Invidious khi không có `YOUTUBE_API_KEY`. */
async function searchViaInvidious(query: string): Promise<SearchItem[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: timeoutSignal(6000) },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        type?: string;
        videoId?: string;
        title?: string;
        author?: string;
        videoThumbnails?: { url: string }[];
        lengthSeconds?: number;
      }[];
      const items = data
        .filter((it) => it.type === "video" && it.videoId && it.title)
        .slice(0, 3)
        .map((it) => ({
          videoId: it.videoId as string,
          title: it.title as string,
          channel: it.author ?? "",
          thumbnail:
            it.videoThumbnails?.[it.videoThumbnails.length - 1]?.url ??
            `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`,
          duration: it.lengthSeconds
            ? isoDuration(`PT${it.lengthSeconds}S`)
            : undefined,
        }));
      if (items.length) return items;
    } catch {
      /* thử instance tiếp theo */
    }
  }
  return [];
}

/**
 * Trạng thái tìm video — báo khoá đã nạp hay chưa, để kiểm chứng nhanh mà
 * không phải đoán từ triệu chứng “không thấy thẻ video”.
 */
export const status = action({
  args: {},
  handler: async (): Promise<{ youtube: boolean }> => {
    return { youtube: Boolean(process.env.YOUTUBE_API_KEY) };
  },
});

export const find = action({
  args: {
    /** Câu người dùng gõ (có thể chứa link YouTube). */
    query: v.string(),
  },
  handler: async (ctx, args): Promise<{
    ok: boolean;
    videos: SearchItem[];
    /** Lý do không tìm được, để client báo gọn cho người dùng. */
    message?: string;
  }> => {
    const raw = args.query.trim();
    if (!raw) return { ok: false, videos: [], message: "Chưa có nội dung cần tìm." };

    const directId = videoIdFromUrl(raw);
    const key = process.env.YOUTUBE_API_KEY;

    // 1. Có link trong tin nhắn → ưu tiên đúng video đó.
    if (directId) {
      return {
        ok: true,
        videos: [
          {
            videoId: directId,
            title: "",
            channel: "",
            thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          },
        ],
      };
    }

    const query = raw
      .replace(
        /\b(xem|cho|minh|ban|co|coi|mo|giup|tim|ve|video|clip|tren|youtube|cua|nao|nho|gi|het|roi)\b/gi,
        " ",
      )
      .replace(/[?!.,]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!query) {
      return {
        ok: false,
        videos: [],
        message: "Bạn muốn xem video về chủ đề nì? Hãy nói rõ chủ đề hoặc dán link YouTube.",
      };
    }

    // 2. Có khoá API → tìm chính thức, có tên kênh và thời lượng.
    if (key) {
      try {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&relevanceLanguage=vi&q=${encodeURIComponent(query)}&key=${key}`,
          { signal: timeoutSignal(8000) },
        );
        if (searchRes.ok) {
          const searchJson = (await searchRes.json()) as {
            items?: {
              id?: { videoId?: string };
              snippet?: {
                title?: string;
                channelTitle?: string;
                thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
              };
            }[];
          };
          const items = searchJson.items ?? [];
          const ids = items
            .map((it) => it.id?.videoId)
            .filter((id): id is string => Boolean(id));
          let durations: Record<string, string | undefined> = {};
          if (ids.length) {
            try {
              const detailRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids.join(",")}&key=${key}`,
                { signal: timeoutSignal(8000) },
              );
              if (detailRes.ok) {
                const detailJson = (await detailRes.json()) as {
                  items?: { id?: string; contentDetails?: { duration?: string } }[];
                };
                durations = Object.fromEntries(
                  (detailJson.items ?? []).map((it) => [
                    it.id ?? "",
                    isoDuration(it.contentDetails?.duration),
                  ]),
                );
              }
            } catch {
              /* thiếu thời lượng thì bỏ trống, không sao */
            }
          }
          const videos = items
            .map((it): SearchItem | null => {
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
                duration: durations[videoId],
              };
            })
            .filter((item): item is SearchItem => item !== null);
          if (videos.length) return { ok: true, videos };
        }
      } catch {
        /* rơi xuống dự phòng bên dưới */
      }
    }

    // 3. Dự phòng: server Invidious công khai.
    const fallback = await searchViaInvidious(query);
    if (fallback.length) return { ok: true, videos: fallback };

    return {
      ok: false,
      videos: [],
      message: key
        ? "Chưa tìm được video nào cho chủ đề này. Bạn thử dán link YouTube cụ thể nhé."
        : "Bạn dán link YouTube cụ thể là Trợ lý mở xem ngay trong khung chat nhé.",
    };
  },
});
