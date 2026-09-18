import { internal } from "./_generated/api";
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";

// Kênh Theravada (tiếng Việt) cần đồng bộ pháp thoại mới.
// Mỗi mục được thử resolve qua forHandle rồi forUsername; kênh nào
// không resolve được sẽ bị bỏ qua một cách êm đẹp.
const CHANNEL_HANDLES = [
  "suhanhtue", // Sư Hạnh Tuệ Theravāda
  "theravadavn", // PHẬT GIÁO THERAVĀDA VN
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
  }>;
};

// "PT1H23M45S" -> số giây
function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return (
    (Number(d ?? 0) * 86400) +
    (Number(h ?? 0) * 3600) +
    (Number(mi ?? 0) * 60) +
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

export const upsertTalk = internalMutation({
  args: {
    youtubeId: v.string(),
    title: v.string(),
    channelName: v.string(),
    publishedAt: v.string(),
    durationSec: v.number(),
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
      syncedAt: Date.now(),
    });
    return "inserted" as const;
  },
});

// Đồng bộ pháp thoại mới nhất từ các kênh Theravada. Cần YOUTUBE_API_KEY.
// Public action để nút “Đồng bộ” trên giao diện có thể gọi.
export const syncLatest = action({
  args: {},
  handler: async (ctx) => {
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

      // 2) Lấy các video mới nhất của kênh
      const pl = (await ytFetch("playlistItems", {
        part: "snippet",
        playlistId: uploadsPlaylistId,
        maxResults: "15",
        key,
      })) as PlaylistItems;
      const entries = (pl.items ?? [])
        .map((it) => ({
          videoId: it.snippet?.resourceId?.videoId ?? "",
          title: it.snippet?.title ?? "",
          publishedAt: it.snippet?.publishedAt ?? "",
          channelTitle: it.snippet?.channelTitle ?? "",
        }))
        .filter((e) => e.videoId && e.title);
      if (entries.length === 0) continue;

      // 3) Lấy thời lượng
      const ids = entries.map((e) => e.videoId).join(",");
      const details = (await ytFetch("videos", {
        part: "contentDetails",
        id: ids,
        key,
      })) as VideoList;
      const durations = new Map<string, number>();
      for (const it of details.items ?? []) {
        if (it.id) durations.set(it.id, parseIsoDuration(it.contentDetails?.duration));
      }

      // 4) Upsert vào bảng dhammaTalks
      for (const e of entries) {
        const result = await ctx.runMutation(internal.youtubeSync.upsertTalk, {
          youtubeId: e.videoId,
          title: e.title,
          channelName: e.channelTitle,
          publishedAt: e.publishedAt,
          durationSec: durations.get(e.videoId) ?? 0,
        });
        videos++;
        if (result === "inserted") inserted++;
        else updated++;
      }
    }

    return { inserted, updated, videos };
  },
});
