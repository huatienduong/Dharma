/**
 * FALLBACK TRỰC TIẾP YOUTUBE — khi action Convex lỗi (backend đang deploy
 * lại, mạng đứt tới Convex…), client tự gọi YouTube Data API qua proxy
 * CORS công cộng để VIDEO vẫn hiển thị, không đứng trống.
 *
 * Proxy dùng các dịch vụ CORS công cộng — chỉ cho luồng đọc (search),
 * không chạm khóa riêng nào ngoài YOUTUBE_API_KEY của dự án (được hệ
 * thống cấp qua biến môi trường khi build, không hard-code).
 */

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => url, // thử trực tiếp cuối cùng (một số môi trường cho phép)
];

async function fetchViaProxies(url: string): Promise<unknown> {
  let lastErr: unknown = null;
  for (const wrap of PROXIES) {
    try {
      // AbortSignal.timeout có thể không tồn tại trên trình duyệt cũ — hủy thủ công
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(wrap(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Tất cả proxy đều lỗi");
}

export type DirectYtRow = {
  _id: string;
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
  viewCount?: number;
};

type SearchList = {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; publishedAt?: string; channelTitle?: string } }>;
  nextPageToken?: string;
};
type VideoList = {
  items?: Array<{ id?: string; contentDetails?: { duration?: string }; statistics?: { viewCount?: string } }>;
};

function parseIsoDuration(iso?: string): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

/* Từ khóa lọc Phật pháp — đồng bộ với backend (youtubeSync.ts) */
const DHAMMA_HINTS = [
  "phap", "phật", "phat", "dhamma", "dharma", "theravada", "buddha", "buddh",
  "kinh", "thien", "thiền", "ni tich", "ni tịch", "su to", "sư", "ho thuong",
  "hoà thượng", "chua", "viện", "tinh xa", "tịnh xá", "giac ngo", "giác ngộ",
  "niet ban", "niết bàn", "tu", "dao", "đạo", "metta", "vipassana", "samatha",
  "an lac", "an lạc", "bo de", "bồ đề", "pali", "pāli", "nikaya", "nikāya",
];

function toAsciiLower(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
}

function isDhammaRelated(title: string, channel: string): boolean {
  const hay = toAsciiLower(`${title} ${channel}`);
  const blocked = ["tin lanh", "tin lành", "jesus", "chúa", "phim", "movie", "nhac", "nhạc", "karaoke", "game", "bóng đá"];
  if (blocked.some((k) => hay.includes(k))) return false;
  return DHAMMA_HINTS.some((k) => hay.includes(k));
}

function getApiKey(): string {
  // Khóa YouTube do dự án cấp qua biến môi trường build-time
  return (import.meta.env?.VITE_YOUTUBE_API_KEY as string | undefined) ?? "";
}

/** Tìm kiếm trực tiếp qua proxy — dùng khi action Convex lỗi. */
export async function directSearch(q: string, pageToken?: string): Promise<{ items: DirectYtRow[]; nextPageToken?: string }> {
  const key = getApiKey();
  if (!key) throw new Error("Chưa có khóa YouTube phía client.");
  const query = q.trim();
  if (!query) return { items: [] };

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  for (const [k, v] of Object.entries({
    part: "snippet", q: `${query} phật pháp pháp thoại`, type: "video",
    maxResults: "20", relevanceLanguage: "vi", ...(pageToken ? { pageToken } : {}), key,
  })) searchUrl.searchParams.set(k, v);

  const search = (await fetchViaProxies(searchUrl.toString())) as SearchList;
  const entries = (search.items ?? [])
    .map((it) => ({
      videoId: it.id?.videoId ?? "",
      title: it.snippet?.title ?? "",
      publishedAt: it.snippet?.publishedAt ?? "",
      channelTitle: it.snippet?.channelTitle ?? "",
    }))
    .filter((e) => e.videoId && e.title && isDhammaRelated(e.title, e.channelTitle));
  if (entries.length === 0) return { items: [], nextPageToken: search.nextPageToken };

  const detUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detUrl.searchParams.set("part", "contentDetails,statistics");
  detUrl.searchParams.set("id", entries.map((e) => e.videoId).join(","));
  detUrl.searchParams.set("key", key);
  const details = (await fetchViaProxies(detUrl.toString())) as VideoList;

  const items: DirectYtRow[] = entries.map((e) => {
    const d = (details.items ?? []).find((x) => x.id === e.videoId);
    return {
      _id: e.videoId,
      youtubeId: e.videoId,
      title: e.title,
      teacher: e.channelTitle,
      channelName: e.channelTitle,
      publishedAt: e.publishedAt,
      durationSec: parseIsoDuration(d?.contentDetails?.duration),
      viewCount: Number(d?.statistics?.viewCount ?? 0),
    };
  });
  return { items, nextPageToken: search.nextPageToken };
}

/** 50 video đề xuất trực tiếp — nhiều truy vấn lấp đủ như backend. */
export async function directRelated(excludeId: string): Promise<{ items: DirectYtRow[] }> {
  const key = getApiKey();
  if (!key) throw new Error("Chưa có khóa YouTube phía client.");
  const queries = [
    "pháp thoại Phật giáo Theravada nguyên thủy",
    "giáo lý phật pháp kinh điển theravada",
    "thiền định pháp thoại thiền sư việt nam",
    "kinh phật ngày thường theravada",
  ];
  const seen = new Set<string>([excludeId]);
  const collected: DirectYtRow[] = [];

  for (const q of queries) {
    if (collected.length >= 55) break;
    try {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      for (const [k, v] of Object.entries({
        part: "snippet", q, type: "video", maxResults: "50", relevanceLanguage: "vi", key,
      })) searchUrl.searchParams.set(k, v);
      const search = (await fetchViaProxies(searchUrl.toString())) as SearchList;
      const entries = (search.items ?? [])
        .map((it) => ({
          videoId: it.id?.videoId ?? "",
          title: it.snippet?.title ?? "",
          publishedAt: it.snippet?.publishedAt ?? "",
          channelTitle: it.snippet?.channelTitle ?? "",
        }))
        .filter((e) => e.videoId && e.title && !seen.has(e.videoId) && isDhammaRelated(e.title, e.channelTitle));
      for (const e of entries) seen.add(e.videoId);

      if (entries.length > 0) {
        const detUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
        detUrl.searchParams.set("part", "contentDetails,statistics");
        detUrl.searchParams.set("id", entries.map((e) => e.videoId).join(","));
        detUrl.searchParams.set("key", key);
        const details = (await fetchViaProxies(detUrl.toString())) as VideoList;
        for (const e of entries) {
          const d = (details.items ?? []).find((x) => x.id === e.videoId);
          collected.push({
            _id: e.videoId, youtubeId: e.videoId, title: e.title,
            teacher: e.channelTitle, channelName: e.channelTitle,
            publishedAt: e.publishedAt,
            durationSec: parseIsoDuration(d?.contentDetails?.duration),
            viewCount: Number(d?.statistics?.viewCount ?? 0),
          });
        }
      }
    } catch {
      /* truy vấn này lỗi — thử tiếp */
    }
  }
  return { items: collected };
}
