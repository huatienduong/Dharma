/**
 * FALLBACK TRỰC TIẾP YOUTUBE — khi action Convex lỗi (backend đang deploy
 * lại, mạng đứt tới Convex…), client tự gọi YouTube Data API qua proxy
 * CORS công cộng để VIDEO vẫn hiển thị, không đứng trống.
 *
 * TỐC ĐỘ: mọi host Piped/Invidious được gọi ĐỒNG THỜI (race) — host nhanh
 * nhất thắng. Kết quả lưu cache phiên 10 phút để mở lại trang tức thì.
 */

const PROXIES = [
  (url: string) => url, // thẳng trước — nhanh nhất khi CORS mở
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://test.cors.workers.dev/?${url}`,
];

async function fetchViaProxies(url: string): Promise<unknown> {
  const attempts = PROXIES.map(async (wrap) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9_000);
    const res = await fetch(wrap(url), { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  });
  return Promise.any(attempts);
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

/** Tìm kiếm trực tiếp — dùng khi action Convex lỗi.
 *  Nguồn 1: YouTube Data API (cần VITE_YOUTUBE_API_KEY).
 *  Nguồn 2: Piped API công cộng (KHÔNG cần khóa) — luôn khả dụng. */
export async function searchDirect(q: string, pageToken?: string): Promise<{ items: DirectYtRow[]; nextPageToken?: string }> {
  const query = q.trim();
  if (!query) return { items: [] };
  const cached = readCache(`search:${query}:${pageToken ?? ""}`);
  if (cached) return cached;
  let result: { items: DirectYtRow[]; nextPageToken?: string };
  const key = getApiKey();
  if (key) {
    try {
      result = await dataApiSearch(query, pageToken, key);
    } catch {
      result = { items: await openSearch(query) };
    }
  } else {
    result = { items: await openSearch(query) };
  }
  writeCache(`search:${query}:${pageToken ?? ""}`, result);
  return result;
}

async function dataApiSearch(query: string, pageToken: string | undefined, key: string): Promise<{ items: DirectYtRow[]; nextPageToken?: string }> {

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

/** 50 video đề xuất trực tiếp — nhiều truy vấn chạy SONG SONG, lấp đủ
 *  như backend. Nguồn 1: YouTube Data API (nếu có khóa). Nguồn 2: Piped/
 *  Invidious (không cần khóa). Kết quả cache phiên để quay lại tức thì. */
export async function relatedDirect(excludeId: string, _titleHint: string, targetCount = 50): Promise<{ items: DirectYtRow[] }> {
  const cacheKey = `related:${excludeId || "home"}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const key = getApiKey();
  let result: { items: DirectYtRow[] };
  if (!key) {
    result = { items: await openRelated(excludeId, targetCount) };
  } else {
    const queries = [
      "pháp thoại Phật giáo Theravada nguyên thủy",
      "giáo lý phật pháp kinh điển theravada",
      "thiền định pháp thoại thiền sư việt nam",
      "kinh phật ngày thường theravada",
    ];
    const seen = new Set<string>([excludeId]);
    const collected: DirectYtRow[] = [];
    const batches = await Promise.allSettled(queries.map((q) => dataApiSearch(q, undefined, key)));
    for (const batch of batches) {
      if (batch.status !== "fulfilled") continue;
      for (const row of batch.value.items) {
        if (seen.has(row.youtubeId)) continue;
        seen.add(row.youtubeId);
        collected.push(row);
      }
    }
    if (collected.length === 0) {
      result = { items: await openRelated(excludeId, targetCount) };
    } else {
      result = { items: collected };
    }
  }
  writeCache(cacheKey, result);
  return result;
}

/** Nhiều truy vấn Piped/Invidious chạy SONG SONG lấp đủ số video đề xuất. */
async function openRelated(excludeId: string, targetCount: number): Promise<DirectYtRow[]> {
  const seen = new Set<string>([excludeId]);
  const collected: DirectYtRow[] = [];
  const batches = await Promise.allSettled(PIPED_QUERIES.map((q) => openSearch(q)));
  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue;
    for (const r of batch.value) {
      if (seen.has(r.youtubeId)) continue;
      seen.add(r.youtubeId);
      collected.push(r);
      if (collected.length >= targetCount) return collected;
    }
  }
  return collected;
}

/* ---------------------- Cache phiên 10 phút ---------------------- */

const CACHE_PREFIX = "dharma-yt:";
const CACHE_TTL = 10 * 60 * 1000;

function readCache(key: string): unknown | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: unknown };
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

/* ==================================================================== */
/* PIPED API — nguồn công cộng KHÔNG CẦN KHÓA (CORS mở sẵn)              */
/* ==================================================================== */

const PIPED_HOSTS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
  "https://pipedapi.leptons.xyz",
];

/* Nguồn dự phòng cuối: Invidious (CORS mở, không cần khóa) */
const INVIDIOUS_HOSTS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
];

const PIPED_QUERIES = [
  "phật pháp pháp thoại theravada",
  "pháp thoại theravada nguyên thủy",
  "giáo lý phật pháp kinh điển",
  "thiền định pháp thoại",
  "kinh phật theravada",
];
type PipedItem = {
  url?: string; // "/watch?v=VIDEO_ID"
  title?: string;
  uploaderName?: string;
  duration?: number; // giây
  views?: number;
  uploadedDate?: string;
  thumbnail?: string;
};

function pipedItemToRow(it: PipedItem): DirectYtRow | null {
  const vid = it.url?.split("v=")[1] ?? "";
  if (!vid) return null;
  return {
    _id: vid,
    youtubeId: vid,
    title: it.title ?? "",
    teacher: it.uploaderName ?? "",
    channelName: it.uploaderName ?? "",
    publishedAt: it.uploadedDate ?? "",
    durationSec: typeof it.duration === "number" ? it.duration : 0,
    viewCount: typeof it.views === "number" ? it.views : undefined,
  };
}

/** Tìm kiếm qua Piped — RACE tất cả host cùng lúc, host trả kết quả
 *  hợp lệ đầu tiên thắng. */
async function pipedSearch(query: string): Promise<DirectYtRow[]> {
  const attempts = PIPED_HOSTS.map(async (host) => {
    const url = `${host}/search?q=${encodeURIComponent(query)}&filter=videos`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9_000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { items?: PipedItem[] };
    const rows = (data.items ?? [])
      .map(pipedItemToRow)
      .filter((r): r is DirectYtRow => !!r && isDhammaRelated(r.title, r.channelName));
    if (rows.length === 0) throw new Error("Trống");
    return rows;
  });
  return Promise.any(attempts);
}

/* -------------- Invidious — dự phòng sau Piped -------------- */

type InvidiousItem = {
  videoId?: string;
  title?: string;
  author?: string;
  lengthSeconds?: number;
  viewCount?: number;
  published?: number; // epoch giây
};

function invidiousItemToRow(it: InvidiousItem): DirectYtRow | null {
  const vid = it.videoId ?? "";
  if (!vid) return null;
  return {
    _id: vid,
    youtubeId: vid,
    title: it.title ?? "",
    teacher: it.author ?? "",
    channelName: it.author ?? "",
    publishedAt: typeof it.published === "number" ? new Date(it.published * 1000).toISOString() : "",
    durationSec: typeof it.lengthSeconds === "number" ? it.lengthSeconds : 0,
    viewCount: typeof it.viewCount === "number" ? it.viewCount : undefined,
  };
}

async function invidiousSearch(query: string): Promise<DirectYtRow[]> {
  const attempts = INVIDIOUS_HOSTS.map(async (host) => {
    const url = `${host}/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9_000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as InvidiousItem[];
    const rows = (Array.isArray(data) ? data : [])
      .map(invidiousItemToRow)
      .filter((r): r is DirectYtRow => !!r && isDhammaRelated(r.title, r.channelName));
    if (rows.length === 0) throw new Error("Trống");
    return rows;
  });
  return Promise.any(attempts);
}

