import { cn } from "@/lib/utils";

/**
 * LOGO DHARMA — dựng lại KHỚP 100% ảnh logo chính thức người dùng tải lên:
 * nền đen vuông, vòng tròn nền kem, lá bồ đề nâu, bánh xe Chuyển pháp luân
 * VÀNG 6 nan hoa (8 chóp nhô), 2 bảo tháp hai bên, hoa sen 3 tầng dưới chân,
 * chữ DHARMA + Giới - Định - Tuệ phía dưới. KHÔNG thay đổi thiết kế.
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
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Dharma — Giới - Định - Tuệ"
    >
      {/* Nền đen (ảnh gốc nền đen toàn khung) */}
      <rect width="100" height="100" rx="14" fill="#0a0805" />

      {/* Vòng tròn nền kem (khung chính) */}
      <circle cx="50" cy="44" r="37" fill="#faf3e0" />
      {/* Vòng viền nâu đậm quanh vòng kem */}
      <circle cx="50" cy="44" r="37" fill="none" stroke="#2e1d0c" strokeWidth="2.4" />

      {/* Lá bồ đề (nâu sẫm, ôm bánh xe) */}
      <path
        d="M50 12.5 C63 17 68.5 28 66 38.5 C64 46.5 57.5 51.5 50 53 C42.5 51.5 36 46.5 34 38.5 C31.5 28 37 17 50 12.5 Z"
        fill="#5c3a1e"
      />
      {/* Gân lá giữa */}
      <path d="M50 14 L50 52" stroke="#e8b45c" strokeWidth="1.1" opacity="0.55" />
      {/* Gân lá chéo */}
      <g stroke="#e8b45c" strokeWidth="0.7" opacity="0.32" fill="none">
        <path d="M50 22 L42.5 18.5 M50 22 L57.5 18.5" />
        <path d="M50 30 L40 25.5 M50 30 L60 25.5" />
        <path d="M50 38 L39.5 33.5 M50 38 L60.5 33.5" />
        <path d="M50 46 L41 42 M50 46 L59 42" />
      </g>

      {/* Hai bảo tháp (nâu đậm, hai bên lá) */}
      <g fill="#5c3a1e">
        {/* Tháp trái */}
        <path d="M17.5 57 L20.5 57 L21.2 49.5 L21.8 49.5 L21.8 43.5 L22.4 43.5 L22.4 37.5 L23 37.5 L23.6 43.5 L24.2 43.5 L24.2 49.5 L24.8 49.5 L25.5 57 L28 57 L28 65 L17.5 65 Z" />
        {/* Tháp phải */}
        <path d="M72 57 L75 57 L75.7 49.5 L76.3 49.5 L76.3 43.5 L76.9 43.5 L76.9 37.5 L77.5 37.5 L78.1 43.5 L78.7 43.5 L78.7 49.5 L79.3 49.5 L80 57 L82.5 57 L82.5 65 L72 65 Z" />
      </g>

      {/* Bánh xe Chuyển pháp luân VÀNG — 6 nan hoa, 8 chóp nhô */}
      <g>
        {/* Vành ngoài đậm */}
        <circle cx="50" cy="33" r="14.6" fill="none" stroke="#b8842b" strokeWidth="3.4" />
        {/* Vành ngoài sáng */}
        <circle cx="50" cy="33" r="14.6" fill="none" stroke="#e8b45c" strokeWidth="2" />
        {/* Vành trong mảnh */}
        <circle cx="50" cy="33" r="11" fill="none" stroke="#e8b45c" strokeWidth="1" opacity="0.65" />
        {/* 6 nan hoa (cách nhau 60°) với đầu trụ như ảnh gốc */}
        <g stroke="#e8b45c" strokeWidth="2.1" strokeLinecap="round">
          <line x1="50" y1="20.5" x2="50" y2="45.5" />
          <line x1="50" y1="20.5" x2="50" y2="45.5" transform="rotate(60 50 33)" />
          <line x1="50" y1="20.5" x2="50" y2="45.5" transform="rotate(120 50 33)" />
        </g>
        {/* Đầu nan trụ (viên nhỏ trên mỗi nan, như ảnh gốc) */}
        <g fill="#e8b45c" stroke="#b8842b" strokeWidth="0.4">
          <circle cx="50" cy="26" r="1.5" />
          <circle cx="50" cy="40" r="1.5" />
          <circle cx="37.9" cy="29.5" r="1.5" />
          <circle cx="62.1" cy="29.5" r="1.5" />
          <circle cx="37.9" cy="36.5" r="1.5" />
          <circle cx="62.1" cy="36.5" r="1.5" />
        </g>
        {/* 8 chóp tròn nhô ra ngoài vành (như ảnh gốc) */}
        <g fill="#e8b45c" stroke="#b8842b" strokeWidth="0.5">
          <circle cx="50" cy="16.9" r="1.7" />
          <circle cx="60.9" cy="19.9" r="1.7" />
          <circle cx="66.1" cy="33" r="1.7" />
          <circle cx="60.9" cy="46.1" r="1.7" />
          <circle cx="50" cy="49.1" r="1.7" />
          <circle cx="39.1" cy="46.1" r="1.7" />
          <circle cx="33.9" cy="33" r="1.7" />
          <circle cx="39.1" cy="19.9" r="1.7" />
        </g>
        {/* Lõi bánh xe */}
        <circle cx="50" cy="33" r="3.1" fill="#e8b45c" stroke="#b8842b" strokeWidth="0.6" />
        <circle cx="50" cy="33" r="1.2" fill="#8a5f1d" />
      </g>

      {/* Hoa sen 3 tầng dưới chân (như ảnh gốc) */}
      <g>
        {/* Tầng cánh ngoài (nâu) */}
        <path
          d="M50 66 C41 66 34.5 62.2 31.5 56 C38.5 56.6 44 59.5 50 64 C56 59.5 61.5 56.6 68.5 56 C65.5 62.2 59 66 50 66 Z"
          fill="#5c3a1e"
        />
        {/* Tầng cánh giữa (vàng đậm) */}
        <path
          d="M50 65.4 C43.5 63.2 39.8 59.5 38.8 54.2 C43.6 55.4 47.2 58.2 50 61.6 C52.8 58.2 56.4 55.4 61.2 54.2 C60.2 59.5 56.5 63.2 50 65.4 Z"
          fill="#c89541"
        />
        {/* Tầng cánh trong (vàng sáng) */}
        <path
          d="M50 64.6 C46 63 43.7 60.4 43.2 56.9 C46 57.8 48.3 59.6 50 61.8 C51.7 59.6 54 57.8 56.8 56.9 C56.3 60.4 54 63 50 64.6 Z"
          fill="#e8b45c"
        />
        {/* Nụ sen giữa (kem sáng) */}
        <path d="M50 63.6 C48.3 61.9 47.5 60 47.6 57.6 C48.8 58.5 49.6 59.9 50 61.4 C50.4 59.9 51.2 58.5 52.4 57.6 C52.5 60 51.7 61.9 50 63.6 Z" fill="#faf3e0" />
      </g>

      {/* CHỮ DHARMA (chỉ hiển thị khi logo đủ lớn) */}
      <text
        x="50"
        y="78.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="12.5"
        fontWeight="bold"
        letterSpacing="1.5"
        fill="#e8b45c"
      >
        DHARMA
      </text>
      {/* Đường trang trí 2 bên nụ sen nhỏ */}
      <g stroke="#c89541" strokeWidth="0.8" opacity="0.8">
        <line x1="18" y1="82.5" x2="38" y2="82.5" />
        <line x1="62" y1="82.5" x2="82" y2="82.5" />
      </g>
      <circle cx="50" cy="82.5" r="1.4" fill="#e8b45c" />
      {/* Giới - Định - Tuệ */}
      <text
        x="50"
        y="92.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="8.5"
        fontWeight="bold"
        letterSpacing="1"
        fill="#c89541"
      >
        Giới - Định - Tuệ
      </text>
    </svg>
  );
}
