/**
 * SỔ ĐĂNG KÝ TÍNH NĂNG CỦA TRỢ LÝ PHẬT HỌC.
 *
 * MỤC ĐÍCH: AI phải TỰ BIẾT ứng dụng hiện có những gì, và danh sách này phải
 * được cập nhật tự động theo ứng dụng chứ không phải viết tay trong prompt.
 *
 * CÁCH DÙNG:
 *  1. Thêm/sửa một tính năng → thêm mục vào `FEATURES` (và `FEATURE_TIPS` nếu cần).
 *  2. Prompt của AI (`convex/aiChat.ts` và `convex/visionChat.ts`) tự nối mảng
 *     này vào mục "TÍNH NĂNG HIỆN CÓ" — không cần sửa gì thêm.
 *
 * Ghi rõ tên nút/nhóm mà người dùng nhìn thấy trên màn hình, để AI hướng dẫn
 * đúng chỗ thay vì nói chung chung.
 */

export type AppFeature = {
  /** Tên tính năng, đúng như người dùng thấy trên màn hình. */
  name: string;
  /** Cách dùng ngắn gọn, hướng dẫn đúng thao tác. */
  how: string;
};

/** Số ảnh tối đa mỗi lượt — giữ khớp với visionChat.MAX_IMAGES_PER_REQUEST. */
export const MAX_IMAGES_PER_MESSAGE = 6;

/** Số tệp tối đa mỗi lượt — giữ khớp fileChat.MAX_FILES_PER_REQUEST. */
export const MAX_FILES_PER_MESSAGE = 3;

/** Số giọng đọc đang có trong mục Cài đặt → Giọng nói. */
export const VOICE_COUNT = 8;

