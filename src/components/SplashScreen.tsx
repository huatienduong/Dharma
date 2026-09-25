import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/version";

/**
 * Splash screen — chỉ hiện tên ứng dụng trong lúc tải dữ liệu ban đầu.
 * Không hiện ảnh logo ở màn hình chờ đầu tiên; logo chính thức vẫn dùng
 * trong phần Giới thiệu (Cài đặt) và cho favicon/PWA icon.
 * Tự ẩn khi app sẵn sàng hoặc tối đa 2.5s để không chặn người dùng.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), 1600);
    const hideTimer = window.setTimeout(() => setVisible(false), 2200);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <p className="text-lg font-extrabold uppercase tracking-[0.2em] text-foreground sm:text-xl sm:tracking-[0.28em]">
        {APP_NAME}
      </p>
    </div>
  );
}
