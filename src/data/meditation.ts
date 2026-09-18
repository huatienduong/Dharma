// Hướng dẫn thực hành Thiền theo truyền thống Theravāda — chi tiết để
// người dùng có thể thực hành ngay trong ứng dụng.

export type MeditationStep = {
  title: string;
  text: string;
};

export type MeditationTechnique = {
  id: string; // "anapanasati" | "metta" | "maranasati" | "walking"
  name: string;
  pali: string;
  tagline: string;
  source: string; // kinh nguồn gốc
  suggestedMin: number; // phút gợi ý
  difficulty: "Cơ bản" | "Trung cấp" | "Nâng cao";
  benefits: string[];
  steps: MeditationStep[];
  tips: string[];
};

export const MEDITATIONS: MeditationTechnique[] = [
  {
    id: "anapanasati",
    name: "Thiền Niệm Hơi Thở",
    pali: "Ānāpānasati",
    tagline: "Tỉnh giác với hơi thở — đối tượng thiền Đức Phật khuyên dùng nhất",
    source: "Trung Bộ Kinh 118 — Kinh Niệm Hơi Thở",
    suggestedMin: 15,
    difficulty: "Cơ bản",
    benefits: [
      "Tập trung tâm, giảm tán loạn",
      "Bình tịnh thân và tâm",
      "Nền tảng cho thiền tuệ (vipassanā)",
      "Ngủ sâu hơn, giảm lo âu",
    ],
    steps: [
      {
        title: "1. Chọn tư thế",
        text: "Ngồi xếp bằng (hoặc ngồi ghế, lưng thẳng, không tựa). Đặt hai tay lên đùi, thân thẳng tự nhiên như mũi tên, vai thả lỏng, mắt nhắm nhẹ hoặc hé mở.",
      },
      {
        title: "2. Thư giãn ba nhịp thở sâu",
        text: "Hít một hơi thật sâu rồi thở ra chậm ba lần, buông mọi căng thẳng ở vai, hàm, bụng. Sau đó để hơi thở tự nhiên — không điều khiển, không ép sâu hay nông.",
      },
      {
        title: "3. Đặt niệm vào chạm khí",
        text: "Chú ý đến điểm hơi thở chạm rõ nhất — thường là chóp mũi hoặc đầu môi. Cảm nhận hơi thở đi và đến như một người canh cửa đứng ở cổng, chỉ biết ai đi qua, không đuổi theo.",
      },
      {
        title: "4. Biết hơi thở vào, biết hơi thở ra",
        text: "Khi vào — biết «đang vào». Khi ra — biết «đang ra». Chỉ cần biết, không gọi tên dài dòng. Đếm 1 đến 8 (một số cho một hơi thở trọn) nếu tâm còn tán loạn.",
      },
      {
        title: "5. Đối xử với tâm lang thang",
        text: "Khi thấy tâm bỏ đi (nhớ việc, nghĩ người) — đó là một thành công của niệm, không phải thất bại. Nhẹ nhàng ghi nhận «nghĩ» rồi đưa tâm trở lại hơi thở, không tự trách, không bực mình.",
      },
      {
        title: "6. Nuôi dưỡng khi dễ chịu",
        text: "Khi hơi thở mảnh, tâm an — hãy chịu ở đó, đừng cố làm gì thêm. Sự an tịnh lớn lên như mặt nước lắng: càng không khuấy, càng trong.",
      },
      {
        title: "7. Kết thúc tỉnh giác",
        text: "Trước khi dậy, ý thức rõ: «hành thiền này đã xong». Dùng hai tay vuốt nhẹ mặt, cổ, vai rồi mới mở mắt. Mang hơi thở tỉnh giác theo vào công việc đầu tiên.",
      },
    ],
    tips: [
      "Mỗi ngày cùng giờ, cùng chỗ — thói quen là nửa con đường.",
      "Đừng tìm «sự an» — chỉ biết hơi thở, sự an tự đến.",
      "Bắt đầu 10 phút, tăng dần khi thấy dễ chịu. Đều đặn hơn dài.",
      "Ngứa, đau, ngứa ngáy: ghi nhận nó như một cảm giác, không vội động đậy — nếu quá khó chịu thì chuyển tư thế một cách tỉnh giác.",
    ],
  },
  {
    id: "metta",
    name: "Thiền Từ Bi",
    pali: "Mettā Bhāvanā",
    tagline: "Nuôi dưỡng tâm goodwill hướng đến mọi chúng sanh",
    source: "Tiểu Bộ Kinh — Kinh Từ Bi (Karaṇīyametta Sutta)",
    suggestedMin: 15,
    difficulty: "Cơ bản",
    benefits: [
      "Đối trị lòng sân, bực bội",
      "Tâm mềm mại, dễ gần",
      "Ngủ ngon, bớt ác mộng (theo kinh: «không bị ác mộng chi phối»)",
      "Tăng sự kết nối với người chung quanh",
    ],
    steps: [
      {
        title: "1. Ngồi an tịnh",
        text: "Ngồi như thiền hơi thở, thư giãn thân. Hít vài hơi sâu, mỉm cười nhẹ — tâm từ khởi lên dễ nơi tâm nhẹ nhàng.",
      },
      {
        title: "2. Từ hướng về chính mình",
        text: "Trong thâm tâm lặp: «Nguyện tôi được an lạc. Nguyện tôi không bị khổ. Nguyện tôi sống không oán hờn.» Cảm nhận ý nguyện ấy như dòng nước ấm phủ trùm.",
      },
      {
        title: "3. Người thân yêu",
        text: "Tưởng tượng một người dễ thương (mẹ, thầy, bạn). Lặp: «Nguyện bạn được an lạc…» Cảm nhận lòng goodwill như truyền đến người ấy.",
      },
      {
        title: "4. Người trung tính",
        text: "Tưởng tượng người quen bình thường — cô bán hàng, người bảo vệ. Lặp cùng lời nguyện. Nhận ra: họ cũng muốn an lạc như ta.",
      },
      {
        title: "5. Người khó chịu",
        text: "Tưởng tượng người từng làm ta buồn (không cần người tệ nhất ngay lần đầu). Lặp lời nguyện. Nếu lòng khép lại, quay về người thân yêu một lát rồi thử lại.",
      },
      {
        title: "6. Mọi chúng sanh",
        text: "Mở rộng: «Nguyện mọi chúng sanh trong mười phương được an lạc — người mạnh yếu, người thấy khen chê, người sanh cao thấp.» Như kinh dạy: «trên, dưới, ngang — vô lượng, không hờn giận, không đối kháng.»",
      },
      {
        title: "7. Kết thúc",
        text: "Ngồi trong lòng từ vài hơi thở. Ghi nhớ cảm giác ấm áp này để mang vào lời nói và hành động đầu tiên sau khi dậy.",
      },
    ],
    tips: [
      "Nếu khó «cảm thấy», đừng lo — ý nguyện chân thành đã là mettā; cảm xúc sẽ đến sau.",
      "Chọn đối tượng đúng trình tự: mình → thân → trung tính → khó — nhảy cóc dễ làm tâm khép lại.",
      "Có thể giữ một câu ngắn duy nhất («nguyện an lạc») thay vì nhiều câu dài.",
    ],
  },
  {
    id: "maranasati",
    name: "Thiền Niệm Tử",
    pali: "Maraṇasati",
    tagline: "Tỉnh giác với sự vô thường — quý thời gian đang có",
    source: "Tiểu Bộ Kinh — Kinh Pháp Cú câu 174; bổn sự các vị Tỳ-kheo",
    suggestedMin: 10,
    difficulty: "Nâng cao",
    benefits: [
      "Buông bỏ bám víu nhỏ nhặt",
      "Quý trọng thời gian và người thân",
      "Giảm sợ hãi về cái chết",
      "Tạo tinh thần khẩn thiết tu tập",
    ],
    steps: [
      {
        title: "1. Ngồi ổn định",
        text: "Ngồi như thiền hơi thở, tâm an ổn. Nhớ rằng chủ đề này nặng — hãy thực hành khi tâm khỏe, không khi đang tuyệt vọng.",
      },
      {
        title: "2. Nhớ rằng mọi người đều sẽ chết",
        text: "«Tất cả những ai sanh ra đều sẽ chết — không một ai thoát khỏi điều này, dù giàu nghèo, danh rẻ, trẻ già.» Xem xét một cách tỉnh táo, không bi lụy.",
      },
      {
        title: "3. Nhớ rằng mình cũng vậy",
        text: "«Cả tôi — người đang ngồi đây — cũng sẽ đến lúc ấy. Không có gì bảo đảm ngoài hơi thở kế tiếp.» Thấy rõ: mỗi một hơi thở ta nhận được là một món quà chưa chắc có lần sau.",
      },
      {
        title: "4. Xem xét những gì thật sự quý",
        text: "Khi death nhất định đến, thứ gì theo được? Không tiền, không danh — chỉ nghiệp và tâm. Hỏi: hôm nay tôi đang gieo nghiệp gì? Có điều gì cần tha thứ, cần nói, cần làm, mà còn chần chừ?",
      },
      {
        title: "5. Trở về hơi thở với lòng trân trọng",
        text: "Quay lại niệm hơi thở vài phút — nhưng giờ mỗi hơi thở mang sắc thái khác: đang sống, đang đây, quý giá. Kết thúc với một lời nguyện: «Nguyện thời gian còn lại được dùng một cách xứng đáng.»",
      },
    ],
    tips: [
      "Thực hành ngắn (5–10 phút) là đủ — đừng kéo dài khi tâm còn mệt.",
      "Mục đích không phải buồn, mà là sống tỉnh: người thấy được chết biết ơn từng ngày.",
      "Nếu gây lo âu mạnh, dừng lại và chuyển về thiền từ bi hướng về chính mình.",
    ],
  },
  {
    id: "walking",
    name: "Thiền Hành",
    pali: "Caṅkama / Iriyāpatha",
    tagline: "Tỉnh giác trong mỗi bước chân — thiền cho người khó ngồi lâu",
    source: "Tăng Chi Bộ Kinh — Ngài Ānanda và Caṅkama; truyền thống Tư túc Theravāda",
    suggestedMin: 10,
    difficulty: "Cơ bản",
    benefits: [
      "Cân bằng giữa ngồi và di chuyển",
      "Mang niệm vào thân thể rõ ràng",
      "Dễ duy trì cho người hay đau lưng",
      "Hỗ trợ tiêu hóa, bớt mệt mỏi",
    ],
    steps: [
      {
        title: "1. Chọn khoảng lối 5–10 bước",
        text: "Một khoảng lối yên tĩnh — hành lang, phòng khách, vườn. Không cần dài; quan trọng là nơi không vội, không bị nhìn chọc.",
      },
      {
        title: "2. Bắt đầu đứng tỉnh giác",
        text: "Đứng thẳng, hai tay đan nhẹ trước bụng hoặc buông tự nhiên. Biết rõ: «đang đứng.» Cảm nhận trọng lực đè xuống lòng bàn chân.",
      },
      {
        title: "3. Đi chậm, biết rõ từng pha",
        text: "Đi chậm hơn bình thường một nửa. Trong mỗi bước, biết rõ các pha: nâng gót — di chuyển — đặt xuống — đè nhẹ. Tâm luôn bám vào bàn chân, không nhìn quanh.",
      },
      {
        title: "4. Đến cuối lối — dừng và quay",
        text: "Khi đến cuối, dừng hẳn một nhịp thở, biết «đang dừng»; quay người chậm rãi, biết «đang quay»; rồi tiếp tục. Mỗi lần dừng-quay là một lần tâm được làm mới.",
      },
      {
        title: "5. Khi tâm lang thang",
        text: "Giống thiền ngồi: thấy tâm bỏ đi, ghi nhận nhẹ, đưa về bàn chân. Không cần trách móc — bước kế tiếp là cơ hội mới.",
      },
      {
        title: "6. Kết thúc",
        text: "Sau 10–20 lượt, đứng yên một lát cảm nhận toàn thân. Thường người ta kết thúc thiền hành rồi ngồi thiền — trật tự «hành rồi ngồi» giúp tâm sẵn định.",
      },
    ],
    tips: [
      "Đi chậm không phải mục đích — biết rõ mới là mục đích. Khi niệm chắc, có thể đi nhanh hơn một chút.",
      "Ở nơi đông, có thể đi tốc độ thường nhưng giữ niệm vào bước chân — vẫn là thiền hành.",
      "Kết hợp nhãn hiệu tâm lý: mỗi khi băn khoăn việc gì, đi vài lượt rồi mới quyết định.",
    ],
  },
];

export function getMeditation(id: string): MeditationTechnique | undefined {
  return MEDITATIONS.find((m) => m.id === id);
}

export const MEDITATION_QUOTE =
  "«Hỡi các Tỳ-kheo, đây là con đường duy nhất dẫn đến sự thanh tịnh của chúng sanh, vượt qua ưu bi, diệt trừ khổ não, chứng được chánh trí, chứng ngộ Niết-bàn — đó là bốn niệm xứ.» — Kinh Tứ Niệm Xứ";
