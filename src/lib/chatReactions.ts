/**
 * THẢ ICON VÀO CÂU TRẢ LỜI — người dùng thả ký tự icon (tim, bánh xe pháp,
 * hoa sen…) vào câu trả lời của Trợ lý trong khung chat.
 *
 * Icon KHÔNG nằm trong `content` của tin nhắn, nên không bị gửi lại cho AI và
 * không làm nhiễu lịch sử hội thoại; nó chỉ hiện ngay dưới câu trả lời. Vẫn
 * được lưu mã hóa trên thiết bị (AES-256-GCM) như lịch sử chat, nên mở lại
 * ứng dụng vẫn thấy icon đã thả.
 */

import { decryptString, encryptString } from "@/lib/secureStorage";

const REACTIONS_KEY = "ds-chat-reactions";

/** Tối đa số icon cho một câu trả lời. */
export const MAX_ICONS_PER_MESSAGE = 12;
/** Chỉ giữ icon của N câu mới nhất để dữ liệu cục bộ không phình to. */
export const MAX_REACTED_MESSAGES = 60;

/** Khoá theo mốc thời gian của tin nhắn. */
export type ReactionMap = Record<string, string>;

/** Các icon có thể thả — dùng ký tự đơn giản để thêm/bớt chính xác. */
export const REACTION_ICONS: { icon: string; label: string }[] = [
  { icon: "♥", label: "Tim" },
  { icon: "☸", label: "Bánh xe pháp" },
  { icon: "🪷", label: "Hoa sen" },
  { icon: "🙏", label: "Kính lễ" },
  { icon: "🌸", label: "Từ bi" },
];

export function reactionKey(ts: number): string {
  return String(ts);
}

/** Thêm một icon vào cuối chuỗi icon đang có. */
export function addIcon(current: string | undefined, icon: string): string {
  const list = splitIcons(current);
  if (list.length >= MAX_ICONS_PER_MESSAGE) return list.join("");
  list.push(icon);
  return list.join("");
}

/** Bỏ ĐÚNG MỘT icon cuối cùng có ký tự này (bấm lại icon đã thả để gỡ). */
export function removeIcon(current: string | undefined, icon: string): string {
  const list = splitIcons(current);
  const i = list.lastIndexOf(icon);
  if (i >= 0) list.splice(i, 1);
  return list.join("");
}

function splitIcons(value: string | undefined): string[] {
  return (value ?? "").split("").filter((c) => c.trim().length > 0);
}

/** Chỉ giữ lại N câu mới nhất. */
function prune(map: ReactionMap): ReactionMap {
  const keys = Object.keys(map).sort((a, b) => Number(b) - Number(a));
  const out: ReactionMap = {};
  for (const k of keys.slice(0, MAX_REACTED_MESSAGES)) {
    if (map[k]) out[k] = map[k];
  }
  return out;
}

export async function loadReactions(): Promise<ReactionMap | null> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    if (!raw) return null;
    const plain = raw.includes(":") ? await decryptString(raw) : raw;
    if (!plain) return null;
    const parsed: unknown = JSON.parse(plain);
    if (!parsed || typeof parsed !== "object") return null;
    const out: ReactionMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v) out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export async function saveReactions(map: ReactionMap): Promise<void> {
  try {
    const enc = await encryptString(JSON.stringify(prune(map)));
    localStorage.setItem(REACTIONS_KEY, enc);
  } catch {
    /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
  }
}

export function clearLocalReactions(): void {
  try {
    localStorage.removeItem(REACTIONS_KEY);
  } catch {
    /* noop */
  }
}
