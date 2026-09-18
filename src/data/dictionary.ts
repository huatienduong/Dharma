// Từ điển Phật học chuyên ngành — thuật ngữ Pāḷi / Sanskrit phổ biến trong
// kinh điển Theravāda, kèm giải nghĩa theo truyền thống Nguyên thủy.

export type DictCategory =
  | "giáo lý"
  | "thực hành"
  | "tâm lý học Phật giáo"
  | "nhân quả"
  | "tổ chức"
  | "thời gian"
  | "địa vị";

export type DictEntry = {
  term: string; // cách gọi quen thuộc tiếng Việt
  pali: string; // nguyên văn Pāḷi
  category: DictCategory;
  definition: string; // giải nghĩa
};

export const DICTIONARY: DictEntry[] = [
  // ---------------- Giáo lý ----------------
  {
    term: "Bốn Sự Thật Cao Quý",
    pali: "Cattāri Ariyasaccāni (Tứ Diệu Đế)",
    category: "giáo lý",
    definition:
      "Khổ (dukkha), Tập (samudaya — nguyên nhân khổ là ái), Diệt (nirodha — chấm dứt khổ), Đạo (magga — con đường Bát Chánh Đạo đưa đến chấm dứt). Bốn Thánh Đế là nền tảng của toàn bộ Phật giáo; thấy rõ bốn Thánh Đế là dấu hiệu của bậc Thánh Nhập Lưu.",
  },
  {
    term: "Con Đường Tám Ngành",
    pali: "Ariyo Aṭṭhaṅgiko Maggo (Bát Chánh Đạo)",
    category: "giáo lý",
    definition:
      "Chánh kiến, Chánh tư duy, Chánh ngữ, Chánh nghiệp, Chánh mạng, Chánh tinh tấn, Chánh niệm, Chánh định. Chia làm ba phần tu tập: Tuệ (paññā), Giới (sīla), Định (samādhi). Là con đường trung đạo Đức Phật giảng trong Kinh Chuyển Pháp Luân.",
  },
  {
    term: "Duyên Sinh",
    pali: "Paṭiccasamuppāda (Thập nhị nhân duyên)",
    category: "giáo lý",
    definition:
      "Mười hai mắt xích: Vô minh → Hành → Thức → Danh sắc → Sáu nhập → Xúc → Thọ → Ái → Thủ → Hữu → Sanh → Già chết khổ. Giải thích sự khởi lên và chấm dứt của khổ theo quy luật duyên sinh, không cần đến đấng sáng tạo hay linh hồn thường hằng.",
  },
  {
    term: "Ba Đặc Tính",
    pali: "Tilakkhaṇa",
    category: "giáo lý",
    definition:
      "Vô thường (anicca), Khổ (dukkha), Vô ngã (anattā) — ba đặc tính của mọi pháp hữu vi. Sự quán chiếu ba đặc tính này là lõi của thiền tuệ (vipassanā).",
  },
  {
    term: "Niết-bàn",
    pali: "Nibbāna",
    category: "giáo lý",
    definition:
      "Sự dập tắt hoàn toàn tham, sân, si; sự chấm dứt khổ. Có hai mặt: Hữu dư Niết-bàn (nhiếp phục còn thân) và Vô dư Niết-bàn (khi thân tan rã). Không phải cõi hưng phúc, mà là sự chấm dứt của mọi đau khổ và tái sanh.",
  },
  {
    term: "Tam Tạng",
    pali: "Tipiṭaka",
    category: "giáo lý",
    definition:
      "Kinh tạng (Sutta Piṭaka), Luật tạng (Vinaya Piṭaka), Vi Diệu Pháp (Abhidhamma Piṭaka) — ba tạng chính thức của kinh điển Phật giáo Theravāda, được kết tập bằng tiếng Pāḷi.",
  },

  // ---------------- Thực hành ----------------
  {
    term: "Thiền Niệm Hơi Thở",
    pali: "Ānāpānasati",
    category: "thực hành",
    definition:
      "Tỉnh giác với hơi thở — đối tượng thiền Đức Phật khuyên dùng nhiều nhất. Thực hành theo 16 bước, đưa từ tỉnh giác sơ khởi đến Tứ Thiền chứng và cuối cùng đến Vipassanā (thiền tuệ).",
  },
  {
    term: "Thiền Tứ Niệm Xứ",
    pali: "Satipaṭṭhāna",
    category: "thực hành",
    definition:
      "Bốn nền niệm: quán thân (kāya), quán thọ (vedanā), quán tâm (citta), quán pháp (dhamma). Là con đường trực tiếp đưa đến thanh tịnh, vượt qua ưu bi, chấm dứt khổ — theo Kinh Tứ Niệm Xứ.",
  },
  {
    term: "Thiền Từ",
    pali: "Mettā Bhāvanā",
    category: "thực hành",
    definition:
      "Phát triển tâm từ hướng đến mọi chúng sanh, đối trị lòng sân. Cùng với bi (karuṇā), hỷ (muditā), xả (upekkhā) tạo thành bốn Brahmavihāra — bốn trạng thái tâm linh cao của hàng tại gia và xuất gia.",
  },
  {
    term: "Bảy Giác Chi",
    pali: "Satta Bojjhaṅgā",
    category: "thực hành",
    definition:
      "Niệm (sati), Tầm pháp (dhammavicaya), Tinh tấn (viriya), Hỷ (pīti), Khinh an (passaddhi), Định (samādhi), Xả (upekkhā). Bảy yếu tố giác ngộ, được thực hành hai chiều: phát triển khi thiếu, xả bỏ khi dư.",
  },
  {
    term: "Tỉnh Giác",
    pali: "Sati / Sampajañña",
    category: "thực hành",
    definition:
      "Sati là sự nhớ giữ đối tượng, không để tâm bị cuốn; Sampajañña là sự rõ biết rõ về mục đích, sự phù hợp và thực tại. Hai yếu tố này đi cùng nhau trong mọi tư thế: đi, đứng, nằm, ngồi.",
  },

  // ---------------- Tâm lý học Phật giáo ----------------
  {
    term: "Năm Uẩn",
    pali: "Pañca-khandhā",
    category: "tâm lý học Phật giáo",
    definition:
      "Sắc (rūpa — thân vật chất), Thọ (vedanā — cảm giác), Tưởng (saññā — nhận biết), Hành (saṅkhāra — ý chí, hành nghiệp), Thức (viññāṇa — thức biết). Con người là năm uẩn vận hành duyên sinh, không có «ngã» thật.",
  },
  {
    term: "Sáu Căn",
    pali: "Saḷāyatana",
    category: "tâm lý học Phật giáo",
    definition:
      "Mắt, tai, mũi, lưỡi, thân, ý (nội căn) cùng đối tượng tương ứng: sắc, thanh, hương, vị, xúc, pháp (ngoại căn). Mọi kinh nghiệm đều khởi lên qua sáu nhập; nơi tiếp xúc (phassa) của căn và trần là khởi điểm của thọ và ái.",
  },
  {
    term: "Ba Nghiệp",
    pali: "Tikammapatha",
    category: "tâm lý học Phật giáo",
    definition:
      "Nghiệp qua thân (kāya), qua khẩu (vacī), qua ý (mano). Mười nghiệp bất thiện: giết, trộm, tà dâm; nói dối, nói hai chiều, nói ác, nói phù phiếm; tham, sân, tà kiến. Nghiệp là ý chí (cetanā) — theo Kinh Nibbedhika (AN 6.63): «Này các Tỳ-kheo, ta nói nghiệp là ý chí».",
  },
  {
    term: "Cấu Uế",
    pali: "Āsava",
    category: "tâm lý học Phật giáo",
    definition:
      "Bốn lậu hoặc: dục (kāmāsava), hữu (bhavāsava), kiến (diṭṭhāsava), vô minh (avijjāsava). Là dòng chảy ngấm sâu trong tâm, được trừ diệt hoàn toàn ở bậc A-la-hán.",
  },

  // ---------------- Nhân quả ----------------
  {
    term: "Nghiệp",
    pali: "Kamma",
    category: "nhân quả",
    definition:
      "Hành động có ý chí, mang lại quả tương ứng theo luật nhân quả: nghiệp thiện đưa đến lạc quả, nghiệp bất thiện đưa đến khổ quả. Nghiệp không phải định mệnh — có thể thay đổi qua sám hối, tu tập và nghiệp mới.",
  },
  {
    term: "Bốn Tầng Quả Nghiệp",
    pali: "Kammavipāka",
    category: "nhân quả",
    definition:
      "Nghiệp cho quả trong đời này (diṭṭhadhammavedanīya), trong kiếp sau (upapajjavedanīya), trong các kiếp tiếp theo (apara-paccayavedanīya), hoặc không cho quả nữa (ahosi-kamma — nghiệp đã hết duyên).",
  },

  // ---------------- Tổ chức ----------------
  {
    term: "Tăng-già",
    pali: "Saṅgha",
    category: "tổ chức",
    definition:
      "Cộng đồng Tỳ-kheo và Tỳ-kheo-ni sống theo Luật tạng — một trong Tam bảo. Tăng-già là nơi duy trì giáo pháp và là chỗ nương tựa thực hành của hàng tại gia.",
  },
  {
    term: "An Cư Kiết Hạ",
    pali: "Vassa",
    category: "tổ chức",
    definition:
      "Ba tháng mùa mưa (từ rằm tháng tư âm lịch Ấn) Tỳ-kheo trú một nơi cố định tu tập. Kết thúc an cư là Kathina — lễ cúng y và Pāvāraṇā — ngày mời Tăng-già chỉ điểm lỗi lầm.",
  },
  {
    term: "Ngày Tụng Giới",
    pali: "Uposatha",
    category: "tổ chức",
    definition:
      "Ngày 15 và 30 âm lịch (hoặc 29) — Tăng-già tụng Pātimokkha; hàng tại gia giữ tám giới và nghe pháp. Là nhịp sinh hoạt tâm linh hai tuần một lần trong Phật giáo Theravāda.",
  },

  // ---------------- Thời gian ----------------
  {
    term: "Một Kiếp",
    pali: "Kappa",
    category: "thời gian",
    definition:
      "Chu kỳ tồn tại của một thế giới: khởi lên, tồn tại, hoại diệt, trống rỗng — thời gian dài không thể tính đếm. Đức Phật dùng phép so sánh: núi đá to lớn chạm mây, chạm vải Kaśī mỗi trăm năm một lần — núi ấy mòn hết trước khi một kiếp chấm dứt.",
  },
  {
    term: "Bốn A-tăng-kỳ Kiếp",
    pali: "Asaṅkheyya",
    category: "thời gian",
    definition:
      "Con số vô lượng dùng để tính thời gian một Đức Phật xuất hiện — một vị Bồ-tát hành Bồ-tát đạo qua bốn a-tăng-kỳ kiếp và trăm nghìn kiếp để thành Phật.",
  },

  // ---------------- Địa vị ----------------
  {
    term: "Bậc Thánh Nhập Lưu",
    pali: "Sotāpanna",
    category: "địa vị",
    definition:
      "Người đã thấy Tứ Thánh Đế, đoạn ba phiến kết (sắc tham, vô sắt tham, giới cấm thủ), không còn tái sanh địa ngục, súc sanh, ngạ quỷ; tối đa bảy kiếp nữa sẽ chứng A-la-hán. Là bậc Thánh đầu tiên trong bốn bậc Thánh.",
  },
  {
    term: "Bốn Bậc Thánh",
    pali: "Cattāri Ariyapuggalā",
    category: "địa vị",
    definition:
      "Nhập Lưu (Sotāpanna), Nhất Lai (Sakadāgāmī), Bất Lai (Anāgāmī), A-la-hán (Arahant). Mỗi bậc Thánh có đạo tâm và quả tâm tương ứng; A-la-hán là đỉnh cao: các lậu hoặc đã tận, đời sống chấm dứt.",
  },
  {
    term: "Đức A-la-hán",
    pali: "Arahant",
    category: "địa vị",
    definition:
      "Bậc đã chấm dứt mọi cấu uế, không còn tái sanh: «sanh đã tận, phạm hạnh đã thành, việc cần làm đã làm, không còn trở lại cõi này nữa». A-la-hán xứng đáng thọ cúng dường, là chỗ nương tựa vô thượng của thế gian.",
  },
  {
    term: "Bồ-tát",
    pali: "Bodhisatta",
    category: "địa vị",
    definition:
      "Trong Theravāda, là người phát nguyện thành Phật, hành qua ba vòng a-tăng-kỳ kiếp và hai mươi ba tham số của ba mươi hạnh Ba-la-mật (pāramī). Đức Phật Gotama trước khi thành đạo là Bodhisatta — ví dụ trong chuyện tích Jātaka.",
  },
];

// Tìm kiếm đơn giản không dấu
export function searchDictionary(query: string): DictEntry[] {
  const q = normalize(query.trim().toLowerCase());
  if (!q) return DICTIONARY;
  return DICTIONARY.filter(
    (e) =>
      normalize(e.term.toLowerCase()).includes(q) ||
      e.pali.toLowerCase().includes(q),
  );
}

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function dictCategories(): { name: DictCategory; count: number }[] {
  const map = new Map<DictCategory, number>();
  for (const e of DICTIONARY) {
    map.set(e.category, (map.get(e.category) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}