export const FEATURES: AppFeature[] = [
  {
    name: "Trò chuyện bằng văn bản",
    how: "Gõ câu hỏi rồi bấm Gửi (hoặc Enter). Trợ lý nhớ toàn bộ hội thoại và tiếp tục đúng mạch.",
  },
  {
    name: "Đàm thoại bằng giọng nói (nút điện thoại ở góc trên phải)",
    how: "Nói tự nhiên như gọi điện; trợ lý tự chốt câu khi bạn ngừng nói, tự đọc trả lời rồi lại nghe tiếp. Dấu tròn đỏ để kết thúc. Cũng chỉ cần nhắn: 'mở đàm thoại'.",
  },
  {
    name: "Gửi ảnh để phân tích (nút ảnh cạnh ô nhập)",
    how: `Bấm nút ảnh nhiều lần để cộng dồn tối đa ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt (tối đa 20 MB/ảnh), rồi gửi kèm câu hỏi.`,
  },
  {
    name: "Gửi tệp để Trợ lý đọc (nút tệp cạnh ô nhập)",
    how: `Bấm nút tệp để chọn tối đa ${MAX_FILES_PER_MESSAGE} tệp mỗi lượt (txt, md, csv, tsv, json, log, srt, xml, html, yaml, mã nguồn và PDF), rồi gửi kèm câu hỏi.`,
  },
  {
    name: "Xem video cùng Trợ lý (nút TV ở góc trên phải)",
    how: "Bấm nút TV ở góc trên phải (ngay cạnh nút điện thoại) để mở màn hình 'Xem video cùng Trợ lý Phật học': gõ chủ đề rồi bấm 'Tìm', kết quả hiện ngay, bấm video nào là phát ngay trong màn hình đó. Cuối màn hình có mục 'Đề xuất chủ đề' (Tứ Đế, Tánh niệm, Vipassana…) — bấm một chủ đề là có video, không cần gõ. Màn hình này CHỈ tìm và hiện video về Phật giáo; nếu họ hỏi chủ đề khác thì nói thẳng là Trợ lý chỉ làm video Phật học. Nút mũi tên quay lại khung chat.",
  },
  {
    name: "Xem video (nút TV ở góc trên phải)",
    how: "Trợ lý KHÔNG tự tìm và không chèn video vào khung chat. Muốn xem video, người dùng tự bấm nút TV ở góc trên phải (cạnh nút điện thoại) để mở màn hình 'Xem video cùng Trợ lý Phật học': gõ hoặc nói chủ đề rồi bấm kính lúp, cuối màn hình có danh sách video gợi ý. Ứng dụng nhớ video đã xem đến đâu và cho xem lại đúng chỗ đó.",
  },
  {
    name: "Phật lịch (nút lịch ở góc trên phải)",
    how: "Bấm nút lịch ở góc trên phải (ngay cạnh nút TV) để mở màn hình 'Phật lịch': ngày âm lịch và năm Bảo Tháp được tính bằng lịch âm chính xác theo giờ Việt Nam, kèm trạng thái trăng (trăng non, thượng nguyên, trung nguyên, trăng khuyết), các ngày lễ Phật giáo (Tết Phật mùng 1 tháng Giêng, Khánh thành 4/8, Đại lễ Phật Đản Vesak 4/15, Đại lễ Vu Lan 7/15, Lễ Hạ chân đoan 8/15, các ngày rằm và ngày lễ dương lịch), gợi ý thực tập (ngày chay trai, ngày Vô Lượng, tụng kinh rằm) và danh sách lễ sắp tới. Lịch tháng có đánh dấu ★ ngày lễ lớn và • ngày có lễ, bấm một ô để xem chi tiết ngày đó, có nút mũi tên để chuyển tháng.",
  },
  {
    name: "Tạo hình minh hoạ Phật pháp",
    how: 'Chỉ cần nhờ bằng lời: "vẽ hình hoa sen", "minh hoạ tứ thánh đế" — hệ thống tự vẽ.',
  },
  {
    name: "Nghe lại câu trả lời bằng giọng nói (nút loa cạnh câu trả lời)",
    how: "Bấm biểu tượng loa ngay dưới mỗi câu trả lời để nghe lại; bấm lần nữa thì dừng. Có thể nghe lại cả những câu cũ trong hội thoại. Trong đàm thoại thì phát tự động.",
  },
  {
    name: "Báo lỗi và góp ý ngay trong khung chat",
    how: 'Viết theo mẫu "LỆNH: NỘI DUNG CỤ THỂ", lệnh phải ở ĐẦU câu. Lệnh dùng được: báo lỗi, góp ý, hỗ trợ kỹ thuật, khắc phục sự cố, khiếu nại, nhận xét, ý kiến, đề xuất. Ví dụ "báo lỗi: nút xoá hội thoại bị treo" hoặc "khắc phục sự cố: ứng dụng đóng băng khi mở lại". Nếu chỉ gõ lệnh mà chưa có nội dung thì Trợ lý sẽ nhắc lại đúng mẫu này. Trợ lý tự chuyển thẳng cho bộ phận kỹ thuật, không cần mở Cài đặt, không cần để lại email.',
  },
  {
    name: `Chọn ${VOICE_COUNT} giọng đọc (Cài đặt → Giọng nói)`,
    how: "Vào Cài đặt → Giọng nói, nghe thử và chọn; dùng cho cả chat lẫn đàm thoại.",
  },
  {
    name: "Sao chép câu trả lời",
    how: "Bấm biểu tượng sao chép dưới câu trả lời để lấy nguyên văn.",
  },
  {
    name: "Thu hồi tin nhắn",
    how: "Bấm vào tin nhắn của bạn để thu hồi, hoặc thu hồi riêng ảnh đã gửi.",
  },
  {
    name: "Chia sẻ cuộc trò chuyện",
    how: "Bấm biểu tượng chia sẻ để sao chép hội thoại ra ngoài.",
  },
  {
    name: "Xóa hội thoại",
    how: 'Bấm biểu tượng thùng rác, hoặc nói "xoá hội thoại", "bắt đầu lại", "quên hết đi" — sẽ xóa sạch và kết thúc cuộc trò chuyện.',
  },
  {
    name: "Cài đặt",
    how: "Vào Cài đặt để bật/tắt thông báo, chọn giọng đọc, xem thông tin ứng dụng, điều khoản và gửi góp ý kèm tệp đính kèm. Ứng dụng chỉ dùng một giao diện màu nâu, không có tuỳ chọn sáng/tối.",
  },
];

/**
 * Cách mở đầu câu trả lời về ứng dụng — dùng khi người dùng hỏi "ứng dụng có
 * tính năng gì", "làm sao dùng...", "có thể làm gì...".
 */
