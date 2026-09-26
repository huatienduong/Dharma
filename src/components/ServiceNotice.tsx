import { cn } from "@/lib/utils";
import { RotateCw, Settings, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* ------------------------------------------------------------------ */
/* MÀN THÔNG BÁO MẤT KẾT NỐI MẠNG                                     */
/*                                                                      */
/* Trước đây file này còn hỗ trợ cả "sự cố tạm thời" qua hàm           */
/* `showServiceNotice()` + sự kiện `dharma:service-notice`. NHƯNG không  */
/* có chỗ nào gọi hàm đó (grep toàn bộ src/ không có kết quả), nên    */
/* nhánh đó là code chết và đã được gỡ.                                */
/*                                                                      */
/* Thứ tự lớp hiển thị (xem thêm ghi chú trong src/index.css):       */
/*   nội dung z-40 < thông báo tức thời z-90 < banner cập nhật z-100  */
/*   < màn thông báo này z-[200]                                      */
/*                                                                      */
/* Màn này KHÔNG bị công tắc "Thông báo ứng dụng" tắt: mất mạng thì  */
/* người dùng không gửi được câu hỏi, chặn lại mới đúng và tránh kẹt  */
/* trong màn hình không dùng được.                                     */
/* ------------------------------------------------------------------ */

export function ServiceNotice() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" && navigator.onLine === false,
  );
  const [reloading, setReloading] = useState(false);

  /* Mất / có lại kết nối mạng */
  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const reload = useCallback(() => {
    setReloading(true);
    window.location.reload();
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Thông báo mất kết nối mạng"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-10 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-xl sm:p-8">
        <span
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            "bg-muted text-muted-foreground",
          )}
        >
          <WifiOff className="h-7 w-7" />
        </span>

        <h2 className="mt-5 text-lg font-bold tracking-tight">
          Mất kết nối mạng
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Ứng dụng đang mất kết nối mạng. Vui lòng kiểm tra kết nối rồi quay lại
          sau.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={reload}
            disabled={reloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
          >
            <RotateCw className={cn("h-4 w-4", reloading && "animate-spin")} />
            Thoát & vào lại
          </button>
          <button
            type="button"
            onClick={() => {
              setOffline(false);
              navigate("/settings");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent sm:w-auto"
          >
            <Settings className="h-4 w-4" />
            Báo cáo lỗi
          </button>
        </div>
      </div>
    </div>
  );
}
