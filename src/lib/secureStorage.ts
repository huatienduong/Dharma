/**
 * Lưu trữ cục bộ mã hóa — Trợ lý Phật học
 * ----------------------------------------
 * Mọi nội dung người dùng nhập (lịch sử hội thoại) được mã hóa AES-256-GCM
 * trước khi ghi xuống localStorage. Khóa mã hóa là dữ liệu ngẫu nhiên, sinh
 * một lần và lưu trong localStorage — điểm yếu đã khai báo: kẻ tấn công có
 * quyền truy cập thiết bị vẫn đọc được khóa; giá trị của cơ chế này là che
 * nội dung với người khác mượn máy hoặc công cụ đọc storage thô.
 *
 * Bổ trợ: AI chỉ gọi API từ máy chủ Convex (khóa AI nằm trong env máy chủ),
 * client không chứa bất kỳ khóa dịch vụ nào.
 */

const MASTER_KEY = "ds-master-key";

/** Khóa storage của lịch sử chat (dùng chung với Assistant). */
export const CHAT_STORAGE_KEY = "ds-assistant-history";

let cachedKey: CryptoKey | null = null;

function randomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toB64(bytes: Uint8Array): string {
  let out = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode(...bytes.subarray(i, i + CH));
  }
  return btoa(out);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Lấy/khởi tạo khóa AES-256 (lưu dạng base64 trong localStorage). */
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  let raw: Uint8Array | null = null;
  try {
    const stored = localStorage.getItem(MASTER_KEY);
    if (stored) raw = fromB64(stored);
  } catch {
    /* bỏ qua */
  }
  if (!raw) {
    raw = randomBytes(32);
    try {
      localStorage.setItem(MASTER_KEY, toB64(raw));
    } catch {
      /* bỏ qua */
    }
  }
  cachedKey = await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

/** Mã hóa chuỗi → "iv.b64:cipher.b64" (AES-256-GCM). */
export async function encryptString(plain: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(12);
  const enc = new TextEncoder().encode(plain);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc as BufferSource,
  );
  return `${toB64(iv)}:${toB64(new Uint8Array(cipher))}`;
}

/** Giải mã "iv.b64:cipher.b64" — trả null nếu lỗi/sai khóa. */
export async function decryptString(payload: string): Promise<string | null> {
  const key = await getKey();
  const [ivB64, dataB64] = payload.split(":");
  if (!ivB64 || !dataB64) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource },
      key,
      fromB64(dataB64) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Xóa khóa chính + dữ liệu chat đã mã hóa (dùng cho "Đặt lại ứng dụng"). */
export function wipeSecureStorage(): void {
  try {
    localStorage.removeItem(MASTER_KEY);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    /* bỏ qua */
  }
}