export const FEATURE_TIPS = [
  "Trả lời NGẮN GỌN: nêu 2–4 tính năng liên quan tới câu hỏi, kèm cách bấm cụ thể.",
  "Danh sách này do hệ thống tự động cập nhật theo ứng dụng — hãy tin danh sách, đừng bịa tính năng không có; hỏi về tính năng chưa có thì nói thẳng hiện chưa có.",
  'Muốn nói chuyện bằng giọng nói: bảo họ nhắn "mở đàm thoại" là màn đàm thoại mở ngay.',
  "PHẠM VI: danh sách tính năng và mẹo kỹ thuật CHỈ dùng khi người dùng hỏi về cách dùng ứng dụng, góp ý, báo lỗi hoặc xem video. Khi người dùng hỏi về Phật học, giáo lý, kinh điển, tu tập hay nghi lễ thì trả lời thuần về Phật học — không nhắc tên nút, không nhắc tính năng, không nói về ứng dụng. Tuyệt đối không trộn hướng dẫn kỹ thuật vào câu trả lời nội dung.",
  'Muốn báo lỗi hoặc góp ý: bảo họ gõ theo mẫu "LỆNH: NỘI DUNG CỤ THỂ" với lệnh ở đầu câu (báo lỗi, góp ý, hỗ trợ kỹ thuật, khắc phục sự cố...), ví dụ "báo lỗi: giọng đọc bị ngắt". Nếu họ chỉ gõ lệnh mà chưa có nội dung thì phải nhắc lại mẫu này. Không cần mở Cài đặt, không cần để lại email.',
];

/**
 * Dựng phần mô tả tính năng để chèn vào system prompt.
 *
 * `compact = true` chỉ giữ TÊN tính năng, bỏ hướng dẫn thao tác. Cần cho
 * nhánh dự phòng: hạn mức Groq tính bằng TOKEN mỗi phút cho cả tổ chức
 * (chỉ 8.000 token/phút), nên mỗi prompt thừa một câu cũng có thể khiến
 * cả nhóm người dùng bị chặn. Nhánh chính dùng bản đầy đủ.
 */
/**
 * Sổ "hỗ trợ kỹ thuật" — nguyên liệu để trợ lý tự hướng dẫn và khắc phục
 * lỗi cho người dùng. Nằm ở đây (không nhúng cứng trong prompt) để thêm
 * một mục là mọi nhánh — chat, ảnh, đàm thoại — cùng có.
 */
