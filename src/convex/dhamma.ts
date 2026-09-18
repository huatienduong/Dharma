import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

// Danh sách pháp thoại mới nhất (dùng cho màn hình chính)
export const list = query({
  args: {
    teacher: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { teacher, limit }) => {
    let q = ctx.db.query("dhammaTalks").withIndex("by_publishedAt");
    const rows = await q.order("desc").collect();
    const filtered = teacher
      ? rows.filter((r) => r.teacher === teacher)
      : rows;
    return filtered.slice(0, limit ?? 60);
  },
});

// Danh sách các vị giảng sư (hộp lọc)
export const teachers = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dhammaTalks").collect();
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.teacher, (map.get(r.teacher) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
});

// Trạng thái đồng bộ (để biết đã nạp dữ liệu nền chưa)
export const count = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dhammaTalks").collect();
    return rows.length;
  },
});

// Tiến trình xem của người dùng (đã join thông tin pháp thoại)
export const myProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("watchProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const row of rows.sort((a, b) => b.updatedAt - a.updatedAt)) {
      const talk = await ctx.db.get(row.talkId);
      if (!talk) continue;
      out.push({
        talkId: row.talkId,
        youtubeId: talk.youtubeId,
        title: talk.title,
        teacher: talk.teacher,
        channelName: talk.channelName,
        publishedAt: talk.publishedAt,
        positionSec: row.positionSec,
        durationSec: row.durationSec || talk.durationSec,
        completed: row.completed,
        updatedAt: row.updatedAt,
      });
    }
    return out;
  },
});

// Đọc 1 dòng tiến trình cho một pháp thoại
export const getProgress = internalQuery({
  args: { userId: v.id("users"), talkId: v.id("dhammaTalks") },
  handler: async (ctx, { userId, talkId }) => {
    return await ctx.db
      .query("watchProgress")
      .withIndex("by_user_talk", (q) =>
        q.eq("userId", userId).eq("talkId", talkId),
      )
      .unique();
  },
});

// Lưu/khôi phục tiến trình xem (gọi định kỳ từ trình phát)
export const saveProgress = mutation({
  args: {
    youtubeId: v.string(),
    positionSec: v.number(),
    durationSec: v.number(),
  },
  handler: async (ctx, { youtubeId, positionSec, durationSec }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return; // khách vãng lai: không lưu

    const talk = await ctx.db
      .query("dhammaTalks")
      .withIndex("by_youtubeId", (q) => q.eq("youtubeId", youtubeId))
      .unique();
    if (!talk) return;

    const existing = await ctx.db
      .query("watchProgress")
      .withIndex("by_user_talk", (q) =>
        q.eq("userId", userId).eq("talkId", talk._id),
      )
      .unique();

    const duration = durationSec > 0 ? durationSec : (existing?.durationSec ?? 0);
    // Coi là hoàn thành khi xem trên 95% hoặc còn dưới 45 giây cuối
    const completed =
      duration > 0 &&
      (positionSec / duration >= 0.95 || duration - positionSec < 45);

    const patch = {
      positionSec: Math.max(0, Math.floor(positionSec)),
      durationSec: Math.max(0, Math.floor(duration)),
      completed,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("watchProgress", {
        userId,
        talkId: talk._id,
        ...patch,
      });
    }
  },
});

// Xoá tiến trình của một pháp thoại (nút "Xem lại từ đầu")
export const resetProgress = mutation({
  args: { youtubeId: v.string() },
  handler: async (ctx, { youtubeId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const talk = await ctx.db
      .query("dhammaTalks")
      .withIndex("by_youtubeId", (q) => q.eq("youtubeId", youtubeId))
      .unique();
    if (!talk) return;
    const existing = await ctx.db
      .query("watchProgress")
      .withIndex("by_user_talk", (q) =>
        q.eq("userId", userId).eq("talkId", talk._id),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