/** Tìm kiếm tổng hợp: Piped và Invidious RACE CÙNG LÚC — nguồn nào trả
 *  kết quả hợp lệ đầu tiên thắng. */
async function openSearch(query: string): Promise<DirectYtRow[]> {
  try {
    return await Promise.any([pipedSearch(query), invidiousSearch(query)]);
  } catch {
    // Lần cuối: thử lại tuần tự từng host Piped (xử lý host chậm nhưng sống)
    for (const host of PIPED_HOSTS) {
      try {
        const url = `${host}/search?q=${encodeURIComponent(query)}&filter=videos`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = (await res.json()) as { items?: PipedItem[] };
        const rows = (data.items ?? [])
          .map(pipedItemToRow)
          .filter((r): r is DirectYtRow => !!r && isDhammaRelated(r.title, r.channelName));
        if (rows.length > 0) return rows;
      } catch {
        /* tiếp host kế */
      }
    }
    throw new Error("Không truy cập được nguồn video công cộng.");
  }
}

/** Nhiều truy vấn Piped/Invidious lấp đủ số video đề xuất. */
async function pipedRelated(excludeId: string, targetCount: number): Promise<DirectYtRow[]> {
  const seen = new Set<string>([excludeId]);
  const collected: DirectYtRow[] = [];
  for (const q of PIPED_QUERIES) {
    if (collected.length >= targetCount) break;
    try {
      for (const r of await openSearch(q)) {
        if (!seen.has(r.youtubeId)) {
          seen.add(r.youtubeId);
          collected.push(r);
        }
      }
    } catch {
      /* truy vấn lỗi — thử tiếp */
    }
  }
  return collected;
}
