import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function makeCode(): string {
  // Bỏ ký tự dễ nhầm (0/O, 1/I) — mã 6 ký tự
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function findRoom(ctx: unknown, code: string) {
  const db = (ctx as { db: never }).db;
  return await (db as never as {
    query: (t: string) => {
      withIndex: (
        i: string,
        f: (q: never) => never,
      ) => { unique: () => Promise<never> };
    };
  }) as never; // placeholder — dùng trực tiếp trong handler bên dưới
}

/* ------------------------------------------------------------------ */
/* Tạo phòng mới (chỉ thành viên đã đăng nhập)                         */
/* ------------------------------------------------------------------ */

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new Error("Bạn cần đăng nhập để tạo phòng xem cùng nhau.");
    const user = await ctx.db.get(userId);
    const name = user?.dhammaName || user?.name || "Ẩn danh";

    // Sinh mã duy nhất
    let code = makeCode();
    for (let i = 0; i < 5; i++) {
      const dup = await ctx.db
        .query("watchRooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!dup) break;
      code = makeCode();
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("watchRooms", {
      code,
      hostId: userId,
      isPlaying: false,
      positionSec: 0,
      stateUpdatedAt: now,
      createdAt: now,
    });

    await ctx.db.insert("roomMembers", {
      roomId,
      userId,
      name,
      micOn: false,
      camOn: false,
      lastSeen: now,
    });

    return { roomId, code };
  },
});

/* ------------------------------------------------------------------ */
/* Tham gia phòng theo mã                                              */
/* ------------------------------------------------------------------ */

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null)
      throw new Error("Bạn cần đăng nhập để tham gia phòng.");
    const user = await ctx.db.get(userId);
    const name = user?.dhammaName || user?.name || "Ẩn danh";

    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) throw new Error("Không tìm thấy phòng. Kiểm tra lại mã.");

    const now = Date.now();
    const existing = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now });
    } else {
      await ctx.db.insert("roomMembers", {
        roomId: room._id,
        userId,
        name,
        micOn: false,
        camOn: false,
        lastSeen: now,
      });
    }
    return { roomId: room._id, code: room.code };
  },
});

/* ------------------------------------------------------------------ */
/* Trạng thái phòng (subscribe) — chỉ cho thành viên đang trong phòng   */
/* ------------------------------------------------------------------ */

export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return null;

    const me = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId),
      )
      .unique();
    if (!me) return null; // chưa tham gia → không thấy trạng thái

    const members = (
      await ctx.db
        .query("roomMembers")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect()
    ).filter((m) => Date.now() - m.lastSeen < 30_000);

    const host = await ctx.db.get(room.hostId);
    const hostName = host?.dhammaName || host?.name || "Chủ phòng";

    return {
      _id: room._id,
      code: room.code,
      hostId: room.hostId,
      isHost: room.hostId === userId,
      youtubeId: room.youtubeId,
      isPlaying: room.isPlaying,
      positionSec: room.positionSec,
      stateUpdatedAt: room.stateUpdatedAt,
      hostName,
      members: members.map((m) => ({
        userId: m.userId,
        name: m.name,
        micOn: m.micOn,
        camOn: m.camOn,
      })),
    };
  },
});

/* ------------------------------------------------------------------ */
/* Host điều khiển: chọn video / play / pause / seek                   */
/* ------------------------------------------------------------------ */

export const setState = mutation({
  args: {
    code: v.string(),
    youtubeId: v.optional(v.string()),
    isPlaying: v.boolean(),
    positionSec: v.number(),
  },
  handler: async (ctx, { code, youtubeId, isPlaying, positionSec }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return;
    if (room.hostId !== userId) return; // chỉ host điều khiển

    await ctx.db.patch(room._id, {
      youtubeId: youtubeId ?? room.youtubeId,
      isPlaying,
      positionSec: Math.max(0, positionSec),
      stateUpdatedAt: Date.now(),
    });
  },
});

/* ------------------------------------------------------------------ */
/* Heartbeat thành viên (mỗi 10s). present=false → rời phòng           */
/* ------------------------------------------------------------------ */

export const heartbeat = mutation({
  args: { code: v.string(), present: v.boolean() },
  handler: async (ctx, { code, present }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return;

    const now = Date.now();
    const me = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId),
      )
      .unique();

    if (present) {
      if (me) {
        await ctx.db.patch(me._id, { lastSeen: now });
      } else {
        const user = await ctx.db.get(userId);
        await ctx.db.insert("roomMembers", {
          roomId: room._id,
          userId,
          name: user?.dhammaName || user?.name || "Ẩn danh",
          micOn: false,
          camOn: false,
          lastSeen: now,
        });
      }
      return;
    }

    // Rời phòng: xóa thành viên + dọn tín hiệu WebRTC của tôi
    if (me) await ctx.db.delete(me._id);
    const sigs = await ctx.db
      .query("roomSignals")
      .withIndex("by_room_to", (q) =>
        q.eq("roomId", room._id).eq("toId", userId),
      )
      .collect();
    for (const s of sigs) await ctx.db.delete(s._id);
  },
});

/* ------------------------------------------------------------------ */
/* Bật/tắt mic & cam (hiển thị trạng thái cho mọi người)               */
/* ------------------------------------------------------------------ */

export const setMediaState = mutation({
  args: { code: v.string(), micOn: v.boolean(), camOn: v.boolean() },
  handler: async (ctx, { code, micOn, camOn }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return;
    const me = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId),
      )
      .unique();
    if (me) await ctx.db.patch(me._id, { micOn, camOn, lastSeen: Date.now() });
  },
});

/* ------------------------------------------------------------------ */
/* Chat trong phòng                                                    */
/* ------------------------------------------------------------------ */

export const sendChat = mutation({
  args: { code: v.string(), text: v.string() },
  handler: async (ctx, { code, text }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const user = await ctx.db.get(userId);
    const name = user?.dhammaName || user?.name || "Ẩn danh";

    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return;

    const t = text.trim().slice(0, 500);
    if (!t) return;
    await ctx.db.insert("roomChat", {
      roomId: room._id,
      userId,
      name,
      text: t,
      createdAt: Date.now(),
    });
  },
});

export const listChat = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return [];
    const me = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", userId),
      )
      .unique();
    if (!me) return [];
    const rows = await ctx.db
      .query("roomChat")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .order("desc")
      .take(80);
    return rows.reverse();
  },
});

/* ------------------------------------------------------------------ */
/* Signal server WebRTC: trao đổi offer/answer/ICE qua Convex          */
/* ------------------------------------------------------------------ */

export const sendSignal = mutation({
  args: { code: v.string(), toId: v.id("users"), payload: v.string() },
  handler: async (ctx, { code, toId, payload }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return;
    await ctx.db.insert("roomSignals", {
      roomId: room._id,
      fromId: userId,
      toId,
      payload: payload.slice(0, 16_000),
      createdAt: Date.now(),
    });
  },
});

/** Nhận và "tiêu" toàn bộ tín hiệu gửi tới tôi (consume-once). */
export const drainSignals = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const room = await ctx.db
      .query("watchRooms")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!room) return [];

    const signals = await ctx.db
      .query("roomSignals")
      .withIndex("by_room_to", (q) =>
        q.eq("roomId", room._id).eq("toId", userId),
      )
      .collect();
    const sorted = signals.sort((a, b) => a.createdAt - b.createdAt);
    for (const s of sorted) await ctx.db.delete(s._id);
    return sorted.map((s) => ({ fromId: s.fromId, payload: s.payload }));
  },
});
