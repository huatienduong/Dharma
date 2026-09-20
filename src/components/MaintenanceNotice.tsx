import { cn } from "@/lib/utils";
import { Wrench } from "lucide-react";

/**
 * THÔNG BÁO NÂNG CẤP HỆ THỐNG — dùng chung cho mọi mục yêu cầu đăng nhập
 * (Đăng nhập/Đăng ký, Hồ sơ, Phòng xem cùng, lưu hội thoại…).
 * Văn bản và giao diện đồng bộ tuyệt đối trên toàn ứng dụng.
 *
 * variant:
 *  - "page"   : thẻ trắng nổi, đặt giữa trang (trang /auth)
 *  - "inline" : thẻ trong nội dung trang sáng (Hồ sơ…)
 *  - "dark"   : thẻ tối cho nền điện ảnh (Phòng xem cùng)
 *  - "compact": một dòng nhỏ gọn (chú thích cuối trang)
 */
export function MaintenanceNotice({
  variant = "inline",
  feature,
  onBack,
  backLabel = "Quay lại trang chủ",
  className,
}: {
  variant?: "page" | "inline" | "dark" | "compact";
  /** Tên tính năng bị ảnh hưởng (vd: "Hồ sơ") — để trống dùng câu chung */
  feature?: string;
  /** Hiện nút quay về trang chủ */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  const title = "Đội ngũ kỹ thuật đang tiến hành nâng cấp hệ thống";
  const body = feature
    ? `Hiện tại bạn không thể sử dụng tính năng ${feature} cho đến khi chúng tôi hoàn thành bản cập nhật mới.`
    : "Hiện tại bạn không thể sử dụng tính năng này cho đến khi chúng tôi hoàn thành bản cập nhật mới.";
  const sorry = "Xin lỗi vì sự bất tiện này đã gây ra cho bạn!";

  if (variant === "compact") {
    return (
      <p
        className={cn(
          "inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <Wrench className="h-3 w-3 text-gold" />
        <span>
          {feature ? `Tính năng ${feature} ` : "Tính năng này "}
          đang được nâng cấp — {sorry.toLowerCase()}
        </span>
      </p>
    );
  }

  if (variant === "dark") {
    return (
      <div
        className={cn(
          "mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-8 text-center shadow-xl",
          className,
        )}
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15">
          <Wrench className="h-8 w-8 text-gold" />
        </span>
        <h2 className="mt-5 text-lg font-bold leading-snug text-zinc-100">
          {title}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">{body}</p>
        <p className="mt-3 text-sm font-medium text-gold">{sorry}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-6 w-full rounded-full bg-white/10 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-white/20"
          >
            {backLabel}
          </button>
        )}
      </div>
    );
  }

  const isPage = variant === "page";
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm sm:p-8",
        isPage ? "max-w-sm" : "max-w-md",
        className,
      )}
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 sm:h-16 sm:w-16">
        <Wrench className="h-7 w-7 text-gold sm:h-8 sm:w-8" />
      </span>
      <h2 className="mt-4 text-lg font-bold leading-snug">{title}</h2>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <p className="mt-3 text-sm font-medium text-gold">{sorry}</p>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {backLabel}
        </button>
      )}
    </div>
  );
}
