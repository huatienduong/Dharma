import { cn } from "@/lib/utils";
import { Bot, RotateCw, Settings, WifiOff, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* ------------------------------------------------------------------ */
/* THÔNG BÁO DỊCH VỤ — hiển thị khi ứng dụng mất kết nối hoặc được    */
/* yêu cầu thông báo.                                                  */
/*                                                                     */
/* Nguồn kích hoạt:                                                     */
/*   • Trình duyệt mất mạng (offline)                                   */
/*   • Tính năng chủ động phát sự kiện service-notice                  */
/*   • Lỗi runtime tự phục hồi không được chặn toàn màn hình           */
/* ------------------------------------------------------------------ */

export const SERVICE_NOTICE_EVENT = "dharma:service-notice";

export type ServiceNoticeReason = "offline" | "error" | "upgrade";

/** Bất kỳ tính năng nào cũng có thể gọi hàm này khi bị treo/lỗi tạm thời. */
export function showServiceNotice(reason: ServiceNoticeReason = "upgrade") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SERVICE_NOTICE_EVENT, { detail: { reason } }),
  );
}

const UPGRADE_MESSAGE =
  "Đội ngũ kỹ thuật đang tiến hành nâng cấp hệ thống hoặc ứng dụng đang gặp vấn đề sự cố tạm thời. Xin vui lòng quay lại sau!";

export function ServiceNotice() {
  const navigate = useNavigate();
  const [reason, setReason] = useState<ServiceNoticeReason | null>(
    typeof navigator !== "undefined" && navigator.onLine === false
      ? "offline"
      : null,
  );
  const [reloading, setReloading] = useState(false);

  /* Mất / có lại kết nối mạng */
  useEffect(() => {
    const onOffline = () => setReason("offline");
    const onOnline = () =>
      setReason((cur) => (cur === "offline" ? null : cur));
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  /* Không chặn cả màn hình chỉ vì vài lỗi runtime/unhandled rejection có thể
     tự phục hồi (Convex tự kết nối lại, request AI retry...). Màn hình này chỉ
     hiện khi mất mạng thật hoặc một tính năng chủ động yêu cầu thông báo. */

  /* Tính năng tự báo sự cố */
  useEffect(() => {
    const onNotice = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: ServiceNoticeReason }>).detail;
      setReason(detail?.reason ?? "upgrade");
    };
    window.addEventListener(SERVICE_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(SERVICE_NOTICE_EVENT, onNotice);
  }, []);

  const reload = useCallback(() => {
    setReloading(true);
    window.location.reload();
  }, []);

  if (!reason) return null;

  const offline = reason === "offline";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Thông báo từ Trợ lý Phật học"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-10 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-xl sm:p-8">
        <span
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            offline
              ? "bg-muted text-muted-foreground"
              : "bg-gold/15 text-gold",
          )}
        >
          {offline ? (
            <WifiOff className="h-7 w-7" />
          ) : (
            <span className="relative" aria-hidden>
              <Bot className="h-9 w-9" />
              <Wrench className="absolute -bottom-1 -right-1 h-4 w-4 animate-pulse text-primary" />
            </span>
          )}
        </span>

        <h2 className="mt-5 text-lg font-bold tracking-tight">
          {offline ? "Mất kết nối mạng" : "Trợ lý Phật học đang được nâng cấp"}
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {offline
            ? "Ứng dụng đang mất kết nối mạng. Vui lòng kiểm tra kết nối rồi quay lại sau."
            : UPGRADE_MESSAGE}
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
              setReason(null);
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
