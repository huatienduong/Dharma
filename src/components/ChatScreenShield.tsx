import { useEffect } from "react";

/**
 * KHIÊN BẢO VỆ GIAO DIỆN TRÒ CHUYỆN — bảo vệ dữ liệu hội thoại khỏi bị
 * chụp ảnh / quay video (giải pháp tốt nhất có thể trên web):
 *
 * 1. Khi trang rời khỏi màn hình (chuyển tab, thu nhỏ — thời điểm các công
 *    cụ ghi hình hoạt động) → làm mù mờ toàn bộ khu vực chat ngay lập tức;
 *    quay lại màn hình mới hiển thị bình thường. Khung hình bị ghi trong
 *    lúc đó chỉ thấy nội dung đã bị làm mờ.
 * 2. Chặn hẳn Screen Capture API của trình duyệt (getDisplayMedia) — mọi
 *    lời gọi quay màn hình tab/cửa sổ từ trang này đều bị từ chối.
 * 3. PrintScreen: tự ghi đè clipboard bằng nội dung rỗng (best-effort).
 *
 * Lưu ý trung thực: hệ điều hành cho phép ghi hình bằng phần cứng/phần mềm
 * ngoài trình duyệt — tầng web không thể chặn 100%, đây là các lớp giảm
 * thiểu thực dụng cho dữ liệu hội thoại.
 */
export function ChatScreenShield() {
  useEffect(() => {
    const body = document.body;

    /* 1. Làm mờ khu vực chat khi trang không hiển thị / mất tiêu điểm */
    const shield = (on: boolean) => {
      body.classList.toggle("ds-shield", on);
    };
    const onVisibility = () => shield(document.visibilityState === "hidden");
    const onFocus = () => shield(false);
    const onBlur = () => shield(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    shield(document.visibilityState === "hidden");

    /* 2. Chặn Screen Capture API của trình duyệt */
    let restoreCapture: (() => void) | null = null;
    try {
      const md = navigator.mediaDevices as
        | (MediaDevices & {
            getDisplayMedia?: (c?: DisplayMediaStreamOptions) => Promise<MediaStream>;
          })
        | undefined;
      if (md && typeof md.getDisplayMedia === "function") {
        const original = md.getDisplayMedia.bind(md);
        md.getDisplayMedia = () =>
          Promise.reject(
            new DOMException(
              "Ứng dụng không cho phép quay/chụp màn hình để bảo vệ dữ liệu hội thoại.",
              "NotAllowedError",
            ),
          );
        restoreCapture = () => {
          md.getDisplayMedia = original;
        };
      }
    } catch {
      /* môi trường không có mediaDevices — bỏ qua */
    }

    /* 3. PrintScreen → ghi đè clipboard rỗng (best-effort, Windows/Linux) */
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        try {
          void navigator.clipboard.writeText("");
        } catch {
          /* bỏ qua */
        }
      }
    };
    document.addEventListener("keyup", onKeyUp, true);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keyup", onKeyUp, true);
      body.classList.remove("ds-shield");
      restoreCapture?.();
    };
  }, []);

  return null;
}
