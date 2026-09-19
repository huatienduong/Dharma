import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Cập nhật hồ sơ người dùng (tên hiển thị, pháp danh, bio, năm sinh). */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    dhammaName: v.optional(v.string()),
    bio: v.optional(v.string()),
    birthYear: v.optional(v.number()),
  },
  handler: async (ctx, { name, dhammaName, bio, birthYear }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Bạn cần đăng nhập.");

    const patch: Record<string, string | number | undefined> = {};
    if (name !== undefined) patch.name = name.trim() || undefined;
    if (dhammaName !== undefined)
      patch.dhammaName = dhammaName.trim() || undefined;
    if (bio !== undefined) patch.bio = bio.trim() || undefined;
    if (birthYear !== undefined)
      patch.birthYear =
        Number.isFinite(birthYear) && birthYear > 1900 && birthYear <= 2100
          ? Math.floor(birthYear)
          : undefined;

    await ctx.db.patch(userId, patch);
    return "ok" as const;
  },
});

/** Thống kê tổng hợp cho trang Hồ sơ. */
export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        watchCount: 0,
        completedCount: 0,
        meditationSessions: 0,
        meditationSec: 0,
        suttasRead: 0,
      };
    }

    const progress = await ctx.db
      .query("watchProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const meditations = await ctx.db
      .query("meditationSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const reading = await ctx.db
      .query("readingProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      watchCount: progress.length,
      completedCount: progress.filter((p) => p.completed).length,
      meditationSessions: meditations.length,
      meditationSec: meditations.reduce((s, m) => s + m.durationSec, 0),
      suttasRead: reading.filter((r) => r.percent >= 90).length,
    };
  },
});
