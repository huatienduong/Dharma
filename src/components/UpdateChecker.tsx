import { api } from "@/convex/_generated/api";
import { useSettings } from "@/lib/settings";
import { APP_VERSION } from "@/lib/version";
import { useMutation, useQuery } from "convex/react";
import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** So sánh semver đơn giản: trả về true nếu `latest` mới hơn `current`. */
function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

/**
 * TỰ KIỂM TRA PHIÊN BẢN MỚI — hiển thị ngay khi có bản phát hành:
 * - Query Convex REACTIVE: khi server cập nhật phiên bản, mọi thiết bị
 *   đang mở ứng dụng nhận biết tức thì (không cần bấm kiểm tra).
 * - Hiện banner mời cập nhật (có nút đóng) + toast thông báo một lần.
 * - Nút "Cập nhật ngay" tải lại ứng dụng để nhận bản mới.
 */
export function UpdateChecker() {
  // Công tắc "Thông báo ứng dụng" trong Cài đặt tắt được cả banner này,
  // không chỉ toast — nếu không, người dùng tắt thông báo vẫn thấy nó.
  const { settings } = useSettings();
  const notifications = settings.notifications;
  const meta = useQuery(api.library.getAppVersion, {});
  const seedVersion = useMutation(api.library.seedAppVersion);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [toasted, setToasted] = useState<string | null>(null);
  const seededRef = useRef(false);

  /* ----- SỬA LỖI "không xuất phiên bản mới nhất": bảng appMeta trên server
     chưa từng được khởi tạo (seedAppVersion không có chỗ gọi) → meta null
     → không bao giờ có thông tin bản mới. Tự gieo bản ghi lần đầu với
     phiên bản hiện tại; lần sau chủ app chỉ cần cập nhật bản ghi này
     (dashboard/seed) là mọi thiết bị nhận banner cập nhật ngay. */
  useEffect(() => {
    if (meta === null && !seededRef.current) {
      seededRef.current = true;
      void seedVersion({ latestVersion: APP_VERSION }).catch(() => {
        seededRef.current = false;
      });
    }
  }, [meta, seedVersion]);

  const latest = meta?.latestVersion;
  const hasUpdate =
    !!latest && isNewer(latest, APP_VERSION) && dismissed !== latest;

  // Toast một lần cho mỗi phiên bản mới
  useEffect(() => {
    if (notifications && hasUpdate && latest && toasted !== latest) {
      toast(`Phiên bản mới ${latest} đã sẵn sàng`, {
        description: meta?.releaseNotes?.slice(0, 120),
        duration: 6000,
      });
      setToasted(latest);
    }
  }, [notifications, hasUpdate, latest, toasted, meta?.releaseNotes]);

  if (!notifications || !hasUpdate || !latest) return null;

  return (
    // z-[100]: nằm trên nội dung (z-40) và trên thông báo tức thời (z-90),
    // nhưng vẫn dưới màn thông báo chặn toàn màn hình (z-[200]).
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-2">
      <div className="flex w-full max-w-md items-center gap-2.5 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 shadow-lg backdrop-blur">
        <Download className="h-4 w-4 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            Có phiên bản mới {latest} (bạn đang dùng {APP_VERSION})
          </p>
          {meta?.releaseNotes && (
            <p className="truncate text-[11px] text-muted-foreground">
              {meta.releaseNotes}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Cập nhật ngay
        </button>
        <button
          type="button"
          onClick={() => setDismissed(latest)}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
