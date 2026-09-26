/**
 * AVATAR TRợ LÝ PHẬT HỌC — robot AI vẽ tay bằng SVG.
 *
 * Thiết kế mới theo kiểu "app icon": nền kem ấm bo góc mềm, đầu robot sứ
 * trắng, mắt tốt tròn xoe có đốm sáng, má hồng nhẹ và nụ cười thân thiện.
 * Ăng-ten kết bằng nụ sen nhỏ — chi tiết Phật giáo duy nhất, giữ đúng
 * tinh thần nhưng không rối mắt. KHÔNG vòng hào quang, KHÔNG mặt kính tối.
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
        "bg-gradient-to-b from-[#FDF6E9] to-[#F2DEB6]",
        "shadow-[0_2px_10px_-4px_rgba(111,66,38,0.45)]",
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
        <defs>
          <linearGradient id="bot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F3E2C4" />
          </linearGradient>
          <linearGradient id="bot-lotus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C877" />
            <stop offset="100%" stopColor="#D98C2B" />
          </linearGradient>
          <linearGradient id="bot-eye" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5A3A1E" />
            <stop offset="100%" stopColor="#33200F" />
          </linearGradient>
        </defs>

        {/* Ăng-ten kết bằng nụ sen nhỏ */}
        <g>
          <rect
            x="23.1"
            y="6.4"
            width="1.8"
            height="6.4"
            rx="0.9"
            fill="#C79A57"
          />
          {/* cánh sen: hai bên + một chính giữa */}
          <path
            d="M24 5.4c.9 0 1.5.9 1.5 2 0 1-.6 1.9-1.5 1.9s-1.5-.9-1.5-1.9c0-1.1.6-2 1.5-2z"
            fill="url(#bot-lotus)"
          />
          <path
            d="M20.9 5.9c.8 0 1.3.8 1.3 1.7 0 .9-.5 1.7-1.3 1.7s-1.3-.8-1.3-1.7c0-.9.5-1.7 1.3-1.7z"
            fill="url(#bot-lotus)"
            opacity="0.75"
          />
          <path
            d="M27.1 5.9c.8 0 1.3.8 1.3 1.7 0 .9-.5 1.7-1.3 1.7s-1.3-.8-1.3-1.7c0-.9.5-1.7 1.3-1.7z"
            fill="url(#bot-lotus)"
            opacity="0.75"
          />
        </g>

        {/* Tai nghe hai bên */}
        <rect x="8.6" y="21" width="3.4" height="8" rx="1.7" fill="#E4C795" />
        <rect x="36" y="21" width="3.4" height="8" rx="1.7" fill="#E4C795" />

        {/* Đầu robot sứ trắng */}
        <rect
          x="11.4"
          y="12.4"
          width="25.2"
          height="24"
          rx="9.4"
          fill="url(#bot-shell)"
          stroke="#C79A57"
          strokeWidth="1.1"
        />
        {/* Ánh sáng trên vòm đầu */}
        <path
          d="M16.4 16.6c1.9-2 4.9-3.1 7.6-3.1s5.7 1.1 7.6 3.1"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.95"
          strokeWidth="1.9"
          strokeLinecap="round"
        />

        {/* Má hồng nhẹ cho thân thiện */}
        <ellipse cx="16.4" cy="27.4" rx="2.6" ry="1.7" fill="#F3B27A" opacity="0.4" />
        <ellipse cx="31.6" cy="27.4" rx="2.6" ry="1.7" fill="#F3B27A" opacity="0.4" />

        {/* Quầng sáng mắt (chỉ khi bật glow) */}
        {glow ? (
          <>
            <circle cx="19.2" cy="24.4" r="4.2" fill="#F0A63A" opacity="0.2" />
            <circle cx="28.8" cy="24.4" r="4.2" fill="#F0A63A" opacity="0.2" />
          </>
        ) : null}

        {/* Mắt tốt tròn xoe, có đốm sáng */}
        <ellipse cx="19.2" cy="24.4" rx="2.6" ry="3.1" fill="url(#bot-eye)" />
        <ellipse cx="28.8" cy="24.4" rx="2.6" ry="3.1" fill="url(#bot-eye)" />
        <circle cx="18.4" cy="23.1" r="0.95" fill="#FFFFFF" opacity="0.95" />
        <circle cx="28" cy="23.1" r="0.95" fill="#FFFFFF" opacity="0.95" />

        {/* Nụ cười thân thiện */}
        <path
          d="M21.4 30.2c.9 1.3 2 1.9 2.6 1.9s1.7-.6 2.6-1.9"
          fill="none"
          stroke="#8A5A2B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
