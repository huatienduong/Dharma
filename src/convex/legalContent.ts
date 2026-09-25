/* ------------------------------------------------------------------ */
/* NỘI DUNG ĐIỀU KHOẢN & CHÍNH SÁCH — MỘT NGUỒN DUY NHẤT (mã nguồn)     */
/*                                                                      */
/* Cách cập nhật: sửa nội dung bên dưới, tăng LEGAL_DOC_VERSION, rồi    */
/* deploy/publish. Cron hằng ngày (src/convex/crons.ts) tự so sánh và   */
/* ghi bản mới lên máy chủ (bảng appMeta) — mọi thiết bị nhận bản mới   */
/* ngay nhờ query reactive, không cần phát hành bản app mới.            */
/* Client KHÔNG THỂ ghi đè nội dung này (chỉ mã nguồn mới quyết định).  */
/* ------------------------------------------------------------------ */

export const LEGAL_DOC_VERSION = "2.2.0";

export type LegalDocKey = "privacy-policy" | "terms-of-service";

export type LegalDoc = {
  key: LegalDocKey;
  version: string;
  content: string;
};

const PRIVACY_CONTENT = `CHÍNH SÁCH QUYỀN RIÊNG TƯ — Phiên bản 2.2.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. CAM KẾT VỀ NỘI DUNG TRÒ CHUYỆN
• Ứng dụng tôn trọng quyền riêng tư của người dùng. Nội dung trò chuyện chỉ được xử lý ở mức cần thiết để thực hiện chức năng mà bạn yêu cầu, lưu và khôi phục lịch sử, bảo vệ tài khoản và bảo đảm an toàn.
• Ứng dụng không chủ động theo dõi, xem xét, đánh giá, chỉnh sửa, tiết lộ hoặc can thiệp vào nội dung riêng tư của bạn. Nhà phát triển không sử dụng lịch sử trò chuyện để theo dõi, giám sát, quảng cáo, định danh, bán dữ liệu hoặc mục đích không liên quan.
• Khi bạn chủ động sử dụng chức năng trò chuyện, nội dung có thể được hệ thống xử lý tự động trong thời gian ngắn để tạo phản hồi phù hợp. Không có giao diện cho phép nhà phát triển mở và xem lại lịch sử trò chuyện của người dùng.
• Người dùng luôn kiểm soát nội dung của mình: có thể thu hồi tin nhắn, xóa lịch sử, tắt hoặc ngừng sử dụng tính năng trò chuyện bất cứ lúc nào.

2. THÔNG TIN ĐƯỢC XỬ LÝ
• Nội dung bạn chủ động gửi: câu hỏi, tin nhắn, hình ảnh và nội dung tra cứu trong ứng dụng.
• Thông tin tài khoản và thiết bị cần thiết để đăng nhập, đồng bộ tiến trình, bảo vệ ứng dụng và ngăn chặn truy cập trái phép.
• Nội dung góp ý, báo lỗi và thông tin liên hệ mà bạn chủ động cung cấp.
• Ứng dụng không thu thập danh bạ, vị trí, số điện thoại hay dữ liệu sinh trắc học.

3. MÃ HÓA VÀ BẢO VỆ DỮ LIỆU
• Lịch sử trò chuyện lưu trên thiết bị được mã hóa toàn bộ bằng cơ chế mã hóa mạnh; khóa giải mã được quản lý riêng và không được ghi công khai vào mã nguồn.
• Dữ liệu truyền giữa thiết bị và máy chủ được bảo vệ bằng kết nối mã hóa HTTPS/TLS trong quá trình truyền.
• Quyền truy cập dữ liệu được giới hạn theo chức năng cần thiết, kiểm soát bằng cơ chế xác thực và phân quyền.
• Ứng dụng áp dụng các biện pháp hợp lý để ngăn chặn truy cập trái phép, lạm dụng và mất an toàn dữ liệu. Tuy nhiên, không một biện pháp bảo mật nào có thể thay thế hoàn toàn trách nhiệm bảo vệ thiết bị của người dùng.

4. MỤC ĐÍCH SỬ DỤNG
Chúng tôi chỉ sử dụng dữ liệu để cung cấp ứng dụng, duy trì và khôi phục tiến trình, hỗ trợ kỹ thuật, bảo vệ tài khoản, ngăn lạm dụng và thực hiện các nghĩa vụ pháp lý phù hợp. Không sử dụng dữ liệu trò chuyện cho quảng cáo hoặc bán cho bên khác.

5. THỜI GIAN LƯU TRỮ
• Lịch sử trò chuyện được lưu cho đến khi bạn thu hồi nội dung, xóa lịch sử, đặt lại ứng dụng hoặc hết thời gian lưu theo thiết bị.
• Nội dung góp ý và báo lỗi được giữ tối đa 12 tháng để xử lý, sau đó xóa hoặc ẩn danh.
• Dữ liệu tài khoản chỉ được giữ trong thời gian cần thiết để duy trì hoạt động và bảo vệ quyền lợi của các bên.

6. QUYỀN CỦA BẠN
Bạn có quyền biết, tiếp cận, sửa, xóa dữ liệu của mình, rút lại sự đồng ý và phản đối việc xử lý dữ liệu. Bạn có thể thực hiện các quyền này ngay trong ứng dụng hoặc gửi yêu cầu qua mục Góp ý và Báo lỗi. Khi yêu cầu được chấp thuận, dữ liệu sẽ bị xóa, ẩn hoặc ngừng xử lý trong phạm vi có thể.

7. TRẺ EM
Ứng dụng không dành cho trẻ dưới 13 tuổi và không cố ý thu thập dữ liệu của trẻ em. Nếu phát hiện trẻ em đã cung cấp dữ liệu, vui lòng liên hệ để được hỗ trợ xóa dữ liệu.

8. CẬP NHẬT CHÍNH SÁCH
Chính sách có thể được cập nhật khi cần thiết để phù hợp với tính năng, yêu cầu bảo mật hoặc pháp luật. Phiên bản mới sẽ hiển thị tại Cài đặt → Chính sách và Điều khoản, kèm ngày hiệu lực. Việc tiếp tục sử dụng sau khi cập nhật nghĩa là bạn đã đọc và chấp nhận bản mới.

9. LIÊN HỆ
Hứa Tiến Dương — qua Cài đặt → Góp ý và Báo lỗi trong ứng dụng.`;

