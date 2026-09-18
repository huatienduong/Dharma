import { cn } from "@/lib/utils";

/**
 * Biểu tượng Bát Chánh Đạo (bánh xe Pháp với 8 nan hoa) quay chậm,
 * tâm bánh xe là hoa sen. Dùng làm logo chủ đạo của ứng dụng.
 */
export function DhammaWheel({
  size = 56,
  className,
  title = "Bát Chánh Đạo",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  // 8 nan hoa: mỗi nan hoa là một đường kính, xoay 45° mỗi bước
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="dw-hub" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#f0d9a8" />
          <stop offset="55%" stopColor="#d9a441" />
          <stop offset="100%" stopColor="#a8742a" />
        </radialGradient>
        <linearGradient id="dw-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9c46f" />
          <stop offset="100%" stopColor="#b07f2f" />
        </linearGradient>
      </defs>

      {/* Vành bánh xe */}
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#dw-rim)" strokeWidth="4" />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#b07f2f" strokeWidth="1.4" opacity="0.6" />

      {/* 8 nan hoa Bát Chánh Đạo (quay chậm) */}
      <g className="dw-spin">
        {spokes.map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="9"
            x2="32"
            y2="55"
            stroke="url(#dw-rim)"
            strokeWidth="2.6"
            strokeLinecap="round"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>

      {/* Tâm hoa sen */}
      <g>
        <circle cx="32" cy="32" r="7.5" fill="url(#dw-hub)" />
        <path
          d="M32 26.5c1.6 2 2.4 3.6 2.4 5.5s-.8 3.5-2.4 5.5c-1.6-2-2.4-3.6-2.4-5.5s.8-3.5 2.4-5.5Z"
          fill="#6d4c1f"
        />
        <path
          d="M27.5 29c2.4.4 4 1.3 5 2.7 1 1.4 1.3 3.2 1.2 5.3-2.1-.5-3.7-1.4-4.7-2.8-1-1.4-1.5-3.2-1.5-5.2Z"
          fill="#6d4c1f"
          opacity="0.75"
        />
        <path
          d="M36.5 29c-2.4.4-4 1.3-5 2.7-1 1.4-1.3 3.2-1.2 5.3 2.1-.5 3.7-1.4 4.7-2.8 1-1.4 1.5-3.2 1.5-5.2Z"
          fill="#6d4c1f"
          opacity="0.75"
        />
      </g>
    </svg>
  );
}
