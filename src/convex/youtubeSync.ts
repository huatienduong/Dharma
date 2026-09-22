import { internal } from "./_generated/api";
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";

const CHANNEL_HANDLES = ["suhanhtue", "theravadavn", "phapamnguyenthuy2024", "thuvienhoasen"];

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
    const query = q.trim();
    if (!key) throw new Error("Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.");
    if (!query) return { items: [] };

    const result = (await ytFetch("search", {
      part: "snippet", q: query, type: "video", maxResults: "20", relevanceLanguage: "vi",
      ...(pageToken ? { pageToken } : {}), key,
    })) as SearchList;
    const entries = (result.items ?? []).flatMap((item) => {
      const videoId = item.id?.videoId ?? "";
      const title = item.snippet?.title ?? "";
      return videoId && title ? [{ videoId, title, publishedAt: item.snippet?.publishedAt ?? "", channelTitle: item.snippet?.channelTitle ?? "" }] : [];
    });
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
    const result = (await ytFetch("search", { part: "snippet", q: title.replace(/\s+/g, " ").trim().slice(0, 90) || "pháp thoại theravada", type: "video", maxResults: "20", relevanceLanguage: "vi", key })) as SearchList;
    const entries = (result.items ?? []).flatMap((item) => {
      const id = item.id?.videoId ?? "";
      const name = item.snippet?.title ?? "";
      return id && name && id !== youtubeId ? [{ videoId: id, title: name, publishedAt: item.snippet?.publishedAt ?? "", channelTitle: item.snippet?.channelTitle ?? "" }] : [];
    });
    if (entries.length === 0) return { items: [], nextPageToken: result.nextPageToken };
    const details = (await ytFetch("videos", { part: "contentDetails,statistics", id: entries.map((e) => e.videoId).join(","), key })) as VideoList;
    const items: TalkRow[] = [];
    for (const entry of entries) {
      const detail = (details.items ?? []).find((item) => item.id === entry.videoId);
      const durationSec = parseIsoDuration(detail?.contentDetails?.duration);
      const viewCount = Number(detail?.statistics?.viewCount ?? 0);
      await ctx.runMutation(internal.youtubeSync.upsertTalk, { youtubeId: entry.videoId, title: entry.title, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
      items.push({ _id: entry.videoId, youtubeId: entry.videoId, title: entry.title, teacher: entry.channelTitle, channelName: entry.channelTitle, publishedAt: entry.publishedAt, durationSec, viewCount });
    }
    return { items, nextPageToken: result.nextPageToken };
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

export const syncLatest = action({
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
