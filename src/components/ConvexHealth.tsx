import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { RefreshCw, ServerCrash, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

/**
 * GIÁM SÁT KẾT NỐI MÁY CHỦ — khắc phục tình trạng "AI không hoạt động,
 * không tra cứu được gì cả": useQuery của Convex trả `undefined` cả khi
 * ĐANG tải lẫn khi MẤT kết nối, nên nếu deployment đổi địa chỉ / thiết bị
 * chạy bản bundle cũ / mạng lỗi, ứng dụng treo im lặng không báo gì.
 * Component này đếm nhịp: quá 10 giây mở app mà chưa nhận được dữ liệu
 * nào từ máy chủ (query công khai, không cần đăng nhập) → hiện màn hình
 * phục hồi. Khi kết nối hồi phục, dữ liệu về → màn tự ẩn ngay.
 */
export function ConvexHealth() {
  const appMeta = useQuery(api.library.getAppVersion, {});
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [reloading, setReloading] = useState(false);

  /* Chỉ đếm nhịp khi CHƯA có dữ liệu (undefined) — có dữ liệu thì ngừng. */
  useEffect(() => {
    if (appMeta !== undefined) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [appMeta]);

  /* Dữ liệu về (kể cả lúc đang hiện) → reset, màn tự ẩn. */
  useEffect(() => {
    if (appMeta !== undefined) setTick(0);
  }, [appMeta]);

  if (appMeta !== undefined || tick < 10) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Mất kết nối máy chủ"
      className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-10 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-xl sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ServerCrash className="h-7 w-7" />
        </span>

        <h2 className="mt-5 text-lg font-bold tracking-tight">
          Chưa kết nối được máy chủ
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Ứng dụng không tra cứu được dữ liệu từ máy chủ nên Trợ lý Phật học
          tạm chưa hoạt động. Thường do thiết bị đang chạy phiên bản cũ hoặc
          mạng không ổn định — hãy tải lại ứng dụng để nhận phiên bản mới nhất.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setReloading(true);
              window.location.reload();
            }}
            disabled={reloading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw className={reloading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Tải lại ứng dụng
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent sm:w-auto"
          >
            <Settings className="h-4 w-4" />
            Báo cáo lỗi
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/70">
          Đã chờ {tick} giây mà chưa nhận được dữ liệu.
        </p>
      </div>
    </div>
  );
}