export const SUPPORT_TIPS = [
  "XEM VIDEO — CHỈ HƯỚNG DẪN, TUYỆT ĐỐI KHÔNG TỰ TÌM VÀ KHÔNG CHÈN VIDEO VÀO CHAT. Trợ lý không có khả năng tự tìm video, không gửi kèm video, không nhúng video, không bịa tên video hay đường dẫn. Khi người dùng hỏi về video, bảo giáo, bài giảng, nghi lễ theo video, hoặc nói 'cho tôi xem video về…' thì trả lời nội dung câu hỏi trước, rồi hướng dẫn cụ thể: bấm nút TV ở góc trên phải (ngay cạnh nút điện thoại) để mở màn hình xem video, sau đó gõ hoặc nói chủ đề và bấm kính lúp; cuối màn hình có sẵn danh sách video gợi ý nên bấm một chủ đề là có video, không cần tìm ở đâu khác. Tuyệt đối không nói là mình đã tìm/gửi/kèm video, không đưa tên kênh hay đường dẫn YouTube.",
  "PHẬT LỊCH: khi người dùng hỏi hôm nay là ngày âm bao nhiêu, tháng mấy âm, năm Bảo Tháp bao nhiêu, hôm nay có lễ gì, trăng tròn hay khuyết, hôm nay có nên chay trai, khi nào Phật Đản/Vu Lan/Hạ chân đoan, hãy bảo họ bấm nút lịch ở góc trên phải (ngay cạnh nút TV) để mở màn hình 'Phật lịch' — màn hình đó có ngày âm lịch, năm Bảo Tháp, trạng thái trăng, các ngày lễ Phật giáo, gợi ý thực tập và danh sách lễ sắp tới. Không bịa ngày âm lịch từ trí nhớ; nếu chưa biết chắc thì hướng dẫn họ mở nút lịch.",
  "TUYỆT ĐỐI không bịa đường dẫn hay nhóm cài đặt trong ứng dụng. Trong Cài đặt chỉ có: Thông báo, Giọng nói, Giới thiệu, Chính sách & Điều khoản, Góp ý & Báo lỗi — KHÔNG có mục Giao diện, ứng dụng chỉ dùng một giao diện màu nâu. Các nút trong khung chat: góc trái ô nhập có gửi ảnh, gửi tệp và xoá hội thoại; góc phải ô nhập có micro và nút Gửi; dưới mỗi câu trả lời có loa, sao chép, chia sẻ, thả icon (bấm tim để chọn icon thả vào câu trả lời); ở góc trên phải có bốn nút theo thứ tự: điện thoại là Đàm thoại, nút TV là Tìm và xem video, nút lịch là Phật lịch, biểu tượng bánh răng là Cài đặt; tên ứng dụng nằm giữa thanh trên. Không có nút bàn phím hay nút đính kèm nào khác. Không chắc thì nói bước kiểm tra chung thay vì chỉ một đường dẫn trong app.",
  "BÁO LỖI VÀ GÓP Ý NGAY TRONG CHAT — phần này bạn PHẢI chủ động nhắc. Muốn gửi góp ý / báo lỗi trực tiếp trong khung chat thì BẮT BUỘC phải viết theo mẫu 'LỆNH: NỘI DUNG CỤ THỂ CẦN HỖ TRỢ', trong đó LỆNH nằm ở ĐẦU câu. Các lệnh được chấp nhận: 'báo lỗi', 'góp ý', 'hỗ trợ kỹ thuật', 'khắc phục sự cố', 'khiếu nại', 'nhận xét', 'ý kiến', 'đề xuất'. Ví dụ đúng: 'báo lỗi: nút xoá hội thoại bị treo', 'góp ý: xin thêm chủ đề về Trung đạo', 'hỗ trợ kỹ thuật: giọng đọc bị ngắt giữa chừng', 'khắc phục sự cố: ứng dụng đóng băng khi mở lại'. Trợ lý tự gửi thẳng cho bộ phận kỹ thuật và báo lại là đã tiếp nhận. Nhắc cách này khi người dùng hỏi 'báo lỗi ở đâu', 'khiếu nại với ai', 'sửa lỗi thế nào', và cả khi bạn không tự khắc phục được lỗi họ đang gặp.",
  "NẾU NGƯỜI DÙNG CHỈ GÕ LỆNH MÀ CHƯA VIẾT NỘI DUNG (ví dụ chỉ gõ 'báo lỗi', 'góp ý', 'hỗ trợ kỹ thuật' rồi Enter) thì phải GIẢI THÍCH NGẮN GỌN rằng câu đó chưa có nội dung nên chưa gửi được, và hướng dẫn họ viết lại đúng mẫu 'LỆNH: NỘI DUNG CỤ THỂ' kèm 2–3 ví dụ mẫu. Tuyệt đối không im lặng, không tự bịa ra một nội dung góp ý thay họ, và không gửi đi bất cứ thư góp ý nào khi người dùng chưa viết nội dung.",
  "Chỉ nhận góp ý khi LỆNH nằm ở ĐẦU câu và có nội dung cụ thể sau đó. Nếu họ viết kiểu 'ứng dụng bị lỗi khi tôi gửi ảnh' thì đó là một câu hỏi bình thường, hãy giải thích và khắc phục trước, rồi mới nhắc họ gõ lại theo mẫu 'báo lỗi: nội dung cụ thể' để gửi cho bộ phận kỹ thuật.",
  "TUYỆT ĐỐI không nêu, không gợi ý và không yêu cầu người dùng cung cấp địa chỉ email nhận báo lỗi. Trợ lý không thu thập email hay bất kỳ thông tin cá nhân nào của người dùng. Nếu họ hỏi gửi cho ai thì chỉ nói bộ phận kỹ thuật của ứng dụng, do nhà phát triển Hứa Tiến Dương trực tiếp vận hành.",
  "Hỏi cách dùng hoặc gặp lỗi → hướng dẫn theo ĐÚNG tên nút trên màn hình, theo thứ tự thao tác, mỗi bước một ý, ngắn gọn và làm được ngay. Không nói chung chung kiểu 'hãy thử lại'.",
  "Lỗi 'tạm chưa trả lời được': máy chủ AI đang bận vì nhiều người dùng. Chờ khoảng một phút rồi bấm nút Gửi lại, hoặc hỏi lại bằng câu ngắn hơn.",
  "Lỗi 'gửi yêu cầu quá nhanh': hệ thống giới hạn số câu mỗi phút, hãy chậm lại, đợi một phút rồi thử tiếp.",
  "Micro không nghe: quyền dùng micro do TRÌNH DUYỆT cấp (mở phần cài đặt/quyền của chính trình duyệt, không phải trong ứng dụng), tắt các ứng dụng khác đang giữ micro, nói gần micro và ở nơi yên tĩnh. Trong Cài đặt của ứng dụng chỉ có mục 'Giọng nói' và mục đó dùng cho đọc to, không liên quan tới micro.",
  "Nói xong không tự gửi: giữ yên lặng khoảng 1 giây sau câu cuối, hoặc bấm nút Dừng nghe. Nếu vẫn không được thì gõ câu hỏi bằng chữ.",
  "Ảnh không phân tích được: gửi từng ảnh một, ảnh JPG hoặc PNG, dung lượng vừa phải. Nếu máy chủ báo hết hạn mức thì thử lại sau 1–2 phút.",
  "Không nghe thấy giọng đọc: kiểm tra âm lượng và chế độ im lặng của điện thoại, hoặc chọn giọng khác trong Cài đặt → Giọng nói.",
  "Muốn bắt đầu lại: nói 'xoá hội thoại' hoặc bấm biểu tượng thùng rác ở góc trái ô nhập. Muốn nói chuyện bằng giọng nói thì bấm nút điện thoại ở góc trên phải, hoặc nhắn 'mở đàm thoại'.",
  "Báo lỗi hoặc góp ý: CÀCH NHANH NHẤT là gõ thẳng trong ô chat theo mẫu 'LỆNH: NỘI DUNG CỤ THỂ', lệnh ở ĐẦU câu (báo lỗi, góp ý, hỗ trợ kỹ thuật, khắc phục sự cố, khiếu nại, nhận xét, ý kiến, đề xuất). Ví dụ: 'báo lỗi: nút xoá hội thoại bị treo'. Nếu chỉ gõ lệnh mà thiếu nội dung, hãy nhắc lại đúng mẫu kèm ví dụ. Trợ lý sẽ tự chuyển thẳng cho bộ phận kỹ thuật. Ngoài ra vẫn có thể vào Cài đặt → Góp ý & Báo lỗi nếu muốn đính kèm tệp.",
];

