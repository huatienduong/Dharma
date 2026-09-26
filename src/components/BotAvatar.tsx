/**
 * AVATAR TRỢ LÝ PHẬT HỌC — robot AI vẽ tay bằng SVG.
 *
 * Thiết kế gọn, hiện đại: vỏ sứ kem bo góc mềm, mắt tròn xoe có đốm sáng,
 * tai nghe nhỏ, ăng-ten kết hạt kim loại. KHÔNG dùng ký hiệu Phật giáo
 * (không đỉnh uṣṇīṣa, không đài sen, không hạt urna, không tai dài) — avatar
 * thuần robot, giữ tông nâu vàng của ứng dụng.
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
        "bg-gradient-to-b from-[#FFF8EC] to-[#F6E2C0]",
        "shadow-[0_2px_10px_-4px_rgba(176,24,27,0.35)]",
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
            <stop offset="100%" stopColor="#F8EBD6" />
          </linearGradient>
          <linearGradient id="bot-bead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7C768" />
            <stop offset="100%" stopColor="#E0852A" />
          </linearGradient>
          <linearGradient id="bot-eye" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5A2114" />
            <stop offset="100%" stopColor="#2E0F08" />
          </linearGradient>
        </defs>

        {/* Ăng-ten kết hạt kim loại */}
        <g>
          <rect
            x="23.1"
            y="6.2"
            width="1.8"
            height="6.6"
            rx="0.9"
            fill="#DFB067"
          />
          <circle cx="24" cy="5.6" r="2.9" fill="url(#bot-bead)" />
          <circle cx="23.2" cy="4.8" r="0.9" fill="#FFFDF8" opacity="0.95" />
        </g>

        {/* Tai nghe hai bên */}
        <rect x="8.6" y="21" width="3.4" height="8" rx="1.7" fill="#EFD9AE" />
        <rect x="36" y="21" width="3.4" height="8" rx="1.7" fill="#EFD9AE" />

        {/* Đầu robot sứ trắng */}
        <rect
          x="11.4"
          y="12.4"
          width="25.2"
          height="24"
          rx="9.4"
          fill="url(#bot-shell)"
          stroke="#DFB067"
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
        <ellipse cx="16.4" cy="27.4" rx="2.6" ry="1.7" fill="#F0975F" opacity="0.35" />
        <ellipse cx="31.6" cy="27.4" rx="2.6" ry="1.7" fill="#F0975F" opacity="0.35" />

        {/* Quầng sáng mắt (chỉ khi bật glow) */}
        {glow ? (
          <>
            <circle cx="19.2" cy="24.4" r="4.2" fill="#E0852A" opacity="0.22" />
            <circle cx="28.8" cy="24.4" r="4.2" fill="#E0852A" opacity="0.22" />
          </>
        ) : null}

        {/* Mắt tròn xoe, có đốm sáng */}
        <ellipse cx="19.2" cy="24.4" rx="2.6" ry="3.1" fill="url(#bot-eye)" />
        <ellipse cx="28.8" cy="24.4" rx="2.6" ry="3.1" fill="url(#bot-eye)" />
        <circle cx="18.4" cy="23.1" r="0.95" fill="#FFFFFF" opacity="0.95" />
        <circle cx="28" cy="23.1" r="0.95" fill="#FFFFFF" opacity="0.95" />

        {/* Nụ cười thân thiện */}
        <path
          d="M21.4 30.2c.9 1.3 2 1.9 2.6 1.9s1.7-.6 2.6-1.9"
          fill="none"
          stroke="#8A3320"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
