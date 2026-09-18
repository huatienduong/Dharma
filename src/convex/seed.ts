import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Dữ liệu nền từ các kênh YouTube Theravada chính thống (tiếng Việt).
// Mỗi mục là một pháp thoại thật, dùng làm dữ liệu khởi tạo cho bản 1.
type Talk = {
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
};

export const SEED_TALKS: Talk[] = [
  {
    youtubeId: "H3HNhv_GhIQ",
    title: "PHÁP THOẠI - Sư Hạnh Tuệ thuyết giảng - 06/12/2023",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2023-12-06",
    durationSec: 0,
  },
  {
    youtubeId: "Akp2mFIal68",
    title: "LIVE - Vấn Đáp Phật Pháp - Sư Hạnh Tuệ 10/7/2026",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2026-07-10",
    durationSec: 0,
  },
  {
    youtubeId: "Gbrm0FHGQNY",
    title: "Pháp Thoại: Ý Nghĩa Việc Giữ Giới - Sư Hạnh Tuệ thuyết giảng",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2025-03-29",
    durationSec: 0,
  },
  {
    youtubeId: "lBIDZqnEcRc",
    title: "Trung Bộ Kinh - 04. Kinh Khiếp Đảm và Sợ Hãi phần 4 | Sư Hạnh Tuệ",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2022-10-22",
    durationSec: 0,
  },
  {
    youtubeId: "8OP_vLvxTAE",
    title: "Pháp thoại: Giới không phải sự ràng buộc - Sư Hạnh Tuệ - 10/5",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2024-05-10",
    durationSec: 0,
  },
  {
    youtubeId: "hWtnxgBY1z4",
    title: "Nếu Sợ Nhân Xấu, Sao Không Sống Tử Tế ? - Sư Hạnh Tuệ",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2026-03-01",
    durationSec: 0,
  },
  {
    youtubeId: "2SExReYh9M8",
    title: "LIVE - Vấn Đáp Phật Pháp - Sư Hạnh Tuệ 22/05/2026",
    teacher: "Sư Hạnh Tuệ",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2026-05-22",
    durationSec: 0,
  },
  {
    youtubeId: "19SPSIaTz6M",
    title: "26. Kinh Thánh Cầu (Pāsarāsi Sutta) | Ngài Thích Minh Châu dịch",
    teacher: "Tỳ khưu Thích Minh Châu (dịch)",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2020-09-30",
    durationSec: 0,
  },
  {
    youtubeId: "V1lEF56pF8Y",
    title: "9. Chương 4 - Bốn Pháp - Đại Phẩm | Ngài Thích Minh Châu dịch",
    teacher: "Tỳ khưu Thích Minh Châu (dịch)",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2020-09-14",
    durationSec: 0,
  },
  {
    youtubeId: "31K1StU12_M",
    title: "09. BÀI GIẢNG 38 PHÁP HẠNH PHÚC (3) - Tỳ khưu Thiện Hảo",
    teacher: "Tỳ khưu Thiện Hảo",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2021-09-07",
    durationSec: 0,
  },
  {
    youtubeId: "8kE1tJ0szaI",
    title: "01. Giới Thiệu Vi Diệu Pháp | Thầy Sayadaw U Kovida giảng",
    teacher: "Sayadaw U Kovida",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2021-10-11",
    durationSec: 0,
  },
  {
    youtubeId: "Pz05RcXJ0Lw",
    title: "Buổi 8: Đại Kinh Thiết Lập Niệm - Quán 32 Thể Trược & Tứ Đại",
    teacher: "Tỳ khưu Thiện Hảo",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2023-11-05",
    durationSec: 0,
  },
  {
    youtubeId: "EZ5dfPSKHPk",
    title: "Kinh Pháp Cú 71 - Phẩm Người Ngu | Tỳ khưu Pháp Minh",
    teacher: "Tỳ khưu Pháp Minh",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2021-07-14",
    durationSec: 0,
  },
  {
    youtubeId: "MuuqrNFC5tg",
    title: "Ngài Tam Tạng 10 Thuyết Pháp: Trì Giới Ba-la-mật & Hướng Dẫn Thiền",
    teacher: "Ngài Tam Tạng",
    channelName: "PHẬT GIÁO THERAVĀDA VN",
    publishedAt: "2022-09-18",
    durationSec: 0,
  },
  {
    youtubeId: "IYugs9R15dk",
    title: "Thiền Minh Sát (Vipassana) - Sư Tăng Định",
    teacher: "Sư Tăng Định",
    channelName: "Giác Ngộ",
    publishedAt: "2017-05-18",
    durationSec: 0,
  },
  {
    youtubeId: "u5S7ovgOnIQ",
    title: "Vượt Qua Chướng Ngại - Thiền Sư Pa Auk Sayadaw",
    teacher: "Thiền Sư Pa Auk Tawya Sayadaw",
    channelName: "Thực Hành Vipassana",
    publishedAt: "2021-04-27",
    durationSec: 0,
  },
  {
    youtubeId: "gFArVetXhac",
    title: "Dây Trói Buộc - Thiền Sư Pa Auk Sayadaw",
    teacher: "Thiền Sư Pa Auk Tawya Sayadaw",
    channelName: "Thực Hành Vipassana",
    publishedAt: "2021-05-14",
    durationSec: 0,
  },
  {
    youtubeId: "e-jRbMSXWZ4",
    title: "Biết Và Thấy - Thiền Sư Pa Auk Sayadaw",
    teacher: "Thiền Sư Pa Auk Tawya Sayadaw",
    channelName: "Thực Hành Vipassana",
    publishedAt: "2021-05-14",
    durationSec: 0,
  },
  {
    youtubeId: "dTl4GwFxL1I",
    title: "Ba La Mật Là Gì? | Thiền Sư Pa-Auk Sayadaw",
    teacher: "Thiền Sư Pa Auk Tawya Sayadaw",
    channelName: "Cỗ Xe Đại Giác",
    publishedAt: "2021-01-01",
    durationSec: 0,
  },
  {
    youtubeId: "-UiIrglnNfc",
    title: "Năm yếu tố thiền định - TT. Thích Nhật Từ | Khóa thiền Tứ Niệm Xứ 22",
    teacher: "TT. Thích Nhật Từ",
    channelName: "Giác Ngộ",
    publishedAt: "2018-07-27",
    durationSec: 0,
  },
  {
    youtubeId: "waihI3-JmLg",
    title: "224. Thiền định phải có phước nhiều, nếu không sẽ bị điên?",
    teacher: "Thích Minh Thiền",
    channelName: "Đại học Vạn Hạnh",
    publishedAt: "2021-11-19",
    durationSec: 0,
  },
  {
    youtubeId: "w8de6eTxm_4",
    title: "Hiểu Đúng Về Giữ Giới Và Thiền Định - Sư Minh Quân",
    teacher: "Sư Minh Quân",
    channelName: "Sư Hạnh Tuệ Theravāda",
    publishedAt: "2025-08-30",
    durationSec: 0,
  },
];

// Nạp dữ liệu nền (idempotent, an toàn để gọi lại nhiều lần).
export const seedDhammaTalks = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const t of SEED_TALKS) {
      const existing = await ctx.db
        .query("dhammaTalks")
        .withIndex("by_youtubeId", (q) => q.eq("youtubeId", t.youtubeId))
        .unique();
      if (existing) continue;
      await ctx.db.insert("dhammaTalks", {
        ...t,
        syncedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted, total: SEED_TALKS.length };
  },
});
