import { DhammaWheel } from "@/components/DhammaWheel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench } from "lucide-react";
import { useNavigate } from "react-router";

/**
 * TÍNH NĂNG ĐĂNG NHẬP / ĐĂNG KÝ TẠM THỜI BỊ KHÓA.
 * Hiện thông báo nâng cấp hệ thống thay cho biểu mẫu đăng nhập.
 */
export default function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="fb-bg flex min-h-screen flex-col items-center justify-center p-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="mb-6 flex flex-col items-center gap-2"
        aria-label="Về trang chủ"
      >
        <DhammaWheel size={64} />
        <span className="text-sm font-semibold">Dharma</span>
        <span className="text-xs text-muted-foreground">Giới - Định - Tuệ</span>
      </button>

      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-7 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <Wrench className="h-7 w-7 text-gold" />
        </span>

        <h1 className="mt-4 text-lg font-bold leading-snug">
          Đội ngũ kỹ thuật đang tiến hành nâng cấp hệ thống
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Hiện tại bạn không thể sử dụng tính năng Đăng nhập / Đăng ký cho đến khi
          chúng tôi hoàn thành bản cập nhật mới.
        </p>
        <p className="mt-3 text-sm font-medium text-gold">
          Xin lỗi vì sự bất tiện này đã gây ra cho bạn!
        </p>

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mt-6 w-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Button>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Bạn vẫn có thể xem Pháp thoại, Kinh tạng, Thiền… như bình thường khi
        chưa đăng nhập.
      </p>
    </div>
  );
}
