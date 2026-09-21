import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";

// Kênh Theravada (tiếng Việt) cần đồng bộ pháp thoại mới.
// Mỗi mục được thử resolve qua forHandle rồi forUsername; kênh nào
// không resolve được sẽ bị bỏ qua một cách êm đẹp.
const CHANNEL_HANDLES = [
  "suhanhtue", // Sư Hạnh Tuệ Theravāda
  "theravadavn", // PHẬT GIÁO THERAVĀDA VN
  "phapamnguyenthuy2024", // Pháp Âm Nguyên Thủy (Sư Toại Khanh, Sư Giác Nguyên…)
  "thuvienhoasen", // Thư Viện Hoa Sen (TT. Thích Nhật Từ)
];

type ChannelList = {
  items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
};

type PlaylistItems = {
  items?: Array<{
    snippet?: {
      resourceId?: { videoId?: string };
      title?: string;
      publishedAt?: string;
      channelTitle?: string;
    };
  }>;
};

type VideoList = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; publishedAt?: string; channelTitle?: string };
    contentDetails?: { duration?: string };
    statistics?: { viewCount?: string };
  }>;
};

type SearchList = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; publishedAt?: string; channelTitle?: string };
  }>;
  nextPageToken?: string;
};

// "PT1H23M45S" -> số giây
function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(mi ?? 0) * 60 +
    Number(s ?? 0)
  );
}

