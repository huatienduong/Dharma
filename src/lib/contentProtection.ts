/**
 * KHÓA NỘI DUNG — chặn hoàn toàn việc sao chép văn bản trong ứng dụng.
 * Nhiều lớp: CSS chặn bôi đen, chặn sự kiện copy/cut (xóa cả dữ liệu trên
 * clipboard), chặn menu chuột phải, chặn kéo-thả và phím tắt Ctrl/Cmd + C/X/A.
 * Nhập liệu (gõ tin nhắn) vẫn hoạt động bình thường.
 */

let started = false;

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable === true;
}

/** Khởi động khóa nội dung — gọi một lần từ main.tsx (idempotent). */
export function startContentProtection(): void {
  if (started || typeof document === "undefined") return;
  started = true;

  // 1. CSS: không cho bôi đen / chọn nội dung (vẫn cho chọn trong ô nhập)
  document.body.classList.add("ds-protect");

  // 2. Chặn menu chuột phải (Copy tuỳ chọn)
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 3. Chặn copy/cut — và xóa sạch nội dung mà clipboard định mang đi
  const wipe = (e: ClipboardEvent) => {
    e.preventDefault();
    try {
      e.clipboardData?.setData("text/plain", "");
    } catch {
      /* bỏ qua */
    }
  };
  document.addEventListener("copy", wipe, true);
  document.addEventListener("cut", wipe, true);

  // 4. Chặn kéo-thả nội dung (kéo ra ngoài app để copy)
  document.addEventListener("dragstart", (e) => e.preventDefault());

  // 5. Chặn bắt đầu bôi đen ngoài ô nhập (chuột / chạm giữ)
  document.addEventListener(
    "selectstart",
    (e) => {
      if (!isEditable(e.target)) e.preventDefault();
    },
    true,
  );

  // 6. Chặn phím tắt sao chép: Ctrl/Cmd + C, X, A (Ctrl+A trong ô nhập vẫn
  //    được — phục vụ sửa text, nhưng sự kiện copy vẫn bị chặn ở bước 3)
  document.addEventListener(
    "keydown",
    (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "c" || k === "x" || k === "a") {
        if (!isEditable(e.target)) e.preventDefault();
      }
    },
    true,
  );
}
