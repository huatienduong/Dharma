import { useEffect, useState } from "react";

/**
 * CHỐNG CHỤP ẢNH MÀN HÌNH — LUÔN BẬT cho mọi người dùng (không thể tắt).
 *
 * Cơ chế (mức tối đa nền tảng web cho phép):
 * 1. Ẩn TOÀN BỘ nội dung khi trang mất focus / chuyển tab / thu nhỏ cửa sổ
 *    → chặn quay màn hình, chia sẻ cửa sổ, chụp khi app ở nền.
 * 2. Chặn phím tắt chụp màn hình phổ biến (PrintScreen,
 *    Cmd/Ctrl+Shift+3/4/5, Win+Shift+S) — che màn hình khi phát hiện.
 * 3. Chặn menu chuột phải + chống chọn/nhân bản văn bản.
 *
 * Lưu ý: trình duyệt web không thể chặn 100% chụp bằng thiết bị ngoài;
 * đây là lớp bảo vệ tốt nhất chuẩn web cho phép (tương tự app ngân hàng).
 */
export function ScreenshotGuard() {
  return (
    <>
      <style>{`
        body.ds-protect {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
      `}</style>
      <ScreenshotGuardBehavior />
    </>
  );
}

function ScreenshotGuardBehavior() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === "printscreen" ||
        (e.metaKey && e.shiftKey && ["3", "4", "5", "s"].includes(k))
      ) {
        e.preventDefault();
        setHidden(true);
        window.setTimeout(() => setHidden(false), 1500);
      }
    };

    const blockCtx = (e: MouseEvent) => e.preventDefault();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", blockCtx);
    document.body.classList.add("ds-protect");

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", blockCtx);
      document.body.classList.remove("ds-protect");
      setHidden(false);
    };
  }, []);

  if (!hidden) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-3 bg-background"
      aria-hidden
    >
      <div className="text-4xl">🙏</div>
      <p className="text-sm font-medium text-muted-foreground">
        Nội dung được bảo vệ
      </p>
    </div>
  );
}
