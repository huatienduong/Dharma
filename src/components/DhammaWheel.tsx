import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Bánh xe Chuyển pháp luân (Dharmachakra):
 * - Vành ngoài + vành trong kép
 * - 8 nan hoa (4 đường kính) nối vành trong vào tâm
 * - Tâm là đĩa vàng với hoa sen 8 cánh
 * Quay chậm liên tục (class dw-spin trong index.css).
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
  // ID gradient duy nhất theo từng instance — tránh trùng khi có nhiều logo
  const uid = useId();
  const gid = `dhw-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;

  // 4 đường kính (xoay 45° mỗi bước) = 8 nan hoa
  const diameters = [0, 45, 90, 135];

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
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0c96f" />
          <stop offset="55%" stopColor="#d9a441" />
          <stop offset="100%" stopColor="#a97e2e" />
        </linearGradient>
      </defs>

      {/* Bánh xe quay: vành kép + nan hoa nối liền vành → tâm */}
      <g
        className="dw-spin"
        style={{ transformOrigin: "32px 32px" }}
        stroke={`url(#${gid})`}
        fill="none"
        strokeLinecap="round"
      >
        <circle cx="32" cy="32" r="27" strokeWidth="3" />
        <circle cx="32" cy="32" r="22" strokeWidth="1.4" opacity="0.8" />
        <g strokeWidth="2.4">
          {diameters.map((deg) => (
            <g key={deg} transform={`rotate(${deg} 32 32)`}>
              <line x1="32" y1="6.5" x2="32" y2="57.5" />
            </g>
          ))}
        </g>
      </g>

      {/* Tâm: đĩa vàng + hoa sen 8 cánh nâu */}
      <circle cx="32" cy="32" r="7.5" fill={`url(#${gid})`} />
      <g fill="#5b4423">
        {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
          <ellipse
            key={deg}
            cx="32"
            cy="28.8"
            rx="1.7"
            ry="3.4"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="1.4" fill={`url(#${gid})`} />
    </svg>
  );
}
