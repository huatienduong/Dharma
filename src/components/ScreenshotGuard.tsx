import { useEffect } from "react";

/**
 * CHỐNG SAO CHÉP VĂN BẢN — LUÔN BẬT cho mọi người dùng (không thể tắt).
 *
 * ĐÃ GỠ chế độ chống chụp ảnh màn hình theo yêu cầu.
 * Còn giữ:
 * 1. `user-select: none` toàn ứng dụng — không bôi đen/chép nội dung.
 * 2. Chặn menu chuột phải + Ctrl/Cmd+C, Ctrl/Cmd X (ngoài ô nhập liệu).
 */
export function ScreenshotGuard() {
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      const tag = node?.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (node?.isContentEditable ?? false)
      );
    };

    const blockCtx = (e: MouseEvent) => e.preventDefault();

    const blockClipboard = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) e.preventDefault();
    };

    const blockKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X") &&
        !isEditable(e.target)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockCtx);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("keydown", blockKey, true);
    document.body.classList.add("ds-protect");

    return () => {
      document.removeEventListener("contextmenu", blockCtx);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("keydown", blockKey, true);
      document.body.classList.remove("ds-protect");
    };
  }, []);

  return (
    <style>{`
      body.ds-protect {
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      /* Ô nhập liệu vẫn chọn/biên tập bình thường */
      body.ds-protect input,
      body.ds-protect textarea {
        user-select: text;
        -webkit-user-select: text;
      }
    `}</style>
  );
}
