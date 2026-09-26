/**
 * AVATAR TRỢ LÝ PHẬT HỌC — robot AI vẽ tay bằng SVG.
 *
 * Thiết kế mới: vỏ bo góc dạng "squircle" (bo tròn hiện đại), mặt kính tối
 * ôm sát mắt và hạt sen kết ăng-ten — gọn gàng, chuyên nghiệp, không còn các
 * vòng hào quang chồng lên nhau. Tông nâu mập ong – vàng ấm để hợp giao diện.
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
        "relative flex shrink-0 items-center justify-center rounded-[30%]",
        "bg-gradient-to-br from-[#8a5730] via-[#7a4a2b] to-[#b8802f]",
        "shadow-md",
        SIZES[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 40 40"
        role="img"
        aria-label="Avatar Trợ lý Phật học"
        className="relative h-[84%] w-[84%]"
      >
        <defs>
          <linearGradient id="bot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFAF2" />
            <stop offset="100%" stopColor="#EFD6AB" />
          </linearGradient>
          <linearGradient id="bot-visor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5A3519" />
            <stop offset="100%" stopColor="#3A2110" />
          </linearGradient>
          <radialGradient id="bot-eye" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#FFF0C4" />
            <stop offset="55%" stopColor="#F0A63A" />
            <stop offset="100%" stopColor="#D07A18" />
          </radialGradient>
          <linearGradient id="bot-lotus" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="100%" stopColor="#E0852A" />
          </linearGradient>
        </defs>

        {/* Ăng-ten kết bằng hạt sen (hoa sen trong văn hóa Phật) */}
        <g>
          <rect
            x="19.3"
            y="7.2"
            width="1.4"
            height="5"
            rx="0.7"
            fill="#EFD6AB"
          />
          <circle cx="20" cy="6" r="2.7" fill="url(#bot-lotus)" />
          <circle cx="19.3" cy="5.2" r="0.85" fill="#FFF8EC" opacity="0.9" />
        </g>

        {/* Tai nghe hai bên */}
        <rect x="6.4" y="19.2" width="3" height="7.4" rx="1.5" fill="#E6C792" />
        <rect x="30.6" y="19.2" width="3" height="7.4" rx="1.5" fill="#E6C792" />

        {/* Vỏ đầu sứ */}
        <rect
          x="8.6"
          y="11.6"
          width="22.8"
          height="20.2"
          rx="7.2"
          fill="url(#bot-shell)"
          stroke="#B07C3C"
          strokeWidth="1"
        />
        {/* Ánh sáng trên vòm đầu */}
        <path
          d="M12.6 15.9c1.5-1.8 4.3-2.8 7.4-2.8s5.9 1 7.4 2.8"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Mặt kính ôm sát mắt */}
        <rect
          x="11.5"
          y="17.2"
          width="17"
          height="8.8"
          rx="4.4"
          fill="url(#bot-visor)"
        />

        {/* Quầng sáng mắt (chỉ khi bật glow) */}
        {glow ? (
          <>
            <circle cx="16.1" cy="21.6" r="3.1" fill="#F0A63A" opacity="0.22" />
            <circle cx="23.9" cy="21.6" r="3.1" fill="#F0A63A" opacity="0.22" />
          </>
        ) : null}

        {/* Mắt phát sáng */}
        <circle cx="16.1" cy="21.6" r="2.1" fill="url(#bot-eye)" />
        <circle cx="23.9" cy="21.6" r="2.1" fill="url(#bot-eye)" />
        <circle cx="15.5" cy="20.9" r="0.6" fill="#FFFFFF" opacity="0.9" />
        <circle cx="23.3" cy="20.9" r="0.6" fill="#FFFFFF" opacity="0.9" />

        {/* Miệng cười nhẹ dưới mặt kính */}
        <path
          d="M17.1 28.4c.8 1.1 1.8 1.6 2.9 1.6s2.1-.5 2.9-1.6"
          fill="none"
          stroke="#8A5426"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
