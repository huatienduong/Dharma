import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

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
    if (clean.length < 5) throw new ConvexError("Nội dung góp ý quá ngắn.");
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

/* ------------------------------------------------------------------ */
/* Chính sách quyền riêng tư & Điều khoản sử dụng                      */
/* Nội dung lưu trên server (bảng appMeta) — cập nhật không cần phát   */
/* hành bản mới; mọi thiết bị nhận bản mới ngay nhờ query reactive.    */
/* ------------------------------------------------------------------ */

/**
 * Logo chính thức của ứng dụng — lưu trong Convex File Storage.
 * Trả về URL trực tiếp để client hiển thị (splash screen, v.v.).
 */
export const getAppLogo = query({
  args: {},
  handler: async (ctx) => {
    const meta = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", "app-logo"))
      .unique();
    const storageId = meta?.releaseNotes?.trim();
    if (!storageId) return null;
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

/** Đặt/đổi logo ứng dụng (internal — chỉ chạy từ CLI/dashboard). */
export const setAppLogo = internalMutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    const existing = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", "app-logo"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        latestVersion: "1",
        releaseNotes: storageId,
        releasedAt: Date.now(),
      });
      return "updated";
    }
    await ctx.db.insert("appMeta", {
      key: "app-logo",
      latestVersion: "1",
      releaseNotes: storageId,
      releasedAt: Date.now(),
    });
    return "inserted";
  },
});

/* ------------------------------------------------------------------ */
/* Chính sách quyền riêng tư & Điều khoản sử dụng                      */

export const getLegalDoc = query({
  args: { key: v.union(v.literal("privacy-policy"), v.literal("terms-of-service")) },
  handler: async (ctx, { key }) => {
    return (
      (await ctx.db
        .query("appMeta")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()) ?? null
    );
  },
});

/** Chỉ chạy từ CLI/dashboard (internal) — client không thể ghi đè chính sách. */
export const updateLegalDoc = internalMutation({
  args: {
    key: v.union(v.literal("privacy-policy"), v.literal("terms-of-service")),
    content: v.string(),
    docVersion: v.string(),
  },
  handler: async (ctx, { key, content, docVersion }) => {
    const existing = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        latestVersion: docVersion,
        releaseNotes: content,
        releasedAt: Date.now(),
      });
      return "updated";
    }
    await ctx.db.insert("appMeta", {
      key,
      latestVersion: docVersion,
      releaseNotes: content,
      releasedAt: Date.now(),
    });
    return "inserted";
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
