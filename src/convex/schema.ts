import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Hội thoại với Trợ lý Phật học (lưu để quay lại không mất)
    aiMessages: defineTable({
      userId: v.id("users"),
      role: v.string(), // "user" | "assistant"
      content: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Góp ý và báo cáo lỗi từ người dùng
    feedback: defineTable({
      userId: v.optional(v.id("users")),
      type: v.string(), // "idea" | "bug"
      message: v.string(),
      email: v.optional(v.string()),
      appVersion: v.string(),
      status: v.string(), // "new" | "reading" | "resolved"
      createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    // Siêu dữ liệu ứng dụng: phiên bản mới nhất, ghi chú phát hành
    appMeta: defineTable({
      key: v.string(),
      latestVersion: v.string(),
      releaseNotes: v.optional(v.string()),
      releasedAt: v.optional(v.number()),
    }).index("by_key", ["key"]),

    // Giới hạn tốc độ AI theo thiết bị — chặn bot/thiết bị bị can thiệp
    // đốt hạn mức máy chủ AI. Mỗi hàng = (kênh, thiết bị, khung 1 phút).
    aiRateLimits: defineTable({
      bucket: v.string(), // "ask" | "speak"
      deviceId: v.string(),
      windowStart: v.number(), // mốc bắt đầu khung 60s
      count: v.number(), // số request trong khung
    })
      .index("by_device", ["deviceId"])
      .index("by_bucket_device", ["bucket", "deviceId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
