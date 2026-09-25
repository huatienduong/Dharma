import { startDeviceGuard, type DeviceIntegrity } from "@/lib/deviceSecurity";
import { useEffect, useState } from "react";

/**
 * Lớp bảo vệ toàn cục: quét môi trường thiết bị định kỳ; khi phát hiện môi
 * trường tự động hóa / can thiệp (bot, headless, DevTools…) ở mức "blocked"
 * sẽ khóa toàn bộ giao diện ứng dụng ngay lập tức.
 */
export function DeviceGuard() {
  const [integrity, setIntegrity] = useState<DeviceIntegrity>("ok");

  useEffect(() => startDeviceGuard(setIntegrity), []);

  if (integrity !== "blocked") return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7 text-destructive"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          Ứng dụng bị khóa trên thiết bị này
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Chúng tôi phát hiện môi trường thiết bị không bảo đảm (thiết bị bị
          can thiệp hệ thống, đang chạy chế độ tự động hóa hoặc công cụ gỡ lỗi).
          Để bảo vệ dữ liệu và dịch vụ, Trợ lý Phật học không thể tiếp tục hoạt
          động tại đây.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/80">
          Nếu bạn cho rằng đây là nhầm lẫn, hãy đóng mọi công cụ gỡ lỗi, tắt chế
          độ tự động hóa rồi tải lại trang. Mã lỗi: GUARD-01
        </p>
      </div>
    </div>
  );
}
