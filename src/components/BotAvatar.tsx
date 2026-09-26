/**
 * AVATAR TRỢ LÝ PHẬT HỌC — robot AI vẽ tay bằng SVG.
 *
 * Nền ứng dụng là nâu rất đậm, nên robot được vẽ theo hướng NỔI HẲN:
 * KHÔNG có vỏ ngoài (nền trong suốt), đầu kem sáng (`--foreground`), mắt gần
 * đen (`--primary-foreground`), tai + ăng-ten y cà sa (`--primary`).
 * Mọi màu đều lấy từ token nên tự đổi theo giao diện.
 *
 * Dùng ở: bong bóng trả lời, thẻ tiến trình, ô "đang suy nghĩ", màn đàm
 * thoại và màn chào. Kích thước co giãn theo className của vỏ ngoài.
 */

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8",
  md: "size-10",
  lg: "size-11",
} as const;

export type BotAvatarSize = keyof typeof SIZES;

export function BotAvatar({
  size = "md",
  className,
  /** Bật/tắt quầng sáng y cà sa quanh mắt (màn đàm thoại dùng bật) */
  glow = false,
}: {
  size?: BotAvatarSize;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        SIZES[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Avatar Trợ lý Phật học"
        className="relative h-[88%] w-[88%]"
      >
        {/* Ăng-ten: que y cà sa + hạt kem sáng */}
        <g>
          <rect
            x="23.1"
            y="6.2"
            width="1.8"
            height="6.6"
            rx="0.9"
            className="fill-primary"
          />
          <circle cx="24" cy="5.6" r="3" className="fill-foreground" />
          <circle cx="23.1" cy="4.7" r="0.95" className="fill-background" opacity="0.35" />
        </g>

        {/* Tai nghe y cà sa — nổi rõ trên nền nâu */}
        <rect
          x="8.4"
          y="20.8"
          width="3.6"
          height="8.4"
          rx="1.8"
          className="fill-primary"
        />
        <rect
          x="36"
          y="20.8"
          width="3.6"
          height="8.4"
          rx="1.8"
          className="fill-primary"
        />

        {/* Đầu kem sáng — KHÔNG viền bo, nét liền mềm */}
        <rect
          x="11.2"
          y="12.2"
          width="25.6"
          height="24.4"
          rx="9.6"
          className="fill-foreground"
        />
        {/* Ánh sáng nhẹ trên vòm đầu */}
        <path
          d="M16.2 16.4c1.9-2 4.9-3.1 7.8-3.1s5.9 1.1 7.8 3.1"
          fill="none"
          className="stroke-primary"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Má hồng ấm trên nền kem */}
        <ellipse cx="16.3" cy="27.6" rx="2.7" ry="1.7" className="fill-primary" opacity="0.4" />
        <ellipse cx="31.7" cy="27.6" rx="2.7" ry="1.7" className="fill-primary" opacity="0.4" />

        {/* Quầng sáng quanh mắt (chỉ khi bật glow) */}
        {glow ? (
          <>
            <circle cx="19.1" cy="24.3" r="4.6" className="fill-primary" opacity="0.3" />
            <circle cx="28.9" cy="24.3" r="4.6" className="fill-primary" opacity="0.3" />
          </>
        ) : null}

        {/* Mắt gần đen trên đầu kem — tương phản mạnh nhất */}
        <ellipse cx="19.1" cy="24.3" rx="2.8" ry="3.3" className="fill-primary-foreground" />
        <ellipse cx="28.9" cy="24.3" rx="2.8" ry="3.3" className="fill-primary-foreground" />
        <circle cx="18.2" cy="22.9" r="1" className="fill-foreground" />
        <circle cx="28" cy="22.9" r="1" className="fill-foreground" />

        {/* Nụ cười thân thiện */}
        <path
          d="M21.2 30c.9 1.4 2.1 2.1 2.8 2.1s1.9-.7 2.8-2.1"
          fill="none"
          className="stroke-primary-foreground"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
