/**
 * AVATAR TRỢ LÝ PHẬT HỌC — con robot AI vẽ tay bằng SVG.
 *
 * Thay cho icon `Bot` mặc định của lucide: cùng nét bo tròn nhưng có
 * nhân cách — hộp đầu sứ, mắt phát sáng, ăng-ten kết bằng hạt giống sen
 * (hoa sen trong văn hóa Phật) và hào quang tròn phía sau như vầng hào
 * của tượng Phật. Tông màu nâu mập ong – vàng ấm để hợp giao diện chung.
 *
 * Dùng ở: bong bóng trả lời, thẻ tiến trình, ô "đang suy nghĩ" và màn
 * đàm thoại. Kích thước co giãn theo className của vỏ ngoài.
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
  /** Bật/tắt viền sáng và độ phát sáng mắt (màn đàm thoại dùng bật) */
  glow = false,
}: {
  size?: BotAvatarSize;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-primary via-amber-800 to-gold",
        "shadow-sm ring-1 ring-gold/30",
        SIZES[size],
        className,
      )}
    >
      {/* Vầng hào mờ phía sau hộp đầu — gợi hình tượng Phật */}
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full"
      >
        <circle
          cx="20"
          cy="20"
          r="13.5"
          fill="none"
          stroke="rgba(255, 233, 180, 0.55)"
          strokeWidth="1.4"
        />
        <circle
          cx="20"
          cy="20"
          r="17.5"
          fill="none"
          stroke="rgba(255, 233, 180, 0.18)"
          strokeWidth="1"
        />
      </svg>

      {/* Thân robot */}
      <svg
        viewBox="0 0 40 40"
        role="img"
        aria-label="Avatar Trợ lý Phật học"
        className="relative h-[78%] w-[78%]"
      >
        <defs>
          <linearGradient id="bot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8EC" />
            <stop offset="100%" stopColor="#F2D9AE" />
          </linearGradient>
          <radialGradient id="bot-eye" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="60%" stopColor="#E0852A" />
            <stop offset="100%" stopColor="#6F4226" />
          </radialGradient>
          <linearGradient id="bot-lotus" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="100%" stopColor="#E0852A" />
          </linearGradient>
        </defs>

        {/* Ăng-ten kết bằng hạt sen (nở dần theo nhịp) */}
        <g>
          <circle
            cx="20"
            cy="6.2"
            r="3.1"
            fill="url(#bot-lotus)"
            className="origin-center animate-pulse"
          />
          <circle cx="20" cy="5.2" r="1.1" fill="#FFF8EC" opacity="0.9" />
          <rect
            x="19.2"
            y="8.4"
            width="1.6"
            height="4.2"
            rx="0.8"
            fill="#F2D9AE"
          />
        </g>

        {/* Tai nghe */}
        <rect x="5.6" y="18.4" width="3.6" height="8" rx="1.8" fill="#E9C88F" />
        <rect
          x="30.8"
          y="18.4"
          width="3.6"
          height="8"
          rx="1.8"
          fill="#E9C88F"
        />

        {/* Hộp đầu sứ */}
        <rect
          x="8.4"
          y="12.2"
          width="23.2"
          height="19.4"
          rx="7.4"
          fill="url(#bot-shell)"
          stroke="#B97C33"
          strokeWidth="1.1"
        />
        {/* Ánh sáng trên vòm đầu */}
        <path
          d="M12.4 16.6c1.6-2 4.6-3.1 7.6-3.1s6 1.1 7.6 3.1"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.75"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Mắt phát sáng */}
        {glow ? (
          <>
            <circle cx="14.9" cy="21.6" r="3" fill="#E0852A" opacity="0.35" />
            <circle cx="25.1" cy="21.6" r="3" fill="#E0852A" opacity="0.35" />
          </>
        ) : null}
        <circle cx="14.9" cy="21.6" r="2.35" fill="url(#bot-eye)" />
        <circle cx="25.1" cy="21.6" r="2.35" fill="url(#bot-eye)" />
        <circle cx="14.25" cy="20.85" r="0.72" fill="#FFFFFF" opacity="0.95" />
        <circle cx="24.45" cy="20.85" r="0.72" fill="#FFFFFF" opacity="0.95" />

        {/* Miệng cười nhẹ */}
        <path
          d="M16.2 27.2c1 1.5 2.3 2.2 3.8 2.2s2.8-0.7 3.8-2.2"
          fill="none"
          stroke="#8A5426"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
