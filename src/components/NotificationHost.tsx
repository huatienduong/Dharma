/**
 * KHO THÔNG BÁO ỨNG DỤNG — nơi duy nhất quyết định có hiện thông báo tức
 * thời (toast) hay không.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY: công tắc "Thông báo ứng dụng" trong Cài đặt
 * trước đây chỉ lưu cờ vào localStorage mà không ai đọc, nên tắt xong thông
 * báo vẫn hiện. Nay kho thông báo chỉ được gắn khi cờ BẬT, và khi người
 * dùng tắt thì các thông báo đang hiện bị gỡ ngay.
 *
 * Đặt NGOÀI <SettingsProvider> trong main.tsx (giữ nguyên cây provider như
 * cũ), nên đọc cờ bằng `readNotificationsPref()` + nghe sự kiện thay đổi.
 */

import { Toaster } from "@/components/ui/sonner";
import {
  NOTIFICATIONS_PREF_EVENT,
  readNotificationsPref,
} from "@/lib/settings";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function NotificationHost() {
  const [enabled, setEnabled] = useState(readNotificationsPref);

  useEffect(() => {
    const onChange = () => setEnabled(readNotificationsPref());
    window.addEventListener(NOTIFICATIONS_PREF_EVENT, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_PREF_EVENT, onChange);
  }, []);

  // Vừa tắt thông báo → gỡ luôn những gì đang hiện, không để đọng lại rồi
  // hiện đột ngột khi bật lại.
  useEffect(() => {
    if (!enabled) toast.dismiss();
  }, [enabled]);

  if (!enabled) return null;

  return <Toaster />;
}
