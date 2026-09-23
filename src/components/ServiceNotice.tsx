import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCw, Settings, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

/* ------------------------------------------------------------------ */
/* THÔNG BÁO DỊCH VỤ — hiển thị khi ứng dụng mất kết nối, bị treo,      */
/* hoặc hệ thống đang được nâng cấp.                                    */
/*                                                                     */
/* Nguồn kích hoạt:                                                     */
/*   • Trình duyệt mất mạng (offline)                                   */
/*   • Lỗi runtime lặp lại nhiều lần trong thời gian ngắn              */
/*   • Bất kỳ tính năng nào phát sự kiện window "dharma:service-notice" */
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

const MESSAGE =
  "Đội ngũ kỹ thuật của chúng tôi đang tiến hành nâng cấp hệ thống hoặc nếu bạn thấy thông báo này có thể ứng dụng Dharma AI đang gặp sự cố lỗi tạm thời. Hãy thử tải lại trang này nếu tình trạng không được giải quyết hãy sử dụng tính năng báo cáo lỗi trong phần cài đặt của ứng dụng. Rất xin lỗi vì sự bất tiện gây ra cho bạn!";

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

  /* Lỗi runtime lặp lại (≥3 lần trong 20 giây) → coi như dịch vụ có sự cố */
  useEffect(() => {
    let hits = 0;
    let firstAt = 0;
    const onProblem = () => {
      const now = Date.now();
      if (!firstAt || now - firstAt > 20_000) {
        firstAt = now;
        hits = 0;
      }
      hits += 1;
      if (hits >= 3) setReason("error");
    };
    window.addEventListener("error", onProblem);
    window.addEventListener("unhandledrejection", onProblem);
    return () => {
      window.removeEventListener("error", onProblem);
      window.removeEventListener("unhandledrejection", onProblem);
    };
  }, []);

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
      aria-label="Thông báo từ Dharma AI"
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
            <AlertTriangle className="h-7 w-7" />
          )}
        </span>

        <h2 className="mt-5 text-lg font-bold tracking-tight">
          {offline ? "Mất kết nối mạng" : "Dharma AI đang được nâng cấp"}
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {MESSAGE}
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={reload}
            disabled={reloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
          >
            <RotateCw className={cn("h-4 w-4", reloading && "animate-spin")} />
            Tải lại trang
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
