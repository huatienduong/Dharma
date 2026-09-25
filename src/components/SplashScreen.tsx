import { api } from "@/convex/_generated/api";
import { APP_NAME } from "@/lib/version";
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
      {/* Logo chính thức — từ Convex Storage; fallback vòng tròn thương hiệu */}
      <div className="flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`Logo ${APP_NAME}`}
            className="max-h-full max-w-full rounded-3xl object-contain shadow-lg"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-lg">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="h-16 w-16 sm:h-20 sm:w-20"
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle cx="16" cy="16" r="2.5" fill="currentColor" />
            </svg>
          </span>
        )}
      </div>

      <p className="mt-6 text-base font-extrabold uppercase tracking-[0.16em] text-foreground">
        {APP_NAME}
      </p>

      {/* Chấm nhún nhẹ báo đang tải */}
      <div className="mt-5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
