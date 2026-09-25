# Security Policy — Trợ lý Phật học

## 1. Quản lý khóa (secrets)

- **Không khóa nào được lưu trong mã nguồn.** Tất cả khóa AI (`GEMINI_API_KEY`, `OPENAI_API_KEY`) và biến auth (`VLY_CONVEX_AUTH_ISSUER`) nằm trong biến môi trường của deployment Convex (determined-rabbit-619), chỉ máy chủ đọc được.
- **Lịch sử:** hai khóa AI đã từng bị lộ trong một phiên chat; đây là tài liệu hành chính, mã nguồn chưa bao giờ chứa khóa. Nếu chưa làm, hãy thu hồi + tạo khóa mới tại Google AI Studio và platform.openai.com.

## 2. Bảo vệ thiết bị (chặn bot / thiết bị bị can thiệp)

Kiến trúc 2 tầng trong `src/lib/deviceSecurity.ts` + `src/convex/aiChat.ts`:

| Tầng | Vị trí | Cơ chế |
|---|---|---|
| 1. Client | `DeviceGuard` (gắn ở `main.tsx`) | Quét định kỳ 5s: cờ `navigator.webdriver`, UA headless, mất nhất quán UA↔platform, thiếu plugins/languages, GPU phần mềm, DevTools mở. Điểm ≥60 → **khóa toàn màn hình** (GUARD-01). Điểm 35–59 → "suspicious". |
| 2. Server | `aiChat.ts` (`checkRateLimit` + `checkAiRateLimit`) | Mỗi lệnh `ask`/`speak` gửi `deviceId` + `integrity`. Máy chủ chỉ tin integrity="ok" + deviceId hợp lệ → 15 ask + 20 speak/phút. Mọi trường hợp khác → mức nghi ngờ: **2 + 3/phút**. Lưu trong bảng `aiRateLimits` (khung 60s). |

Kết quả: thiết bị bị can thiệp có thể mở được giao diện nhưng **không thể đốt hạn mức AI** — đây là tầng bảo vệ thực sự vì chạy trên máy chủ.

## 3. Giới hạn thực tế

Client guard là rào cản đầu tiên, không phải tuyệt đối (mã chạy trong trình duyệt luôn có thể bị sửa). Giới hạn máy chủ là rào cản chính, nhưng một kẻ tinh vi có thể giả mạo deviceId. Không có cơ chế client-side nào chặn 100% thiết bị root/DevTools — để bảo vệ mạnh hơn cần bí mật gốc từ app gốc (SafetyNet/Play Integrity), không áp dụng cho web app.

## 4. Báo cáo lỗ hổng

Liên hệ nhà phát triển: **Hứa Tiến Dương** (mục Góp ý & báo lỗi trong ứng dụng). Phản hồi trong vòng 72 giờ.
