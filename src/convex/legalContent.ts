/* ------------------------------------------------------------------ */
/* NỘI DUNG ĐIỀU KHOẢN & CHÍNH SÁCH — MỘT NGUỒN DUY NHẤT (mã nguồn)     */
/*                                                                      */
/* Cách cập nhật: sửa nội dung bên dưới, tăng LEGAL_DOC_VERSION, rồi    */
/* deploy/publish. Cron hằng ngày (src/convex/crons.ts) tự so sánh và   */
/* ghi bản mới lên máy chủ (bảng appMeta) — mọi thiết bị nhận bản mới   */
/* ngay nhờ query reactive, không cần phát hành bản app mới.            */
/* Client KHÔNG THỂ ghi đè nội dung này (chỉ mã nguồn mới quyết định).  */
/* ------------------------------------------------------------------ */

export const LEGAL_DOC_VERSION = "2.0.0";

export type LegalDocKey = "privacy-policy" | "terms-of-service";

export type LegalDoc = {
  key: LegalDocKey;
  version: string;
  content: string;
};

const PRIVACY_CONTENT = `CHÍNH SÁCH QUYỀN RIÊNG TƯ — Phiên bản 2.0.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. THÔNG TIN CHÚNG TÔI THU THẬP
• Nội dung bạn nhập: câu hỏi, tin nhắn, ảnh bạn gửi cho trợ lý. Khi đăng nhập: lưu trên máy chủ để đồng bộ. Khi chưa đăng nhập: chỉ lưu trên thiết bị của bạn, mã hóa AES-256-GCM, không gửi đi đâu khác.
• Mã thiết bị: chuỗi ngẫu nhiên sinh trên thiết bị (không phải thông tin cá nhân), dùng chống lạm dụng.
• Góp ý/báo lỗi: nội dung, email (nếu bạn tự điền), tên thiết bị và hệ điều hành.
• Không thu thập: danh bạ, vị trí, số điện thoại, dữ liệu sinh trắc học. Không theo dõi quảng cáo. Không bán dữ liệu.

2. MỤC ĐÍCH & CƠ SỞ XỬ LÝ
Xử lý để: vận hành trợ lý AI, lưu hội thoại theo yêu cầu của bạn, hỗ trợ kỹ thuật, chống lạm dụng hệ thống. Chúng tôi xử lý trên cơ sở sự đồng ý của bạn khi sử dụng ứng dụng; bạn có thể rút sự đồng ý bằng cách ngừng sử dụng và xóa dữ liệu trong ứng dụng.

3. CHIA SẺ VỚI BÊN THỨ BA
Chỉ chia sẻ nội dung câu hỏi cho nhà cung cấp AI (Google Gemini / Groq) để tạo câu trả lời, qua kết nối mã hóa TLS. Các bên này xử lý theo chính sách riêng của họ. Không chia sẻ dữ liệu cho mục đích quảng cáo hay tiếp thị.

4. LƯU TRỮ & BẢO MẬT
• Kết nối HTTPS/TLS toàn bộ; khóa API AI chỉ tồn tại trên máy chủ.
• Lịch sử trên thiết bị được mã hóa AES-256-GCM.
• Máy chủ (Convex) do nền tảng vận hành với kiểm soát truy cập và mã hóa dữ liệu.
• Chống lạm dụng: phát hiện môi trường tự động hóa/thiết bị bị can thiệp, giới hạn tần suất.

5. THỜI GIAN LƯU TRỮ
Lịch sử hội thoại lưu cho đến khi bạn xóa (xóa hội thoại trong ứng dụng hoặc "Đặt lại ứng dụng"). Góp ý/báo lỗi lưu tối đa 12 tháng để xử lý rồi xóa ẩn danh.

6. QUYỀN CỦA BẠN (theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân)
Bạn có quyền: biết, tiếp cận, sửa, xóa, rút sự đồng ý, phản đối xử lý dữ liệu của mình. Thực hiện ngay trong ứng dụng: xóa hội thoại; Cài đặt → "Đặt lại ứng dụng" xóa toàn bộ dữ liệu trên thiết bị; Góp ý & Báo lỗi để yêu cầu xóa dữ liệu máy chủ. Chúng tôi phản hồi trong vòng 72 giờ.

7. TRẺ EM
Ứng dụng không dành cho trẻ dưới 13 tuổi và không cố ý thu thập dữ liệu trẻ em. Phụ huynh phát hiện con mình cung cấp dữ liệu vui lòng liên hệ để chúng tôi xóa.

8. CẬP NHẬT CHÍNH SÁCH
Chúng tôi có thể cập nhật chính sách; phiên bản mới hiển thị ngay trong ứng dụng (Cài đặt → Chính sách & Điều khoản) kèm ngày hiệu lực. Tiếp tục sử dụng sau cập nhật nghĩa là bạn chấp nhận bản mới.

9. LIÊN HỆ
Hứa Tiến Dương — qua Cài đặt → Góp ý & Báo lỗi trong ứng dụng.`;

