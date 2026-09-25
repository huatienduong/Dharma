/* ------------------------------------------------------------------ */
/* NỘI DUNG ĐIỀU KHOẢN & CHÍNH SÁCH — MỘT NGUỒN DUY NHẤT (mã nguồn)     */
/*                                                                      */
/* Cách cập nhật: sửa nội dung bên dưới, tăng LEGAL_DOC_VERSION, rồi    */
/* deploy/publish. Cron hằng ngày (src/convex/crons.ts) tự so sánh và   */
/* ghi bản mới lên máy chủ (bảng appMeta) — mọi thiết bị nhận bản mới   */
/* ngay nhờ query reactive, không cần phát hành bản app mới.            */
/* Client KHÔNG THỂ ghi đè nội dung này (chỉ mã nguồn mới quyết định).  */
/* ------------------------------------------------------------------ */

export const LEGAL_DOC_VERSION = "2.1.0";

export type LegalDocKey = "privacy-policy" | "terms-of-service";

export type LegalDoc = {
  key: LegalDocKey;
  version: string;
  content: string;
};

const PRIVACY_CONTENT = `CHÍNH SÁCH QUYỀN RIÊNG TƯ — Phiên bản 2.1.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. THÔNG TIN CHÚNG TÔI THU THẬP
• Nội dung bạn nhập: câu hỏi, tin nhắn và hình ảnh bạn gửi trong ứng dụng. Khi đăng nhập, nội dung được lưu để đồng bộ giữa các thiết bị. Khi chưa đăng nhập, nội dung chỉ được lưu trên thiết bị của bạn.
• Thông tin tài khoản: dữ liệu cần thiết để bạn đăng nhập và tiếp tục sử dụng ứng dụng.
• Mã thiết bị: chuỗi ngẫu nhiên sinh trên thiết bị, dùng để bảo vệ ứng dụng khỏi truy cập trái phép.
• Góp ý và báo lỗi: nội dung bạn gửi, email nếu bạn tự điền, tên thiết bị và hệ điều hành.
• Không thu thập danh bạ, vị trí, số điện thoại hoặc dữ liệu sinh trắc học. Không sử dụng dữ liệu cho quảng cáo và không bán dữ liệu.

2. MỤC ĐÍCH XỬ LÝ
Chúng tôi sử dụng thông tin để vận hành ứng dụng, lưu hội thoại theo yêu cầu của bạn, hỗ trợ kỹ thuật, bảo vệ tài khoản và ngăn chặn sử dụng trái phép. Việc sử dụng ứng dụng đồng nghĩa với việc bạn đồng ý với mục đích sử dụng dữ liệu nêu trên.

3. LƯU TRỮ VÀ BẢO MẬT
• Kết nối truyền dữ liệu được bảo vệ bằng cơ chế mã hóa.
• Lịch sử lưu trên thiết bị được mã hóa.
• Quyền truy cập dữ liệu được kiểm soát và chỉ cấp cho người có nhiệm vụ phù hợp.
• Áp dụng biện pháp giới hạn truy cập và ngăn chặn lạm dụng để bảo vệ tính ổn định của ứng dụng.

4. THỜI GIAN LƯU TRỮ
• Lịch sử hội thoại được lưu cho đến khi bạn thu hồi nội dung hoặc thực hiện chức năng đặt lại ứng dụng.
• Nội dung góp ý và báo lỗi được giữ tối đa 12 tháng để xử lý, sau đó xóa hoặc ẩn danh.
• Thông tin tài khoản được giữ trong thời gian cần thiết để duy trì hoạt động của ứng dụng.

5. QUYỀN CỦA BẠN
Bạn có quyền biết, tiếp cận, sửa, xóa dữ liệu của mình, rút sự đồng ý và phản đối việc xử lý dữ liệu. Bạn có thể thực hiện một phần các quyền này ngay trong ứng dụng hoặc gửi yêu cầu qua mục Góp ý và Báo lỗi. Chúng tôi sẽ phản hồi trong thời gian hợp lý.

6. TRẺ EM
Ứng dụng không dành cho trẻ dưới 13 tuổi và không cố ý thu thập dữ liệu của trẻ em. Nếu phát hiện trẻ em đã cung cấp dữ liệu, vui lòng liên hệ để được hỗ trợ xóa dữ liệu.

7. CẬP NHẬT CHÍNH SÁCH
Chúng tôi có thể cập nhật chính sách khi cần thiết. Phiên bản mới sẽ hiển thị tại Cài đặt → Chính sách và Điều khoản, kèm ngày hiệu lực. Việc tiếp tục sử dụng sau khi cập nhật nghĩa là bạn chấp nhận bản mới.

8. LIÊN HỆ
Hứa Tiến Dương — qua Cài đặt → Góp ý và Báo lỗi trong ứng dụng.`;