async function ytFetch(path: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, val] of Object.entries(params)) url.searchParams.set(k, val);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube API ${path} lỗi ${res.status}`);
  }
  return (await res.json()) as unknown;
}

/** Dạng bản ghi pháp thoại trả về cho frontend. */
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

/** Lấy toàn bộ bản ghi pháp thoại theo danh sách youtubeId (giữ thứ tự). */
const byIds = internalQuery({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }): Promise<TalkRow[]> => {
    const out: TalkRow[] = [];
    for (const id of ids) {
      const row = await ctx.db
        .query("dhammaTalks")
        .withIndex("by_youtubeId", (q) => q.eq("youtubeId", id))
        .unique();
      if (row) out.push(row as unknown as TalkRow);
    }
    return out;
  },
});

/**
 * Tìm kiếm pháp thoại TRỰC TIẾP trên YouTube Data API (không chỉ kho cục bộ):
 * kết quả mới nhất từ toàn YouTube — tự lưu vào kho để lần sau đọc tức thì.
 */
export const search = action({
  args: { q: v.string(), pageToken: v.optional(v.string()) },
  handler: async (
    ctx,
    { q, pageToken },
  ): Promise<{ items: TalkRow[]; nextPageToken?: string }> => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.",
      );
    }
    const s = (await ytFetch("search", {
      part: "snippet",
      q,
      type: "video",
      maxResults: "20",
      relevanceLanguage: "vi",
      ...(pageToken ? { pageToken } : {}),
      key,
    })) as SearchList;

    const entries: Array<{
      videoId: string;
      title: string;
      publishedAt: string;
      channelTitle: string;
    }> = [];
    for (const it of s.items ?? []) {
      const vid = it.id?.videoId ?? "";
      const title = it.snippet?.title ?? "";
      if (vid && title)
        entries.push({
          videoId: vid,
          title,
          publishedAt: it.snippet?.publishedAt ?? "",
          channelTitle: it.snippet?.channelTitle ?? "",
        });
    }
    const ids = entries.map((e) => e.videoId);
    if (ids.length === 0) return { items: [], nextPageToken: undefined };

    const details = (await ytFetch("videos", {
      part: "contentDetails,statistics",
      id: ids.join(","),
      key,
    })) as VideoList;
    for (const e of entries) {
      const d = (details.items ?? []).find((x) => x.id === e.videoId);
      await ctx.runMutation(internal.youtubeSync.upsertTalk, {
        youtubeId: e.videoId,
        title: e.title,
        channelName: e.channelTitle,
        publishedAt: e.publishedAt,
        durationSec: parseIsoDuration(d?.contentDetails?.duration),
        viewCount: Number(d?.statistics?.viewCount ?? 0),
      });
    }
    // internal.youtubeSync.byIds — types _generated chưa refresh, cast tạm
    const rows = (await (
      ctx.runQuery as (
        ref: unknown,
        args: { ids: string[] },
      ) => Promise<TalkRow[]>
    )((internal.youtubeSync as unknown as { byIds: unknown }).byIds, {
      ids,
    }));
    return { items: rows, nextPageToken: s.nextPageToken };
  },
});

/**
 * Đề xuất video liên quan khi đang phát — tra YouTube API theo tiêu đề
 * video hiện tại, loại trừ chính video đó. Tự lưu kho cục bộ.
 */
export const related = action({
  args: { youtubeId: v.string(), title: v.string() },
  handler: async (
    ctx,
    { youtubeId, title },
  ): Promise<{ items: TalkRow[]; nextPageToken?: string }> => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.",
      );
    }
    const q = title.replace(/\s+/g, " ").trim().slice(0, 90) || "pháp thoại theravada";
    const s = (await ytFetch("search", {
      part: "snippet",
      q,
      type: "video",
      maxResults: "20",
      relevanceLanguage: "vi",
      key,
    })) as SearchList;

    const entries: Array<{
      videoId: string;
      title: string;
      publishedAt: string;
      channelTitle: string;
    }> = [];
    for (const it of s.items ?? []) {
      const vid = it.id?.videoId ?? "";
      const t = it.snippet?.title ?? "";
      if (vid && t && vid !== youtubeId)
        entries.push({
          videoId: vid,
          title: t,
          publishedAt: it.snippet?.publishedAt ?? "",
          channelTitle: it.snippet?.channelTitle ?? "",
        });
    }
    const ids = entries.map((e) => e.videoId);
    if (ids.length === 0) return { items: [], nextPageToken: undefined };

    const details = (await ytFetch("videos", {
      part: "contentDetails,statistics",
      id: ids.join(","),
      key,
    })) as VideoList;
    for (const e of entries) {
      const d = (details.items ?? []).find((x) => x.id === e.videoId);
      await ctx.runMutation(internal.youtubeSync.upsertTalk, {
        youtubeId: e.videoId,
        title: e.title,
        channelName: e.channelTitle,
        publishedAt: e.publishedAt,
        durationSec: parseIsoDuration(d?.contentDetails?.duration),
        viewCount: Number(d?.statistics?.viewCount ?? 0),
      });
    }
    // internal.youtubeSync.byIds — types _generated chưa refresh, cast tạm
    const rows = (await (
      ctx.runQuery as (
        ref: unknown,
        args: { ids: string[] },
      ) => Promise<TalkRow[]>
    )((internal.youtubeSync as unknown as { byIds: unknown }).byIds, {
      ids,
    }));
    return { items: rows, nextPageToken: s.nextPageToken };
  },
});

export const upsertTalk = internalMutation({
  args: {
    youtubeId: v.string(),
    title: v.string(),
    channelName: v.string(),
    publishedAt: v.string(),
    durationSec: v.number(),
    viewCount: v.number(),
  },
  handler: async (ctx, talk) => {
    const existing = await ctx.db
      .query("dhammaTalks")
      .withIndex("by_youtubeId", (q) => q.eq("youtubeId", talk.youtubeId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        title: talk.title || existing.title,
        channelName: talk.channelName || existing.channelName,
        publishedAt: talk.publishedAt || existing.publishedAt,
        durationSec: talk.durationSec > 0 ? talk.durationSec : existing.durationSec,
        viewCount: talk.viewCount > 0 ? talk.viewCount : existing.viewCount,
        syncedAt: Date.now(),
      });
      return "updated" as const;
    }
    await ctx.db.insert("dhammaTalks", {
      youtubeId: talk.youtubeId,
      title: talk.title,
      teacher: talk.channelName, // bản đồng bộ dùng tên kênh làm giảng sư
      channelName: talk.channelName,
      publishedAt: talk.publishedAt,
      durationSec: talk.durationSec,
      viewCount: talk.viewCount,
      syncedAt: Date.now(),
    });
    return "inserted" as const;
  },
});

// Đồng bộ pháp thoại mới từ các kênh Theravada. Cần YOUTUBE_API_KEY.
// Public action để nút “Đồng bộ” trên giao diện có thể gọi.
// `pages` = số trang playlistItems mỗi kênh (mỗi trang 50 video) —
// tăng lên để kéo càng nhiều càng tốt từ YouTube, không giới hạn cứng.
export const syncLatest = action({
  args: { pages: v.optional(v.number()) },
  handler: async (ctx, { pages }) => {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      throw new Error(
        "Chưa cấu hình YOUTUBE_API_KEY. Hãy thêm khóa YouTube Data API v3 trong phần Keys của dự án.",
      );
    }

    let inserted = 0;
    let updated = 0;
    let videos = 0;

    for (const handle of CHANNEL_HANDLES) {
      // 1) Resolve kênh -> ID playlist uploads
      let uploadsPlaylistId: string | undefined;
      for (const param of ["forHandle", "forUsername"]) {
        const data = (await ytFetch("channels", {
          part: "contentDetails",
          [param]: `@${handle}`,
          key,
        })) as ChannelList;
        uploadsPlaylistId =
          data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (uploadsPlaylistId) break;
      }
      if (!uploadsPlaylistId) continue;

      // 2) Lấy nhiều trang video của kênh (mỗi trang 50 video)
      const totalPages = Math.min(Math.max(1, pages ?? 4), 40);
      const entries: Array<{
        videoId: string;
        title: string;
        publishedAt: string;
        channelTitle: string;
      }> = [];
      let pageToken: string | undefined;
      for (let page = 0; page < totalPages; page++) {
        const pl = (await ytFetch("playlistItems", {
          part: "snippet",
          playlistId: uploadsPlaylistId,
          maxResults: "50",
          ...(pageToken ? { pageToken } : {}),
          key,
        })) as PlaylistItems & { nextPageToken?: string };
        for (const it of pl.items ?? []) {
          const vid = it.snippet?.resourceId?.videoId ?? "";
          const title = it.snippet?.title ?? "";
          if (vid && title) {
            entries.push({
              videoId: vid,
              title,
              publishedAt: it.snippet?.publishedAt ?? "",
              channelTitle: it.snippet?.channelTitle ?? "",
            });
          }
        }
        pageToken = pl.nextPageToken;
        if (!pageToken) break;
      }
      if (entries.length === 0) continue;

      // 3) Lấy thời lượng + lượt xem theo lô 50 video
      for (let i = 0; i < entries.length; i += 50) {
        const batch = entries.slice(i, i + 50);
        const ids = batch.map((e) => e.videoId).join(",");
        const details = (await ytFetch("videos", {
          part: "contentDetails,statistics",
          id: ids,
          key,
        })) as VideoList;
        for (const e of batch) {
          const d = (details.items ?? []).find((x) => x.id === e.videoId);
          const result = await ctx.runMutation(internal.youtubeSync.upsertTalk, {
            youtubeId: e.videoId,
            title: e.title,
            channelName: e.channelTitle,
            publishedAt: e.publishedAt,
            durationSec: parseIsoDuration(d?.contentDetails?.duration),
            viewCount: Number(d?.statistics?.viewCount ?? 0),
          });
          videos++;
          if (result === "inserted") inserted++;
          else updated++;
        }
        // nhẹ nhàng với hạn mức API
        if (i + 50 < entries.length) await new Promise((r) => setTimeout(r, 300));
      }
    }

    return { inserted, updated, videos };
  },
});
