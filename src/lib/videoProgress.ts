/**
 * GHI NHỚ ĐÃ XEM ĐẾN ĐÂU — lưu trên chính thiết bị, mã hoá AES-256-GCM
 * giống lịch sử hội thoại.
 *
 * Mỗi video nhớ: vị trí đang xem (giây), tổng thời lượng, và lúc cập nhật.
 * Người dùng mở lại video đó thì trình phát nhảy thẳng về chỗ đang dừng,
 * kèm một dòng nhỏ cho biết và cho phép xem lại từ đầu.
 */

import { decryptString, encryptString } from "@/lib/secureStorage";

const KEY = "ds-video-progress";

/** Tối đa bao nhiêu video được nhớ (bỏ bản cũ nhất khi vượt). */
const MAX_ENTRIES = 60;

export type VideoProgress = {
  /** Vị trí đang xem (giây). */
  position: number;
  /** Tổng thời lượng (giây). */
  duration: number;
  /** Thời điểm cập nhật (mốc ms). */
  updatedAt: number;
};

type ProgressMap = Record<string, VideoProgress>;

/** Đọc từ bộ nhớ đệm; nạp từ thiết bị đúng một lần. */
let cache: ProgressMap | null = null;
let loading: Promise<ProgressMap> | null = null;

async function readMap(): Promise<ProgressMap> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) {
          cache = {};
          return cache;
        }
        const parsed = JSON.parse((await decryptString(raw)) ?? "{}") as unknown;
        cache = parsed && typeof parsed === "object" ? (parsed as ProgressMap) : {};
      } catch {
        cache = {};
      }
      return cache;
    })();
  }
  return loading;
}

/** Vị trí đã xem của một video (null nếu chưa xem). */
export async function getVideoProgress(
  videoId: string,
): Promise<VideoProgress | null> {
  const map = await readMap();
  return map[videoId] ?? null;
}

let saveTimer = 0;

/** Ghi nhớ vị trí đang xem (gộp bằng timer để không ghi dồn mỗi giây). */
export function rememberVideoProgress(
  videoId: string,
  position: number,
  duration: number,
): void {
  if (!videoId || !Number.isFinite(position) || position < 0) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void (async () => {
      const map = { ...(await readMap()) };
      map[videoId] = { position, duration, updatedAt: Date.now() };
      // Bỏ bản cũ nhất khi danh sách quá dài.
      const keys = Object.keys(map);
      if (keys.length > MAX_ENTRIES) {
        keys
          .sort((a, b) => (map[a].updatedAt ?? 0) - (map[b].updatedAt ?? 0))
          .slice(0, keys.length - MAX_ENTRIES)
          .forEach((k) => delete map[k]);
      }
      cache = map;
      try {
        localStorage.setItem(KEY, await encryptString(JSON.stringify(map)));
      } catch {
        /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
      }
    })();
  }, 1200);
}

/** Xoá toàn bộ dữ liệu đã xem (dùng khi người dùng xoá dữ liệu ứng dụng). */
export function clearVideoProgress(): void {
  cache = {};
  loading = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}
