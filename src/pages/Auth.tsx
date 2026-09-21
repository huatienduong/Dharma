import { MaintenanceNotice } from "@/components/MaintenanceNotice";
import { useNavigate } from "react-router";

/**
 * TÍNH NĂNG ĐĂNG NHẬP / ĐĂNG KÝ TẠM THỜI BỊ KHÓA.
 * Dùng MaintenanceNotice chung — đồng bộ văn bản/giao diện toàn ứng dụng.
 * Không còn logo ứng dụng — chỉ wordmark chữ.
 */
export default function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="fb-bg flex min-h-screen flex-col items-center justify-center gap-7 p-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex flex-col items-center gap-1"
        aria-label="Về trang chủ"
      >
        <span className="text-2xl font-bold uppercase tracking-tight">
          Dharma
        </span>
        <span className="text-xs text-muted-foreground">Giới - Định - Tuệ</span>
      </button>

      <MaintenanceNotice
        variant="page"
        onBack={() => navigate("/")}
        backLabel="Quay lại trang chủ"
      />

      <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
        Bạn vẫn có thể xem Pháp thoại, Kinh tạng, Thiền… như bình thường khi
        chưa đăng nhập.
      </p>
    </div>
  );
}
