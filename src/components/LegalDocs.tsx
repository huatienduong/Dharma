import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { FileText, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type LegalKey = "privacy-policy" | "terms-of-service";

type LegalMeta = {
  latestVersion?: string;
  releaseNotes?: string;
  releasedAt?: number;
} | null | undefined;

/** Bản mặc định — khớp mã nguồn thực tế (v4.2.0). Server ghi đè khi cập nhật. */
const DEFAULT_PRIVACY = `**CHÍNH SÁCH QUYỀN RIÊNG TƯ**
Phiên bản 1.0.0 · Áp dụng từ 25/09/2026 · Ứng dụng: Trợ lý Phật học (v4.2.0)

1. DỮ LIỆU ỨNG DỤNG THU THẬP
• Nội dung hội thoại: khi bạn đăng nhập, hội thoại được lưu trên máy chủ để đồng bộ; khi chưa đăng nhập, hội thoại CHỈ được lưu trên thiết bị của bạn, được mã hóa AES-256-GCM trước khi ghi và không gửi đi đâu khác.
• Dữ liệu thiết bị kỹ thuật: mã thiết bị ngẫu nhiên (không phải thông tin cá nhân) dùng để chống lạm dụng và giới hạn tần suất.
• Góp ý / báo lỗi: nội dung bạn gửi, email (tùy chọn, nếu bạn tự điền) và thông tin thiết bị/hệ điều hành.

2. DỮ LIỆU KHÔNG THU THẬP
Ứng dụng không thu thập danh bạ, vị trí, ảnh/video ngoài ảnh bạn chủ động gửi cho trợ lý, không bán dữ liệu cho bên thứ ba, không chạy quảng cáo theo dõi.

3. XỬ LÝ BẰNG AI
Câu hỏi của bạn được máy chủ ứng dụng chuyển đến nhà cung cấp AI (Google Gemini) để tạo câu trả lời. Khóa API chỉ tồn tại trên máy chủ — ứng dụng không bao giờ gửi khóa cho thiết bị của bạn.

4. BẢO MẬT
• Toàn bộ kết nối dùng HTTPS/TLS.
• Lịch sử lưu trên thiết bị được mã hóa AES-256-GCM.
• Chống lạm dụng: phát hiện môi trường tự động hóa/công cụ can thiệp, giới hạn tần suất theo thiết bị ở máy chủ.
• Cơ sở dữ liệu Convex do nền tảng vận hành với kiểm soát truy cập chặt.

5. QUYỀN CỦA BẠN
Bạn có thể xóa toàn bộ hội thoại trong ứng dụng ("xóa hội thoại") hoặc xóa mọi dữ liệu cục bộ qua Cài đặt → "Đặt lại ứng dụng". Sau khi xóa, dữ liệu không thể khôi phục.

6. LIÊN HỆ
Nhà phát triển: Hứa Tiến Dương. Mọi thắc mắc về quyền riêng tư gửi qua Cài đặt → Góp ý & Báo lỗi.`;

const DEFAULT_TERMS = `**ĐIỀU KHOẢN SỬ DỤNG**
Phiên bản 1.0.0 · Áp dụng từ 25/09/2026 · Ứng dụng: Trợ lý Phật học (v4.2.0)

1. CHẤP NHẬN ĐIỀU KHOẢN
Khi sử dụng Trợ lý Phật học, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng ứng dụng.

2. MỤC ĐÍCH SỬ DỤNG
Ứng dụng là trợ lý trò chuyện về Phật pháp theo truyền thống Theravāda và các nội dung liên quan đến Phật giáo. Trợ lý là công cụ tham khảo, KHÔNG thay thế thầy giảng, người hướng dẫn thiền, bác sĩ hay chuyên gia tâm lý.

3. SỬ DỤNG ĐÚNG MỚC
Bạn không được: can thiệp, reverse-engineer, tự động hóa (bot) truy cập hệ thống; dùng ứng dụng để tạo nội dung vi phạm pháp luật, xúc phạm tôn giáo khác hoặc gây hại cho người khác; cố tình lạm dụng tài nguyên (đốt hạn mức, tấn công từ chối dịch vụ). Việc làm trái điều khoản có thể bị khóa truy cập thiết bị.

4. NỘI DUNG AI
Câu trả lời do AI tạo ra có thể sai hoặc thiếu chính xác, kể cả về Phật học. Hãy đối chiếu với Kinh tạng Pāli và hỏi thầy giảng trước khi áp dụng vào thực hành. Bạn tự chịu trách nhiệm khi dựa vào nội dung ứng dụng.

5. TÀI SẢN TRÍ TUỆ
Giao diện, mã nguồn và thương hiệu ứng dụng thuộc về nhà phát triển. Kinh điển và giáo lý Phật pháp là tài sản chung của nhân loại.

6. THAY ĐỔI & PHÁP LỆ
Chúng tôi có thể cập nhật điều khoản theo thời gian; bản mới hiển thị ngay trong ứng dụng. Việc tiếp tục sử dụng sau cập nhật được coi là chấp nhận. Điều khoản tuân theo pháp luật Việt Nam.

7. LIÊN HỆ
Nhà phát triển: Hứa Tiến Dương. Góp ý qua Cài đặt → Góp ý & Báo lỗi.`;

const DOCS: { key: LegalKey; label: string; icon: typeof FileText; fallback: string }[] = [
  { key: "privacy-policy", label: "Quyền riêng tư", icon: FileText, fallback: DEFAULT_PRIVACY },
  { key: "terms-of-service", label: "Điều khoản", icon: Scale, fallback: DEFAULT_TERMS },
];

/** Hiển thị text đơn giản: **đậm** thành <strong>, xuống dòng giữ nguyên. */
function LegalText({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed text-foreground/90">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="whitespace-pre-wrap">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-bold text-foreground">
                  {part}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function LegalDocs() {
  const [tab, setTab] = useState<LegalKey>("privacy-policy");
  const privacy = useQuery(api.library.getLegalDoc, { key: "privacy-policy" });
  const terms = useQuery(api.library.getLegalDoc, { key: "terms-of-service" });

  const metaFor = (key: LegalKey): LegalMeta =>
    key === "privacy-policy" ? privacy : terms;

  const active = DOCS.find((d) => d.key === tab)!;
  const meta = metaFor(tab);
  const content = meta?.releaseNotes?.trim() ? meta.releaseNotes : active.fallback;

  return (
    <div className="space-y-3 pt-1">
      {/* Chọn tài liệu */}
      <div className="grid grid-cols-2 gap-2">
        {DOCS.map((d) => {
          const Icon = d.icon;
          const isActive = d.key === tab;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setTab(d.key)}
              aria-pressed={isActive}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Phiên bản tài liệu */}
      <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-2.5">
        <p className="text-xs font-semibold">Phiên bản tài liệu</p>
        <p className="text-xs text-muted-foreground">
          {meta?.latestVersion ?? "1.0.0 (mặc định)"}
        </p>
      </div>

      {/* Nội dung */}
      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-4">
        <LegalText text={content} />
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Nội dung được tải trực tiếp từ máy chủ — khi nhà phát triển cập nhật
        chính sách, bản mới nhất hiển thị tại đây mà không cần cập nhật ứng dụng.
      </p>
    </div>
  );
}
