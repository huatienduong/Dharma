import { internal } from "./_generated/api";
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";

const CHANNEL_HANDLES = ["suhanhtue", "theravadavn", "phapamnguyenthuy2024", "thuvienhoasen"];

/* ------------------------------------------------------------------ */
/* LỌC CHỈ PHẬT PHÁP — ứng dụng là nơi tìm video PHÁP THOẠI:            */
/* mọi kết quả tìm kiếm/đề xuất phải thuộc phạm vi Phật pháp; video     */
/* ngoài chủ đề bị loại, không hiển thị cho người dùng.                 */
/* ------------------------------------------------------------------ */

// Từ khóa cốt lõi (không dấu để khớp cả "Phap thoai", "Tin phuc"...)
const DHAMMA_KEYWORDS = [
  "phap thoai", "pháp thoại", "phat phap", "phật pháp", "dhamma", "dharma",
  "theravada", "theravāda", "nguyen thuy", "nguyên thủy", "kinh", "kinh dien", "kinh điển",
  "buddha", "đức phật", "duc phat", "phật", "phat", "ni tich", "ni tịch", "thich", "thích",
  "su to", "sư tổ", "su co", "sư cô", "ho thuong", "hòa thượng", "hoà thượng", "dai duc", "đại đức",
  "thien", "thiền", "vipassana", "vipassanā", "samatha", "mindfulness", "niem hien tho", "niệm hơi thở",
  "tu sie diem", "tứ diệu đế", "tu dieu de", "bat chanh dao", "bát chánh đạo",
  "an chanh niem", "án chánh niệm", "nieu quan", "niệm quán", "van uan", "ngũ uẩn", "van uan",
  "nhan duyên", "nhân duyên", "nhan duyen", "luat tang", "luật tạng", "abhidhamma", "vi dieu phap",
  "dieu phap", "diệu pháp", "chuyen phap lun", "chuyển pháp luân", "pali", "pāli", "nikaya", "nikāya",
  "an gi roi", "an trí", "an tri", "bodhi", "bồ đề", "bo de", "nirvana", "niết bàn", "niet ban",
  "an lac", "an lạc", "giac ngo", "giác ngộ", "dao phat", "đạo phật", "karma", "nghiệp",
  "hoi huong", "hồi hướng", "ba la mat", "ba-la-mật", "parami", "pāramī", "metta", "mettā", "từ bi", "tu bi",
  "hoi tinh", "hội tinh", "hanh huong", "hành hương", "thu tim", "sūtra", "sutra", "vinaya", "sangha", "tăng đoàn",
];

// Từ khóa chặn chủ đề ngoài Phật pháp (âm nhạc, phim, game, giải trí...)
const BLOCKED_KEYWORDS = [
  "tin lanh", "tin lành", "christ", "jesus", "chúa", "chua", "giáo hội", "giao hoi",
  "thánh ca", "thanh ca", "nhạc thánh", "nhac thanh", "hallelujah", "kinh thánh", "kinh thanh", "bible",
  "phim", "movie", "trailer", "game", "esport", "livestream game", "roblox", "minecraft",
  "nhạc trẻ", "nhac tre", "nhac remix", "nhạc remix", "karaoke", "mv official", "lyric",
  "hài", "hai ecuador", "vlog", "tiktok", "reaction", "am nhac", "âm nhạc",
  "bóng đá", "bong da", "champions league", "premier league", "world cup", "seagame", "olympic",
  "crypto", "chứng khoán", "chung khoan", "bitcoin", "trade forex", "kinh doanh",
  "nấu ăn", "nau an", "recipe", "makeup", "review điện thoại", "smartphone review",
];

