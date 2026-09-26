/**
 * ĐỌC ẢNH VÀ TỆP TRÊN MÁY NGƯỜI DÙNG.
 *
 * Nguyên tắc số một: TUYỆT ĐỐI KHÔNG ĐỂ ĐÍNH KÈM RƠI LẶNG LẼ. Mất ảnh thì
 * Trợ lý trả lời như thể không có ảnh — đúng triệu chứng “gửi ảnh lên mà hệ
 * thống không thấy ảnh”. Vì vậy mọi đường nén ảnh đều có đường lùi về ảnh gốc.
 */

import type { AttachedFile } from "@/components/ChatComposer";

/** Kích thước ảnh sau khi nén (px chiều dài nhất). */
const IMAGE_MAX_EDGE = 1024;
/** Chất lượng JPEG khi nén. */
const IMAGE_QUALITY = 0.82;
/** Giới hạn kích thước tệp mà ứng dụng nhận (byte). */
export const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("decode-failed"));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/**
 * Đọc một ảnh và trả về base64 sẵn sàng gửi.
 *
 * Ảnh được thu nhỏ về 1024px + nén JPEG để nhận diện đủ chữ và vật thể mà
 * không nặng. Nếu máy không nén được (ảnh quá lớn, thiếu bộ nhớ, trình duyệt
 * từ chối canvas) thì dùng luôn ảnh gốc — mất ảnh còn tệ hơn ảnh nặng.
 */
export async function readImageAttachment(
  file: File,
): Promise<{ ok: true; image: { base64: string; mime: string } } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Chỉ hỗ trợ tệp ảnh." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Ảnh vượt quá 12 MB. Hãy chọn ảnh nhỏ hơn." };
  }
  let original = "";
  try {
    original = await readAsDataUrl(file);
  } catch {
    return { ok: false, error: "Không thể đọc ảnh trên thiết bị này." };
  }
  const originalBase64 = original.includes(",") ? original.split(",")[1] ?? "" : "";
  if (!originalBase64) {
    return { ok: false, error: "Không thể đọc ảnh trên thiết bị này." };
  }
  // Đường lùi an toàn: ảnh gốc vẫn dùng được.
  const fallback = { base64: originalBase64, mime: file.type || "image/jpeg" };
  try {
    const img = await loadImage(original);
    if (!img.width || !img.height) return { ok: true, image: fallback };
    const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: true, image: fallback };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", IMAGE_QUALITY).split(",")[1];
    return base64
      ? { ok: true, image: { base64, mime: "image/jpeg" } }
      : { ok: true, image: fallback };
  } catch {
    return { ok: true, image: fallback };
  }
}

/** Định dạng tệp ứng dụng nhận đọc được. */
const FILE_EXT =
  /\.(txt|md|csv|tsv|json|jsonl|ndjson|log|srt|vtt|xml|html?|ya?ml|ini|sql|js|ts|tsx|jsx|py|java|c|cpp|h|cs|go|rs|php|rb|sh|pdf)$/i;

/** Đọc danh sách tệp người dùng chọn thành dữ liệu gửi kèm. */
export async function readFileAttachments(
  list: FileList | null,
): Promise<{ files: AttachedFile[]; skipped: string[] }> {
  const files: AttachedFile[] = [];
  const skipped: string[] = [];
  if (!list) return { files, skipped };
  for (const file of Array.from(list)) {
    // Định dạng lạ (docx, xlsx, ảnh…) → nêu tên để người dùng biết chính xác
    // tệp nào không được phân tích, thay vì im lặng bỏ qua.
    if (!FILE_EXT.test(file.name)) {
      skipped.push(file.name);
      continue;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      skipped.push(`${file.name} (quá 12 MB)`);
      continue;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] ?? "" : "";
      if (!base64) {
        skipped.push(file.name);
        continue;
      }
      files.push({
        name: file.name,
        mime: file.type || guessMime(file.name),
        base64,
        size: file.size,
      });
    } catch {
      skipped.push(file.name);
    }
  }
  return { files, skipped };
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "csv" || ext === "tsv") return "text/csv";
  if (ext === "json" || ext === "jsonl") return "application/json";
  if (ext === "pdf") return "application/pdf";
  if (ext === "html" || ext === "htm") return "text/html";
  return "text/plain";
}