const TERMS_CONTENT = `ĐIỀU KHOẢN SỬ DỤNG — Phiên bản 2.0.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. CHẤP NHẬN
Sử dụng ứng dụng nghĩa là bạn đồng ý với điều khoản này. Không đồng ý — vui lòng ngừng sử dụng và xóa dữ liệu trong ứng dụng.

2. DỊCH VỤ
Trợ lý trò chuyện về Phật pháp theo truyền thống Theravāda, mở rộng cho toàn bộ nội dung liên quan đến Phật giáo và Phật pháp, bằng tiếng Việt, do AI tạo câu trả lời. Dịch vụ cung cấp miễn phí; một số tính năng yêu cầu đăng nhập.

3. SỬ DỤNG ĐÚNG MỰC
Bạn cam kết không: can thiệp, reverse-engineer, dịch ngược mã nguồn; dùng bot/tự động hóa truy cập hệ thống; lạm dụng tài nguyên (đốt hạn mức, từ chối dịch vụ); tạo nội dung vi phạm pháp luật, xúc phạm tôn giáo, người khác. Vi phạm có thể bị khóa truy cập thiết bị mà không báo trước, và buộc bạn chịu trách nhiệm theo pháp luật.

4. NỘI DUNG AI
Câu trả lời do AI tạo, có thể sai hoặc thiếu chính xác kể cả về Phật học — cần đối chiếu Kinh tạng Pāli và hỏi thầy giảng trước khi áp dụng thực hành. Trợ lý KHÔNG thay thế thầy giảng, người hướng dẫn thiền, bác sĩ, chuyên gia tâm lý; không đưa chẩn đoán y khoa. Khi khủng hoảng tâm lý, hãy liên hệ chuyên môn hoặc đường dây nóng hỗ trợ. Bạn tự chịu trách nhiệm khi dựa vào nội dung ứng dụng.

5. TÀI SẢN TRÍ TUỆ
Giao diện, mã nguồn, thương hiệu thuộc nhà phát triển. Kinh điển và giáo lý là tài sản chung. Bạn giữ quyền đối với nội dung mình nhập; trao cho chúng tôi quyền cần thiết để vận hành dịch vụ (lưu, xử lý, hiển thị).

6. MIỄN TRỪ TRÁCH NHIỆM
Dịch vụ cung cấp "nguyên trạng". Chúng tôi không bảo đảm dịch vụ liên tục không gián đoạn và không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng nội dung AI. Pháp luật không cho phép loại trừ một số trách nhiệm thì giới hạn ở mức tối đa cho phép.

7. TẠM NGƯNG & CHẤM DỨT
Chúng tôi có thể tạm ngừng để bảo trì, cập nhật hoặc vì lý do khách quan; khóa tài khoản/thiết bị vi phạm điều khoản. Bạn có thể ngừng sử dụng bất kỳ lúc nào và xóa dữ liệu trong ứng dụng.

8. THAY ĐỔI ĐIỀU KHOẢN
Có thể cập nhật theo thời gian; bản mới hiển thị trong ứng dụng kèm ngày hiệu lực. Tiếp tục sử dụng sau cập nhật là chấp nhận bản mới.

9. LUẬT ÁP DỤNG
Điều khoản tuân theo pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam, bao gồm Bộ luật Dân sự, Luật An ninh mạng 2018 và các văn bản liên quan. Tranh chấp ưu tiên giải quyết bằng thương lượng; bất thành thì tại cơ quan có thẩm quyền theo pháp luật Việt Nam.

10. LIÊN HỆ
Hứa Tiến Dương — qua Cài đặt → Góp ý & Báo lỗi trong ứng dụng.`;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    key: "privacy-policy",
    version: LEGAL_DOC_VERSION,
    content: PRIVACY_CONTENT,
  },
  {
    key: "terms-of-service",
    version: LEGAL_DOC_VERSION,
    content: TERMS_CONTENT,
  },
];