function toAsciiLower(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Kết quả có liên quan Phật pháp không? (nhanh, không gọi API) */
export function isDhammaRelated(title: string, channelName: string): boolean {
  const hay = toAsciiLower(`${title} ${channelName}`);
  if (BLOCKED_KEYWORDS.some((k) => hay.includes(toAsciiLower(k)))) return false;
  // Kênh Phật giáo rõ ràng → cho qua (kênh chùa/ni viện/giảng sư)
  const channelHints = ["phat", "phap", "dhamma", "dharma", "theravada", "buddh", "hoasen", "chua", "ni", "su", "thien vien", "tinh xá", "tinh xa", "giac", "ho thuong", "ni tich"];
  if (channelHints.some((k) => toAsciiLower(channelName).includes(k))) return true;
  return DHAMMA_KEYWORDS.some((k) => hay.includes(toAsciiLower(k)));
}

/** Ghép từ khóa người dùng với bối cảnh Phật pháp để chỉ trả kết quả đúng chủ đề. */
export function buildDhammaQuery(q: string): string {
  const query = q.trim();
  if (!query) return "pháp thoại Phật giáo Theravada";
  if (isDhammaRelated(query, "")) return query;
  return `${query} phật pháp pháp thoại`;
}

type ChannelList = { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
type PlaylistItems = { items?: Array<{ snippet?: { resourceId?: { videoId?: string }; title?: string; publishedAt?: string; channelTitle?: string } }>; nextPageToken?: string };
type VideoList = { items?: Array<{ id?: string; contentDetails?: { duration?: string }; statistics?: { viewCount?: string } }> };
type SearchList = { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; publishedAt?: string; channelTitle?: string } }>; nextPageToken?: string };

type TalkRow = {
  _id: unknown;
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
  viewCount?: number;
};

function parseIsoDuration(iso?: string): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