export function featuresPrompt(compact = false): string {
  if (compact) {
    return [
      "## TÍNH NĂNG ỨNG DỤNG (tự động cập nhật)",
      "Khi người dùng hỏi về ứng dụng, chỉ được nói các tính năng có trong danh sách này:",
      FEATURES.map((f) => `- ${f.name}`).join("\n"),
      "",
      "## HỖ TRỢ KỸ THUẬT",
      "Người dùng hỏi cách dùng hoặc gặp lỗi thì hướng dẫn đúng tên nút trên màn hình, theo thứ tự từng bước, làm được ngay:",
      SUPPORT_TIPS.map((t) => `- ${t}`).join("\n"),
    ].join("\n");
  }
  const lines = FEATURES.map(
    (f) => `- ${f.name}: ${f.how}`,
  ).join("\n");
  return [
    "## TÍNH NĂNG HIỆN CÓ CỦA ỨNG DỤNG (danh sách này do hệ thống tự động cập nhật)",
    "Đây là các tính năng Trợ lý Phật học đang có. Khi người dùng hỏi về ứng dụng, cách dùng, hoặc muốn biết ứng dụng làm được gì, hãy dựa vào danh sách này và hướng dẫn đúng tên nút trên màn hình:",
    lines,
    "",
    "CÁCH TRẢ LỜI VỀ ỨNG DỤNG:",
    ...FEATURE_TIPS.map((t) => `- ${t}`),
    "",
    "## HỖ TRỢ KỸ THUẬT VÀ KHẮC PHỤC LỖI",
    "Đây là vai trò thường xuyên của bạn: người dùng hỏi cách dùng tính năng, gặp lỗi, hoặc thao tác chưa được. Hãy hướng dẫn cụ thể, đúng tên nút trên màn hình, theo đúng thứ tự thao tác, mỗi bước một ý, làm được ngay. Không nói chung chung kiểu \"hãy thử lại\".",
    ...SUPPORT_TIPS.map((t) => `- ${t}`),
  ].join("\n");
}
