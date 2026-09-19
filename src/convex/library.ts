import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Cài đặt ứng dụng (sáng/tối, cỡ chữ, ngôn ngữ, thông báo)            */
/* ------------------------------------------------------------------ */

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const updateSettings = mutation({
  args: {
    theme: v.optional(v.string()),
    fontScale: v.optional(v.number()),
    language: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
    screenshotBlock: v.optional(v.boolean()),
  },
  handler: async (ctx, patch) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );

    if (existing) {
      await ctx.db.patch(existing._id, clean);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        theme: "system",
        fontScale: 1,
        language: "vi",
        notifications: true,
        ...clean,
      });
    }
  },
});

/* ------------------------------------------------------------------ */
/* Tiến trình đọc Kinh / Luật (khôi phục vị trí cuộn)                  */
/* ------------------------------------------------------------------ */

export const saveReading = mutation({
  args: { docId: v.string(), percent: v.number() },
  handler: async (ctx, { docId, percent }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_doc", (q) => q.eq("userId", userId).eq("docId", docId))
      .unique();

    if (existing) {
      // Không lùi lại nếu đang đọc sâu hơn
      await ctx.db.patch(existing._id, {
        percent: Math.max(existing.percent, p),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readingProgress", {
        userId,
        docId,
        percent: p,
        updatedAt: Date.now(),
      });
    }
  },
});

export const listReading = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getReading = query({
  args: { docId: v.string() },
  handler: async (ctx, { docId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return (
      (await ctx.db
        .query("readingProgress")
        .withIndex("by_user_doc", (q) =>
          q.eq("userId", userId).eq("docId", docId),
        )
        .unique()) ?? null
    );
  },
});

export const resetReading = mutation({
  args: { docId: v.string() },
  handler: async (ctx, { docId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const existing = await ctx.db
      .query("readingProgress")
      .withIndex("by_user_doc", (q) => q.eq("userId", userId).eq("docId", docId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/* ------------------------------------------------------------------ */
/* Phiên thiền định                                                    */
/* ------------------------------------------------------------------ */

export const saveMeditation = mutation({
  args: { technique: v.string(), durationSec: v.number() },
  handler: async (ctx, { technique, durationSec }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    await ctx.db.insert("meditationSessions", {
      userId,
      technique,
      durationSec: Math.max(0, Math.floor(durationSec)),
      completedAt: Date.now(),
    });
  },
});

export const listMeditations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const meditationStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { totalSessions: 0, totalSec: 0, todaySec: 0 };

    const sessions = await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    let totalSec = 0;
    let todaySec = 0;
    for (const s of sessions) {
      totalSec += s.durationSec;
      if (s.completedAt >= todayMs) todaySec += s.durationSec;
    }
    return {
      totalSessions: sessions.length,
      totalSec,
      todaySec,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Góp ý & báo cáo lỗi                                                 */
/* ------------------------------------------------------------------ */

export const submitFeedback = mutation({
  args: {
    type: v.union(v.literal("idea"), v.literal("bug")),
    message: v.string(),
    email: v.optional(v.string()),
    appVersion: v.string(),
  },
  handler: async (ctx, { type, message, email, appVersion }) => {
    const userId = await getAuthUserId(ctx);
    const clean = message.trim();
    if (clean.length < 5) throw new Error("Nội dung góp ý quá ngắn.");
    await ctx.db.insert("feedback", {
      userId: userId ?? undefined,
      type,
      message: clean.slice(0, 4000),
      email: email?.trim() || undefined,
      appVersion,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* Kiểm tra phiên bản mới nhất                                         */
/* ------------------------------------------------------------------ */

export const getAppVersion = query({
  args: {},
  handler: async (ctx) => {
    return (
      (await ctx.db
        .query("appMeta")
        .withIndex("by_key", (q) => q.eq("key", "app"))
        .unique()) ?? null
    );
  },
});

// Nạp / cập nhật thông tin phiên bản mới nhất (chạy một lần khi phát hành)
export const seedAppVersion = mutation({
  args: {
    latestVersion: v.string(),
    releaseNotes: v.optional(v.string()),
  },
  handler: async (ctx, { latestVersion, releaseNotes }) => {
    const existing = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", "app"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        latestVersion,
        releaseNotes,
        releasedAt: Date.now(),
      });
      return "updated";
    }
    await ctx.db.insert("appMeta", {
      key: "app",
      latestVersion,
      releaseNotes,
      releasedAt: Date.now(),
    });
    return "inserted";
  },
});
