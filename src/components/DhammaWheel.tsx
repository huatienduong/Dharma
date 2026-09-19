import { cn } from "@/lib/utils";

/**
 * Bánh xe Chuyển pháp luân (Dharmachakra): bánh xe Pháp với 8 nan hoa,
 * 2 vành kép, tâm hoa sen 8 cánh, quay chậm liên tục.
 */
export function DhammaWheel({
  size = 56,
  className,
  title = "Bánh xe Chuyển pháp luân",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  // 8 nan hoa: xoay 45° mỗi bước, mỗi nan hơi cong nhẹ
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="dhw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0c96f" />
          <stop offset="55%" stopColor="#d9a441" />
          <stop offset="100%" stopColor="#a97e2e" />
        </linearGradient>
      </defs>
      <g
        className="dw-spin"
        style={{ transformOrigin: "32px 32px" }}
        stroke="url(#dhw-gold)"
        fill="none"
        strokeLinecap="round"
      >
        {/* Vành ngoài + vành trong (2 vành kép) */}
        <circle cx="32" cy="32" r="27" strokeWidth="3" />
        <circle cx="32" cy="32" r="21.5" strokeWidth="1.4" opacity="0.75" />
        {/* 8 nan hoa */}
        <g strokeWidth="2.6">
          {spokes.map((deg) => (
            <g key={deg} transform={`rotate(${deg} 32 32)`}>
              <line x1="32" y1="9.5" x2="32" y2="21.5" />
              <line x1="32" y1="42.5" x2="32" y2="54.5" />
            </g>
          ))}
        </g>
      </g>
      {/* Tâm hoa sen 8 cánh */}
      <g fill="url(#dhw-gold)">
        {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
          <ellipse
            key={deg}
            cx="32"
            cy="26.5"
            rx="2.6"
            ry="5"
            opacity="0.95"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="3.2" fill="#5b4423" />
      <circle cx="32" cy="32" r="3.2" fill="none" stroke="url(#dhw-gold)" strokeWidth="1.2" />
    </svg>
  );
}