async function ytFetch(path: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`YouTube API ${path} lỗi ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return (await response.json()) as unknown;
}

const byIds = internalQuery({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }): Promise<TalkRow[]> => {
    const out: TalkRow[] = [];
    for (const id of ids) {
      const row = await ctx.db.query("dhammaTalks").withIndex("by_youtubeId", (q) => q.eq("youtubeId", id)).unique();
      if (row) out.push(row as unknown as TalkRow);
    }
    return out;
  },
});

export const search = action({
  args: { q: v.string(), pageToken: v.optional(v.string()) },
  handler: async (ctx, { q, pageToken }): Promise<{ items: TalkRow[]; nextPageToken?: string }> => {
    const key = process.env.YOUTUBE_API_KEY;
    const rawQuery = q.trim();
    if (!key) throw new Error("Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.");
    if (!rawQuery) return { items: [] };

    // BẮT BUỘC kết quả về Phật pháp: ghép bối cảnh nếu từ khóa lẻ tẻ,
    // và luôn lọc kết quả trả về theo isDhammaRelated.
    const query = buildDhammaQuery(rawQuery);
    const result = (await ytFetch("search", {
      part: "snippet", q: query, type: "video", maxResults: "20", relevanceLanguage: "vi",
      ...(pageToken ? { pageToken } : {}), key,
    })) as SearchList;
    const entries = (result.items ?? []).flatMap((item) => {
      const videoId = item.id?.videoId ?? "";
      const title = item.snippet?.title ?? "";
      return videoId && title ? [{ videoId, title, publishedAt: item.snippet?.publishedAt ?? "", channelTitle: item.snippet?.channelTitle ?? "" }] : [];
    }).filter((e) => isDhammaRelated(e.title, e.channelTitle));
    if (entries.length === 0) return { items: [], nextPageToken: result.nextPageToken };

    const details = (await ytFetch("videos", { part: "contentDetails,statistics", id: entries.map((e) => e.videoId).join(","), key })) as VideoList;
    const items: TalkRow[] = [];
    for (const entry of entries) {
      const detail = (details.items ?? []).find((item) => item.id === entry.videoId);
      const durationSec = parseIsoDuration(detail?.contentDetails?.duration);
      const viewCount = Number(detail?.statistics?.viewCount ?? 0);
      await ctx.runMutation(internal.youtubeSync.upsertTalk, { youtubeId: entry.videoId, title: entry.title, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
      // Trả kết quả trực tiếp thay vì phụ thuộc vào lần query lại kho Convex.
      items.push({ _id: entry.videoId, youtubeId: entry.videoId, title: entry.title, teacher: entry.channelTitle, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
    }
    return { items, nextPageToken: result.nextPageToken };
  },
});

export const related = action({
  args: { youtubeId: v.string(), title: v.string() },
  handler: async (ctx, { youtubeId, title }): Promise<{ items: TalkRow[]; nextPageToken?: string }> => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.");

    /* ĐỦ 50 VIDEO ĐỀ XUẤT: 1 trang API chỉ có 20 kết quả — lọc Phật pháp
     * lại rơi bớt nên phải tải NHIỀU TRANG với các truy vấn khác nhau
     * (video liên quan → pháp thoại nguyên thủy → giáo lý) cho đến khi
     * đủ ~50 video hợp lệ hoặc hết 4 truy vấn. */
    const baseQuery = title.replace(/\s+/g, " ").trim().slice(0, 90) || "pháp thoại theravada";
    const queries = [
      baseQuery,
      "pháp thoại Phật giáo Theravada nguyên thủy",
      "giáo lý phật pháp Theravada kinh điển",
      "thiền định pháp thoại thiền sư",
    ];
    const seen = new Set<string>([youtubeId]);
    const collected: Array<{ videoId: string; title: string; publishedAt: string; channelTitle: string }> = [];
    for (const q of queries) {
      if (collected.length >= 55) break;
      try {
        const result = (await ytFetch("search", { part: "snippet", q, type: "video", maxResults: "50", relevanceLanguage: "vi", key })) as SearchList;
        for (const item of result.items ?? []) {
          const id = item.id?.videoId ?? "";
          const name = item.snippet?.title ?? "";
          if (!id || !name || seen.has(id)) continue;
          if (!isDhammaRelated(name, item.snippet?.channelTitle ?? "")) continue;
          seen.add(id);
          collected.push({ videoId: id, title: name, publishedAt: item.snippet?.publishedAt ?? "", channelTitle: item.snippet?.channelTitle ?? "" });
        }
      } catch {
        /* truy vấn này lỗi — thử truy vấn kế tiếp */
      }
    }
    if (collected.length === 0) return { items: [] };

    const items: TalkRow[] = [];
    for (let i = 0; i < collected.length; i += 50) {
      const batch = collected.slice(i, i + 50);
      const details = (await ytFetch("videos", { part: "contentDetails,statistics", id: batch.map((e) => e.videoId).join(","), key })) as VideoList;
      for (const entry of batch) {
        const detail = (details.items ?? []).find((item) => item.id === entry.videoId);
        const durationSec = parseIsoDuration(detail?.contentDetails?.duration);
        const viewCount = Number(detail?.statistics?.viewCount ?? 0);
        await ctx.runMutation(internal.youtubeSync.upsertTalk, { youtubeId: entry.videoId, title: entry.title, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
        items.push({ _id: entry.videoId, youtubeId: entry.videoId, title: entry.title, teacher: entry.channelTitle, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
      }
    }
    return { items: items.slice(0, 60) };
  },
});

export const upsertTalk = internalMutation({
  args: { youtubeId: v.string(), title: v.string(), channelName: v.string(), publishedAt: v.string(), durationSec: v.number(), viewCount: v.number() },
  handler: async (ctx, talk) => {
    const existing = await ctx.db.query("dhammaTalks").withIndex("by_youtubeId", (q) => q.eq("youtubeId", talk.youtubeId)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { title: talk.title || existing.title, channelName: talk.channelName || existing.channelName, publishedAt: talk.publishedAt || existing.publishedAt, durationSec: talk.durationSec > 0 ? talk.durationSec : existing.durationSec, viewCount: talk.viewCount > 0 ? talk.viewCount : existing.viewCount, syncedAt: Date.now() });
      return "updated" as const;
    }
    await ctx.db.insert("dhammaTalks", { youtubeId: talk.youtubeId, title: talk.title, teacher: talk.channelName, channelName: talk.channelName, publishedAt: talk.publishedAt, durationSec: talk.durationSec, viewCount: talk.viewCount, syncedAt: Date.now() });
    return "inserted" as const;
  },
});

/* ------------------------------------------------------------------ */
/* TRUYỀN HÌNH — tìm video PHÁT TRỰC TIẾP đang chạy của một kênh.       */
/* Livestream của kênh TV không phải 24/7 cố định nên KHÔNG nhúng URL    */
/* tĩnh: mỗi lần mở trang Truyền hình, tra YouTube Data API              */
/* (search.evenType=live) để lấy videoId livestream hiện tại rồi nhúng.  */
/* ------------------------------------------------------------------ */

export const getLive = action({
  args: { channelId: v.string() },
  handler: async (_ctx, { channelId }): Promise<{ youtubeId: string; title: string } | null> => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.");
    if (!/^UC[A-Za-z0-9_-]{20,}$/.test(channelId)) throw new Error("channelId không hợp lệ.");

    // 1) Tìm livestream đang phát của kênh (eventType=live)
    const search = (await ytFetch("search", {
      part: "snippet", channelId, type: "video", eventType: "live", maxResults: "1", key,
    })) as SearchList;
    const liveId = search.items?.[0]?.id?.videoId ?? "";
    const liveTitle = search.items?.[0]?.snippet?.title ?? "";

    // 2) Không có live → trả về video MỚI NHẤT của kênh (xem như TV延迟)
    if (!liveId) {
      const ch = (await ytFetch("channels", { part: "contentDetails", id: channelId, key })) as ChannelList;
      const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) return null;
      const latest = (await ytFetch("playlistItems", { part: "snippet", playlistId: uploads, maxResults: "1", key })) as PlaylistItems;
      const vid = latest.items?.[0]?.snippet?.resourceId?.videoId ?? "";
      if (!vid) return null;
      return { youtubeId: vid, title: latest.items?.[0]?.snippet?.title ?? "" };
    }
    return { youtubeId: liveId, title: liveTitle };
  },
});
  args: { pages: v.optional(v.number()) },
  handler: async (ctx, { pages }) => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.");
    let inserted = 0, updated = 0, videos = 0;
    for (const handle of CHANNEL_HANDLES) {
      let uploadsPlaylistId: string | undefined;
      for (const param of ["forHandle", "forUsername"]) {
        const data = (await ytFetch("channels", { part: "contentDetails", [param]: `@${handle}`, key })) as ChannelList;
        uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) break;
      }
      if (!uploadsPlaylistId) continue;
      const entries: Array<{ videoId: string; title: string; publishedAt: string; channelTitle: string }> = [];
      let pageToken: string | undefined;
      for (let page = 0; page < Math.min(Math.max(1, pages ?? 4), 40); page++) {
        const playlist = (await ytFetch("playlistItems", { part: "snippet", playlistId: uploadsPlaylistId, maxResults: "50", ...(pageToken ? { pageToken } : {}), key })) as PlaylistItems;
        for (const item of playlist.items ?? []) {
          const videoId = item.snippet?.resourceId?.videoId ?? "";
          const title = item.snippet?.title ?? "";
          if (videoId && title) entries.push({ videoId, title, publishedAt: item.snippet?.publishedAt ?? "", channelTitle: item.snippet?.channelTitle ?? "" });
        }
        pageToken = playlist.nextPageToken;
        if (!pageToken) break;
      }
      for (let i = 0; i < entries.length; i += 50) {
        const batch = entries.slice(i, i + 50);
        const details = (await ytFetch("videos", { part: "contentDetails,statistics", id: batch.map((e) => e.videoId).join(","), key })) as VideoList;
        for (const entry of batch) {
          const detail = (details.items ?? []).find((item) => item.id === entry.videoId);
          const result = await ctx.runMutation(internal.youtubeSync.upsertTalk, { youtubeId: entry.videoId, title: entry.title, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec: parseIsoDuration(detail?.contentDetails?.duration), viewCount: Number(detail?.statistics?.viewCount ?? 0) });
          videos++; if (result === "inserted") inserted++; else updated++;
        }
        if (i + 50 < entries.length) await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    return { inserted, updated, videos };
  },
});
