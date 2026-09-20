import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Logo bánh xe Chuyển pháp luân (Dharmachakra) — TỰ NẠP hình thật từ internet
 * (Wikipedia Dharmachakra — không cần khóa, có cache). Fallback là SVG vẽ sẵn
 * 8 nan hoa nếu không tải được mạng. LOGO TĨNH — không quay.
 */

const WHEEL_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Dharma_Wheel.svg/240px-Dharma_Wheel.svg.png";

let cachedUrl: string | null | undefined = undefined;

function FallbackWheel({ size }: { size: number }) {
  // 8 nan hoa: mỗi nan hoa là một đường kính, xoay 45° mỗi bước
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      role="img"
      aria-label="Bánh xe Chuyển pháp luân"
    >
      <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        {spokes.map((deg) => (
          <line
            key={deg}
            x1="32"
            y1="12"
            x2="32"
            y2="52"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function DhammaWheel({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null | undefined>(cachedUrl);

  useEffect(() => {
    if (cachedUrl !== undefined) {
      setSrc(cachedUrl);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      cachedUrl = WHEEL_URL;
      setSrc(WHEEL_URL);
    };
    img.onerror = () => {
      if (cancelled) return;
      cachedUrl = null;
      setSrc(null);
    };
    img.src = WHEEL_URL;
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {src === undefined ? (
        <FallbackWheel size={size} />
      ) : src ? (
        <img
          src={src}
          alt="Bánh xe Chuyển pháp luân"
          width={size}
          height={size}
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="text-gold">
          <FallbackWheel size={size} />
        </span>
      )}
    </span>
  );
}
