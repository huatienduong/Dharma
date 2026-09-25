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

/**
 * Lời chào hằng ngày — tự đổi mới theo từng ngày (ổn định trong ngày,
 * mỗi ngày một lời chào mới). Không tốn token AI: sinh từ kho lời chào
 * được soạn sẵn theo tinh thần Phật pháp.
 */
export const getDailyGreeting = query({
  args: {},
  handler: async () => {
    const GREETINGS = [
      "Chúc bạn một ngày an lạc, tâm an giữa dòng đời vội vã.",
      "Ngày mới bình an — mỗi hơi thở hôm nay là một món quà.",
      "Chúc bạn hôm nay nhẹ nhàng như lá, tỉnh thức như dòng sông chảy.",
      "Mong hôm nay bạn gặp nhiều duyên lành, tâm luôn sáng soi.",
      "Chúc bạn một ngày đầy chánh niệm — bước nào cũng an, việc nào cũng lạc.",
      "Hôm nay là ngày mới — cơ hội để bắt đầu lại, đúng như pháp.",
      "Chúc bạn hôm nay buông được lo toan, giữ được bình an.",
      "Ngày an lành bắt đầu từ một tâm hướng thiện — chúc bạn hôm nay an nhiên.",
      "Chúc bạn hôm nay là nguồn vui — hạt mầm an lạc cho mình và người.",
      "Mỗi bình minh là một sự sống mới — chúc bạn hôm nay tỉnh thức và nhẹ nhõm.",
      "Chúc bạn hôm nay gặp nhiều điều đẹp, kể cả trong những chuyện nhỏ bé.",
      "Hôm nay tâm bạn an, mọi việc đều nhẹ — chúc một ngày an trú.",
      "Chúc bạn hôm nay sáng suốt, chuyện đời thuận, chuyện pháp sáng.",
      "Mong hôm nay bạn được nghỉ ngơi đúng lúc, cười thật tươi, ngủ thật sâu.",
    ];
    const now = new Date();
    const dayIndex = Math.floor(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
    );
    return GREETINGS[dayIndex % GREETINGS.length] as string;
  },
});

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
