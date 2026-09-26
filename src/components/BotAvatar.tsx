/**
 * AVATAR TRợ LÝ PHẬT HỌC — robot theo phong cách Phật giáo.
 *
 * Gộp hai hình ảnh: mặt robot hiện đại (vỏ sứ, tai nghe) với các nét đặc
 * trưng của tượng Phật — Đỉnh Uṣṇīṣa vàng trên đỉnh đầu, tai dài, hạt
 * Urna giữa hai lông mày, mắt khép nghiền an tịnh, và đài sen nở dưới thân.
 *
 * Nhấn mạnh sự an tịnh nhưng vẫn là robot (vỏ sứ bo góc, kính mắt, nụ
 * cười nhẹ) để hợp với vai trò trợ lý. Tông nâu mập ong – vàng ấm, không
 * dùng vòng hào quang chồng nhau.
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
        "bg-gradient-to-b from-[#FBEED2] to-[#EBD09A]",
        "shadow-[0_2px_10px_-4px_rgba(111,66,38,0.45)]",
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
        <defs>
          <linearGradient id="bot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFDF8" />
            <stop offset="100%" stopColor="#F4E3C4" />
          </linearGradient>
          <linearGradient id="bot-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7CE84" />
            <stop offset="100%" stopColor="#D18A24" />
          </linearGradient>
          <linearGradient id="bot-lotus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3C173" />
            <stop offset="100%" stopColor="#C77C1C" />
          </linearGradient>
        </defs>

        {/* ---------- Đài sen nở dưới thân ---------- */}
        <g>
          <path
            d="M24 38.6c-1.7-1.5-2.6-3-2.6-4.6 0-1.5 1-2.7 2.6-3.3 1.6.6 2.6 1.8 2.6 3.3 0 1.6-.9 3.1-2.6 4.6z"
            fill="url(#bot-lotus)"
          />
          <path
            d="M20.4 41.2c-1.9-.6-3.3-1.6-4-3-.6-1.3-.4-2.8.5-4 1.3.1 2.5.7 3.4 1.7.9 1 1.2 2.1 1.1 3.3z"
            fill="url(#bot-lotus)"
            opacity="0.85"
          />
          <path
            d="M27.6 41.2c1.9-.6 3.3-1.6 4-3 .6-1.3.4-2.8-.5-4-1.3.1-2.5.7-3.4 1.7-.9 1-1.2 2.1-1.1 3.3z"
            fill="url(#bot-lotus)"
            opacity="0.85"
          />
        </g>

        {/* ---------- Thân robot ---------- */}
        <path
          d="M13 39.6c0-3.9 4.9-6.4 11-6.4s11 2.5 11 6.4z"
          fill="url(#bot-shell)"
          stroke="#C79A57"
          strokeWidth="1"
        />

        {/* ---------- Tai dài (nét đặc trưng của tượng Phật) ---------- */}
        <rect
          x="9.9"
          y="17.4"
          width="3.2"
          height="12"
          rx="1.6"
          fill="#EFDCBB"
          stroke="#C79A57"
          strokeWidth="0.8"
        />
        <rect
          x="34.9"
          y="17.4"
          width="3.2"
          height="12"
          rx="1.6"
          fill="#EFDCBB"
          stroke="#C79A57"
          strokeWidth="0.8"
        />

        {/* ---------- Đầu sứ ---------- */}
        <rect
          x="12.4"
          y="12.6"
          width="23.2"
          height="21.6"
          rx="9.2"
          fill="url(#bot-shell)"
          stroke="#C79A57"
          strokeWidth="1.1"
        />

        {/* ---------- Đỉnh Uṣṇīṣa ---------- */}
        <g>
          <rect x="21.7" y="6.6" width="4.6" height="7" rx="2.3" fill="url(#bot-gold)" />
          <circle cx="24" cy="7.4" r="4.4" fill="url(#bot-gold)" />
          <ellipse cx="22.6" cy="5.9" rx="1.5" ry="1" fill="#FFF0CB" opacity="0.85" />
        </g>

        {/* Ánh sáng trên vòm đầu */}
        <path
          d="M16.8 17c1.6-1.8 4.3-2.8 7.2-2.8s5.6 1 7.2 2.8"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.95"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* ---------- Hạt Urna giữa hai lông mày ---------- */}
        <circle cx="24" cy="19.6" r="1" fill="url(#bot-gold)" />

        {/* ---------- Quầng sáng mắt (chỉ khi bật glow) ---------- */}
        {glow ? (
          <>
            <ellipse cx="19" cy="24.6" rx="4" ry="3" fill="#F0A63A" opacity="0.18" />
            <ellipse cx="29" cy="24.6" rx="4" ry="3" fill="#F0A63A" opacity="0.18" />
          </>
        ) : null}

        {/* ---------- Mắt khép nghiền an tịnh ---------- */}
        <path
          d="M16.2 24.2c.9 1.5 2 2.2 2.8 2.2s1.9-.7 2.8-2.2"
          fill="none"
          stroke="#5A3A1E"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M26.2 24.2c.9 1.5 2 2.2 2.8 2.2s1.9-.7 2.8-2.2"
          fill="none"
          stroke="#5A3A1E"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* ---------- Nụ cười nhẹ ---------- */}
        <path
          d="M21.6 29.4c.8 1.2 1.6 1.8 2.4 1.8s1.6-.6 2.4-1.8"
          fill="none"
          stroke="#8A5A2B"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
