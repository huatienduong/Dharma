import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// TỰ KHẮC PHỤC — 10 phút/lần tự thử các nhà cung cấp AI (danh sách model +
// model đang dùng). Provider/model hồi phục sẽ được gỡ trạng thái "chết tạm
// thời" (circuit breaker trong aiChat.ts) mà không cần ai can thiệp.
crons.interval(
  "ai-self-test",
  { minutes: 10 },
  internal.aiChat.aiSelfTest,
  {},
);

// TỰ CẬP NHẬT ĐIỀU KHOẢN & CHÍNH SÁCH — mỗi ngày (09:00 giờ Việt Nam) so
// sánh nội dung trong mã nguồn (src/convex/legalContent.ts) với máy chủ và
// ghi bản mới khi khác biệt. Sửa mã nguồn + publish là chính sách tự đổi.
crons.daily(
  "sync-legal-docs",
  { hourUTC: 2, minuteUTC: 0 },
  internal.library.syncLegalDocsInternal,
  {},
);

export default crons;