const TERMS_CONTENT = `ĐIỀU KHOẢN SỬ DỤNG — Phiên bản 2.2.0 (25/09/2026)
Ứng dụng: Trợ lý Phật học · Nhà phát triển: Hứa Tiến Dương

1. CHẤP NHẬN ĐIỀU KHOẢN
Bạn chỉ được sử dụng ứng dụng sau khi đã đọc và đồng ý với Chính sách quyền riêng tư cùng Điều khoản sử dụng này. Nếu không đồng ý, vui lòng không sử dụng ứng dụng.

2. PHẠM VI DỊCH VỤ
Ứng dụng cung cấp nội dung hỗ trợ tìm hiểu Phật pháp theo truyền thống Theravāda, trình bày bằng tiếng Việt. Một số chức năng có thể yêu cầu đăng nhập để lưu và đồng bộ tiến trình.

3. NỘI DUNG VÀ QUYỀN RIÊNG TƯ TRONG TRÒ CHUYỆN
• Bạn giữ quyền đối với câu hỏi, tin nhắn, hình ảnh và nội dung do bạn chủ động gửi. Ứng dụng chỉ xử lý nội dung ở mức cần thiết để thực hiện chức năng bạn yêu cầu.
• Ứng dụng không chủ động đọc, theo dõi, đánh giá, chỉnh sửa hoặc can thiệp vào nội dung trò chuyện. Nhà phát triển không có giao diện để mở và xem lại lịch sử trò chuyện của người dùng.
• Dữ liệu trò chuyện lưu trên thiết bị được mã hóa; dữ liệu truyền qua mạng được bảo vệ bằng HTTPS/TLS. Quyền truy cập được giới hạn, kiểm soát và ghi nhận khi cần thiết.
• Bạn có thể thu hồi tin nhắn, xóa lịch sử, ngừng sử dụng tính năng hoặc yêu cầu hỗ trợ xóa dữ liệu bất cứ lúc nào.
• Không được gửi nội dung vi phạm pháp luật, xâm phạm quyền riêng tư của người khác hoặc gây ảnh hưởng đến an toàn của hệ thống.

4. SỬ DỤNG ĐÚNG MỰC
Bạn không được can thiệp hệ thống, dịch ngược mã nguồn, dùng phương tiện tự động để truy cập trái phép, lạm dụng tính năng, gây gián đoạn dịch vụ hoặc gửi nội dung vi phạm pháp luật. Vi phạm điều khoản có thể dẫn đến việc giới hạn hoặc khóa truy cập thiết bị.

5. NỘI DUNG THAM KHẢO
Nội dung trong ứng dụng có tính chất tham khảo và có thể chưa đầy đủ hoặc phù hợp với mọi hoàn cảnh. Khi học Phật, thực hành thiền hoặc áp dụng giáo lý, bạn nên đối chiếu Kinh tạng Pāli và sự chỉ dạy của thầy giảng có uy tín. Ứng dụng không thay thế thầy giảng, người hướng dẫn thiền, bác sĩ hoặc chuyên gia tâm lý.

6. TÀI SẢN TRÍ TUỆ
Giao diện, mã nguồn và thương hiệu của ứng dụng thuộc quyền sở hữu của nhà phát triển. Kinh điển và giáo lý là tài sản chung. Bạn giữ quyền đối với nội dung mình nhập và chỉ cho phép ứng dụng lưu, xử lý, hiển thị nội dung đó ở mức cần thiết để cung cấp chức năng.

7. GIỚI HẠN TRÁCH NHIỆM
Ứng dụng được cung cấp trên cơ sở nguyên trạng. Chúng tôi không bảo đảm dịch vụ luôn liên tục, không gián đoạn hoặc không có lỗi. Mọi trách nhiệm không thể loại trừ theo pháp luật được giới hạn ở mức tối đa pháp luật cho phép.

8. TẠM NGƯNG VÀ CHẤM DỨT
Chúng tôi có thể tạm ngừng hoặc thay đổi chức năng để bảo trì, nâng cấp và bảo đảm an toàn. Bạn có thể ngừng sử dụng ứng dụng bất cứ lúc nào.

9. THAY ĐỔI ĐIỀU KHOẢN
Các điều khoản có thể được cập nhật theo thời gian. Bản mới sẽ hiển thị trong ứng dụng kèm ngày hiệu lực. Việc tiếp tục sử dụng sau khi cập nhật nghĩa là bạn đã đọc và chấp nhận bản mới.

10. LUẬT ÁP DỤNG
Điều khoản tuân theo pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Tranh chấp ưu tiên được giải quyết bằng thương lượng; nếu không thành, các bên sẽ thực hiện theo quy định của cơ quan có thẩm quyền tại Việt Nam.

11. LIÊN HỆ
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
