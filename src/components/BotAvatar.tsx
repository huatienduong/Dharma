/**
 * AVATAR TRỢ LÝ PHẬT HỌC — robot AI vẽ tay bằng SVG.
 *
 * Đơn sắc trắng/đen: MỌI màu đều lấy từ token giao diện (bg-muted, fill-…,
 * stroke-…) nên avatar tự đổi theo chế độ sáng/tối mà không cần sửa mã.
 * Sáng: xám nhạt – viền đen – mắt đen. Tối: xám đậm – viền trắng – mắt trắng.
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
  /** Bật/tắt độ phát sáng quanh mắt (màn đàm thoại dùng bật) */
  glow = false,
}: {
  size?: BotAvatarSize;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-[28%]",
        "bg-muted",
        SIZES[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label="Avatar Trợ lý Phật học"
        className="relative h-[86%] w-[86%]"
      >
        {/* Ăng-ten kết hạt kim loại */}
        <g>
          <rect
            x="23.1"
            y="6.2"
            width="1.8"
            height="6.6"
            rx="0.9"
            className="fill-muted-foreground"
          />
          <circle cx="24" cy="5.6" r="2.9" className="fill-foreground" />
          <circle cx="23.2" cy="4.8" r="0.9" className="fill-background" />
        </g>

        {/* Tai nghe hai bên */}
        <rect
          x="8.6"
          y="21"
          width="3.4"
          height="8"
          rx="1.7"
          className="fill-accent"
        />
        <rect
          x="36"
          y="21"
          width="3.4"
          height="8"
          rx="1.7"
          className="fill-accent"
        />

        {/* Đầu robot */}
        <rect
          x="11.4"
          y="12.4"
          width="25.2"
          height="24"
          rx="9.4"
          className="fill-card stroke-foreground"
          strokeWidth="1.4"
        />
        {/* Ánh sáng trên vòm đầu */}
        <path
          d="M16.4 16.6c1.9-2 4.9-3.1 7.6-3.1s5.7 1.1 7.6 3.1"
          fill="none"
          className="stroke-background"
          strokeOpacity="0.9"
          strokeWidth="1.9"
          strokeLinecap="round"
        />

        {/* Má hồng nhẹ cho thân thiện */}
        <ellipse
          cx="16.4"
          cy="27.4"
          rx="2.6"
          ry="1.7"
          className="fill-muted-foreground"
          opacity="0.3"
        />
        <ellipse
          cx="31.6"
          cy="27.4"
          rx="2.6"
          ry="1.7"
          className="fill-muted-foreground"
          opacity="0.3"
        />

        {/* Quầng sáng mắt (chỉ khi bật glow) */}
        {glow ? (
          <>
            <circle
              cx="19.2"
              cy="24.4"
              r="4.2"
              className="fill-foreground"
              opacity="0.18"
            />
            <circle
              cx="28.8"
              cy="24.4"
              r="4.2"
              className="fill-foreground"
              opacity="0.18"
            />
          </>
        ) : null}

        {/* Mắt tròn xoe, có đốm sáng */}
        <ellipse cx="19.2" cy="24.4" rx="2.6" ry="3.1" className="fill-foreground" />
        <ellipse cx="28.8" cy="24.4" rx="2.6" ry="3.1" className="fill-foreground" />
        <circle cx="18.4" cy="23.1" r="0.95" className="fill-card" />
        <circle cx="28" cy="23.1" r="0.95" className="fill-card" />

        {/* Nụ cười thân thiện */}
        <path
          d="M21.4 30.2c.9 1.3 2 1.9 2.6 1.9s1.7-.6 2.6-1.9"
          fill="none"
          className="stroke-foreground"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
