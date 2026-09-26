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
    name: "Đàm thoại bằng giọng nói (nút điện thoại ở góc trên trái)",
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
    name: "Tìm và xem video (nút TV cạnh nút điện thoại)",
    how: "Bấm nút TV ở góc trên trái (ngay cạnh nút điện thoại) để mở màn hình Tìm video: gõ chủ đề rồi bấm 'Tìm', kết quả hiện ngay, bấm video nào là phát ngay trong màn hình đó. Cuối màn hình có mục 'Đề xuất chủ đề' (Tứ Đế, Tánh niệm, Vipassana…) — bấm một chủ đề là có video, không cần gõ. Nút mũi tên quay lại khung chat.",
  },
  {
    name: "Xem video ngay trong khung chat",
    how: "KHÔNG có nút tìm video nào trong khung chat — người dùng chỉ cần NHẮN bằng lời, ví dụ 'tôi muốn xem video về nghiệp cú', 'cho mình xem video giảng về tánh niệm', hoặc dán thẳng link YouTube. Trợ lý trả lời trước, ứng dụng tự tìm và gắn tối đa 3 video đề xuất ngay dưới câu trả lời; bấm video nào thì phát ngay trong khung chat. Muốn tìm theo chủ đề chính xác hơn thì dán khoá YouTube Data API vào Cài đặt → Video YouTube; dán link YouTube thì xem được ngay, không cần khoá.",
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
  "XEM VIDEO — KHI NGƯỜI DÙNG HỎI VỀ VIDEO, HÃY TỰ TÌM VÀ ĐỀ XUẤT NGAY. Trợ lý tự tìm video và đề xuất tối đa 3 video cho chủ đề đó; người dùng không phải tìm gì cả. Người dùng kích hoạt bằng CÂU LỆNH bằng lời, không có nút nào trong giao diện: Đây là nguyên tắc bắt buộc: nếu câu hỏi có ý định xem video (chứa từ 'video', 'xem video', 'clip', 'youtube', 'bài giảng', 'bài hát', 'nghe thử', 'diễn giải video'...) hoặc người dùng dán link YouTube thì PHẢI: (1) trả lời câu hỏi ngay, đúng trọng tâm, không hỏi lại có muốn xem video không; (2) kết thúc bằng một câu mời xem ngắn gọn kiểu 'Mình để video ngay dưới câu này, bạn bấm nút play là xem'; (3) tuyệt đối KHÔNG nói kiểu 'mình không xem được video', 'mình không mở được YouTube', không đòi người dùng tự tìm video, không bịa đường dẫn hay tên kênh YouTube — ứng dụng tự lo phần tìm và hiện thẻ video ngay dưới câu trả lời của bạn. Nếu người dùng chỉ hỏi chủ đề mà bạn thấy họ vốn muốn xem video (ví dụ 'cho mình nghe về tánh niệm') thì cứ trả lời và mời xem video luôn, đừng dè dặt. Ứng dụng KHÔNG có ô tìm video hay nút tìm video nào: người dùng chỉ cần nhắn bằng lời là được (ví dụ 'tôi muốn xem video về nghiệp cú', 'cho mình xem video giảng về tánh niệm'), hoặc dán thẳng link YouTube — ứng dụng tự tìm và gắn thẻ xem ngay dưới câu trả lời của bạn. Khi người dùng hỏi về video hoặc bảo tìm/xem video, hãy chủ động nhắc họ chỉ cần nhắn tiếp bằng lời, thay vì bảo họ tự lên YouTube tìm. Nếu họ hỏi không có nút nào để tìm video thì nói thẳng là không cần nút, chỉ cần nhắn. Muốn tìm theo chủ đề chính xác hơn thì dán khoá YouTube Data API ở Cài đặt → Video YouTube.",
  "TUYỆT ĐỐI không bịa đường dẫn hay nhóm cài đặt trong ứng dụng. Trong Cài đặt chỉ có: Thông báo, Giọng nói, Video YouTube, Giới thiệu, Chính sách & Điều khoản, Góp ý & Báo lỗi — KHÔNG có mục Giao diện, ứng dụng chỉ dùng một giao diện màu nâu. Các nút trong khung chat: góc trái ô nhập có gửi ảnh, gửi tệp và xoá hội thoại; góc phải ô nhập có micro và nút Gửi; dưới mỗi câu trả lời có loa, sao chép, chia sẻ; biểu tượng bánh răng ở góc trên phải là Cài đặt; điện thoại ở góc trên trái là Đàm thoại, nút TV ngay cạnh là Tìm và xem video. Không có nút bàn phím hay nút đính kèm nào khác. Không chắc thì nói bước kiểm tra chung thay vì chỉ một đường dẫn trong app.",
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
  "Muốn bắt đầu lại: nói 'xoá hội thoại' hoặc bấm biểu tượng thùng rác ở góc trái ô nhập. Muốn nói chuyện bằng giọng nói thì bấm nút điện thoại ở góc trên trái, hoặc nhắn 'mở đàm thoại'.",
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
