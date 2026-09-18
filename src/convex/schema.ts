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

    // Pháp thoại Theravada: một bản ghi cho mỗi video YouTube
    dhammaTalks: defineTable({
      youtubeId: v.string(), // video ID trên YouTube
      title: v.string(),
      teacher: v.string(), // tên vị giảng sư
      channelName: v.string(), // tên kênh YouTube
      publishedAt: v.string(), // ngày phát hành (ISO)
      durationSec: v.number(), // thời lượng (giây), 0 nếu chưa rõ
      description: v.optional(v.string()),
      syncedAt: v.number(), // thời điểm đồng bộ
    })
      .index("by_youtubeId", ["youtubeId"])
      .index("by_publishedAt", ["publishedAt"]),

    // Tiến trình xem của người dùng, khôi phục khi quay lại ứng dụng
    watchProgress: defineTable({
      userId: v.id("users"),
      talkId: v.id("dhammaTalks"),
      positionSec: v.number(), // vị trí dừng (giây)
      durationSec: v.number(), // thời lượng video (giây)
      completed: v.boolean(), // đã xem gần hết
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_talk", ["userId", "talkId"]),

    // Cài đặt ứng dụng của từng người dùng (sáng/tối, cỡ chữ, ngôn ngữ, thông báo)
    userSettings: defineTable({
      userId: v.id("users"),
      theme: v.string(), // "light" | "dark" | "system"
      fontScale: v.number(), // 0.9 | 1.0 | 1.15 | 1.3
      language: v.string(), // "vi" | "en"
      notifications: v.boolean(),
    })
      .index("by_user", ["userId"]),

    // Tiến trình đọc Kinh/Luật: khôi phục vị trí cuộn khi quay lại
    readingProgress: defineTable({
      userId: v.id("users"),
      docId: v.string(), // ID văn bản (vd: "sn56.11", "vin-patimokkha")
      percent: v.number(), // 0..100
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_doc", ["userId", "docId"]),

    // Phiên thiền định đã thực hành
    meditationSessions: defineTable({
      userId: v.id("users"),
      technique: v.string(), // "anapanasati" | "metta" | "maranasati" | "walking" | "custom"
      durationSec: v.number(),
      completedAt: v.number(), // thời điểm kết thúc phiên
    })
      .index("by_user", ["userId"]),

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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
