/**
 * KHOÁ API YOUTUBE — lưu MÃ HOÁ trên chính thiết bị, không gửi đi đâu.
 *
 * Vì sao có trong ứng dụng: tìm video cần khoá YouTube Data API. Bản máy
 * chủ dùng khoá do nền tảng cấp; còn ở máy người dùng thì người dùng dán
 * khoá của mình vào Cài đặt → Video YouTube, lưu lại bằng AES-256-GCM
 * giống hệt cách lưu lịch sử hội thoại. Không có khoá thì ứng dụng vẫn mở
 * được video khi người dùng dán link YouTube.
 */

import { decryptString, encryptString } from "@/lib/secureStorage";

const KEY = "ds-youtube-api-key";

/** Đọc khoá đã lưu ("" nếu chưa có). */
export async function loadYouTubeKey(): Promise<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "";
    return (await decryptString(raw)) ?? "";
  } catch {
    return "";
  }
}

/** Lưu khoá (mã hoá trước khi ghi xuống thiết bị). */
export async function saveYouTubeKey(key: string): Promise<void> {
  try {
    const clean = key.trim();
    if (!clean) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, await encryptString(clean));
  } catch {
    /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
  }
}

/** Xoá khoá khỏi thiết bị. */
export function clearYouTubeKey(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}
