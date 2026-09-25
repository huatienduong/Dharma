import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

/**
 * Splash screen — hiện LOGO CHÍNH THỨC của ứng dụng (lưu trên Convex
 * Storage, quản lý qua `library.getAppLogo`) trong lúc tải dữ liệu ban đầu.
 * Tự ẩn khi app sẵn sàng hoặc tối đa 2.5s để không chặn người dùng.
 */
export function SplashScreen() {
  const logoUrl = useQuery(api.library.getAppLogo, {});
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
      {/* Chỉ hiển thị logo chính thức từ Convex Storage */}
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo ứng dụng"
          className="h-48 w-48 rounded-3xl object-contain shadow-lg sm:h-64 sm:w-64"
        />
      )}
    </div>
  );
}
