import { cn } from "@/lib/utils";

/**
 * LOGO DHARMA chính thức — vẽ lại từ logo chính thức của ứng dụng:
 * bánh xe Chuyển pháp luân vàng treo trên lá bồ đề, hai bảo tháp hai bên,
 * hoa sen dưới chân, nền đen. Logo TĨNH, sắc nét ở mọi kích thước.
 */

export function DhammaWheel({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Dharma — Giới - Định - Tuệ"
    >
      {/* Nền tròn tối */}
      <circle cx="32" cy="30" r="29" fill="#241708" />

      {/* Lá bồ đề */}
      <path
        d="M32 3.5 C43.5 8.5 47.5 20.5 44.5 30.5 C42.5 37.5 37.5 41.5 32 42.5 C26.5 41.5 21.5 37.5 19.5 30.5 C16.5 20.5 20.5 8.5 32 3.5 Z"
        fill="#3d2a12"
        stroke="#5b4423"
        strokeWidth="0.8"
      />
      {/* Gân lá */}
      <path d="M32 6 L32 41" stroke="#d9a441" strokeWidth="0.7" opacity="0.45" />
      <path d="M32 14 L26 11 M32 14 L38 11 M32 21 L24.5 17 M32 21 L39.5 17 M32 28 L24 24 M32 28 L40 24 M32 35 L25 31.5 M32 35 L39 31.5" stroke="#d9a441" strokeWidth="0.55" opacity="0.3" fill="none" />

      {/* Hai bảo tháp */}
      <g fill="#5b4423">
        <path d="M7.5 41.5 L10.5 41.5 L11.2 35 L11.8 35 L11.8 29.5 L12.4 29.5 L12.4 24 L13 24 L13.6 29.5 L14.2 29.5 L14.2 35 L14.8 35 L15.5 41.5 L18 41.5 L18 47.5 L7.5 47.5 Z" />
        <path d="M46 41.5 L49 41.5 L49.7 35 L50.3 35 L50.3 29.5 L50.9 29.5 L50.9 24 L51.5 24 L52.1 29.5 L52.7 29.5 L52.7 35 L53.3 35 L54 41.5 L56.5 41.5 L56.5 47.5 L46 47.5 Z" />
      </g>

      {/* Bánh xe Chuyển pháp luân 8 nan hoa */}
      <g>
        <circle cx="32" cy="28" r="11.8" fill="#241708" stroke="#e8b45c" strokeWidth="2.4" />
        <circle cx="32" cy="28" r="9" fill="none" stroke="#e8b45c" strokeWidth="0.9" opacity="0.55" />
        <g stroke="#e8b45c" strokeWidth="2" strokeLinecap="round">
          <line x1="32" y1="17.5" x2="32" y2="38.5" />
          <line x1="32" y1="17.5" x2="32" y2="38.5" transform="rotate(45 32 28)" />
          <line x1="32" y1="17.5" x2="32" y2="38.5" transform="rotate(90 32 28)" />
          <line x1="32" y1="17.5" x2="32" y2="38.5" transform="rotate(135 32 28)" />
        </g>
        {/* Bánh xe nhô ra ngoài vành (đầu nan hoa) */}
        <g fill="#e8b45c">
          <circle cx="32" cy="16.6" r="1.1" />
          <circle cx="32" cy="39.4" r="1.1" />
          <circle cx="20.6" cy="28" r="1.1" />
          <circle cx="43.4" cy="28" r="1.1" />
        </g>
        <circle cx="32" cy="28" r="2.3" fill="#e8b45c" />
        <circle cx="32" cy="28" r="1" fill="#241708" />
      </g>

      {/* Hoa sen */}
      <g>
        <path
          d="M32 47.5 C26.5 47.5 22 44.8 19.8 40.8 C24.8 41.2 28.8 43.4 32 46.8 C35.2 43.4 39.2 41.2 44.2 40.8 C42 44.8 37.5 47.5 32 47.5 Z"
          fill="#c89541"
        />
        <path
          d="M32 47 C28.2 44.9 26 41.9 25.5 38.2 C29.3 39.3 31.2 42.5 32 45.6 C32.8 42.5 34.7 39.3 38.5 38.2 C38 41.9 35.8 44.9 32 47 Z"
          fill="#e8b45c"
        />
        <path
          d="M32 46 C30.2 44.2 29.4 42.1 29.4 39.7 C31 40.8 31.8 42.9 32 45 C32.2 42.9 33 40.8 34.6 39.7 C34.6 42.1 33.8 44.2 32 46 Z"
          fill="#f5deb0"
        />
        {/* Nụ sen giữa */}
        <path d="M32 44.8 C31 43.3 30.6 41.8 30.7 40 C31.5 40.9 31.9 42.3 32 43.7 C32.1 42.3 32.5 40.9 33.3 40 C33.4 41.8 33 43.3 32 44.8 Z" fill="#fff8e7" />
      </g>
    </svg>
  );
}