const TERMS_CONTENT = `ĐIỀU KHOẢN SỬ DỤNG — Phiên bản 2.1.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. CHẤP NHẬN
Sử dụng ứng dụng nghĩa là bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng ứng dụng.

2. PHẠM VI DỊCH VỤ
Ứng dụng cung cấp nội dung hỗ trợ tìm hiểu Phật pháp theo truyền thống Theravāda, trình bày bằng tiếng Việt. Một số chức năng có thể yêu cầu đăng nhập để lưu và đồng bộ tiến trình.

3. SỬ DỤNG ĐÚNG MỰC
Bạn không được can thiệp hệ thống, dịch ngược mã nguồn, dùng phương tiện tự động để truy cập trái phép, gây gián đoạn dịch vụ hoặc gửi nội dung vi phạm pháp luật. Vi phạm điều khoản có thể dẫn đến việc giới hạn hoặc khóa truy cập thiết bị.

4. NỘI DUNG THAM KHẢO
Nội dung trong ứng dụng có tính chất tham khảo và có thể chưa bao giờ đầy đủ hoặc phù hợp với mọi hoàn cảnh. Khi học Phật, thực hành thiền hoặc áp dụng giáo lý, bạn nên đối chiếu Kinh tạng Pāli và sự chỉ dạy của thầy giảng có uy tín. Ứng dụng không thay thế thầy giảng, người hướng dẫn thiền, bác sĩ hoặc chuyên gia tâm lý.

5. TÀI SẢN TRÍ TUỆ
Giao diện, mã nguồn và thương hiệu của ứng dụng thuộc quyền sở hữu của nhà phát triển. Kinh điển và giáo lý là tài sản chung. Bạn giữ quyền đối với nội dung mình nhập và cho phép ứng dụng lưu, xử lý, hiển thị nội dung đó khi cần thiết.

6. GIỚI HẠN TRÁCH NHIỆM
Ứng dụng được cung cấp trên cơ sở nguyên trạng. Chúng tôi không bảo đảm dịch vụ luôn liên tục, không gián đoạn hoặc không có lỗi. Mọi trách nhiệm không thể loại trừ theo pháp luật được giới hạn ở mức tối đa pháp luật cho phép.

7. TẠM NGƯNG VÀ CHẤM DỨT
Chúng tôi có thể tạm ngừng hoặc thay đổi chức năng để bảo trì, nâng cấp và bảo đảm an toàn. Bạn có thể ngừng sử dụng ứng dụng bất cứ lúc nào.

8. THAY ĐỔI ĐIỀU KHOẢN
Các điều khoản có thể được cập nhật theo thời gian. Bản mới sẽ hiển thị trong ứng dụng kèm ngày hiệu lực. Việc tiếp tục sử dụng sau khi cập nhật nghĩa là bạn chấp nhận bản mới.

9. LUẬT ÁP DỤNG
Điều khoản tuân theo pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Tranh chấp ưu tiên được giải quyết bằng thương lượng; nếu không thành, các bên sẽ thực hiện theo quy định của cơ quan có thẩm quyền tại Việt Nam.

10. LIÊN HỆ
Hứa Tiến Dương — qua Cài đặt → Góp ý và Báo lỗi trong ứng dụng.`;

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
