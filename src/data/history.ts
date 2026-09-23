/* ------------------------------------------------------------------ */
/* LỊCH SỬ PHẬT GIÁO — dữ liệu chuyên sâu theo truyền thống Theravāda  */
/* Văn bản đầy đủ soạn sẵn trong app; hình ảnh nạp trực tiếp từ        */
/* Wikipedia REST API (CORS mở, miễn phí, không cần khóa) kèm cache.   */
/* ------------------------------------------------------------------ */

import { fetchJsonViaProxies } from "@/lib/proxyFetch";

export type HistoryEntry = {
  id: string;
  period: string; // nhóm thời đại (chips lọc)
  era: string; // nhãn thời gian ngắn
  title: string;
  summary: string; // đoạn tóm tắt hiển thị trên thẻ
  body: string[]; // các đoạn văn đầy đủ khi đọc
  highlight?: string; // câu trích nổi bật
  /** Tên bài Wikipedia để nạp ảnh minh họa + đọc thêm (vi ưu tiên, dự phòng en) */
  wiki?: { vi?: string; en?: string };
};

export const HISTORY_PERIODS = [
  "Đức Phật Cồ Đàm",
  "Kết tập Kinh điển",
  "Truyền bá",
  "Sri Lanka",
  "Đông Nam Á",
  "Việt Nam",
  "Hiện đại",
] as const;

export const HISTORY: HistoryEntry[] = [
  {
    id: "buddha-life",
    period: "Đức Phật Cồ Đàm",
    era: "TK 6–5 TCN",
    title: "Đức Phật Gotama — đời sống và sự giáo hóa",
    summary:
      "Từ Thái tử Siddhattha ở Kapilavatthu đến Bậc Giác Ngộ dưới cội Bồ đề, 45 năm đi giảng Pháp tại Ấn Độ và trở thành nguồn gốc của Tam tạng Pāli.",
    highlight:
      "«Sinh ra là khổ, già là khổ, bệnh là khổ, chết là khổ — duyên khởi nhóm ngũ uẩn là khổ.» — Kinh Chuyển Pháp Luân",
    wiki: { vi: "Đức Phật", en: "Gautama Buddha" },
    body: [
      "Đức Phật Gotama (Siddhattha) sinh tại vườn Lumbini, thuộc gia tộc Sakya ở Kapilavatthu (nay thuộc Nepal), khoảng thế kỷ thứ 6 trước Công nguyên. Thuở nhỏ ngài sống trong cung điện sang trọng, được vua cha Suddhodana che chở khỏi mọi cảnh khổ của đời sống. Bốn lần ngài xuất thành du ngoạn và lần lượt gặp người già, người bệnh, người chết và một Sa môn an tịnh — bốn cảnh tượng ấy khiến ngài quyết tâm rời bỏ vương quyền để đi tìm con đường giải thoát khỏi sinh lão bệnh tử.",
      "Ở tuổi 29, ngài xuất gia, tu học với các đạo sư Āḷāra Kālāma và Uddaka Rāmaputta, đạt tới các mức thiền cao nhất nhưng thấy chưa phải là đoạn tận khổ. Sau 6 năm khổ hạnh cực đoan trên bờ sông Neranja, ngài từ bỏ con đường ấy, thọ bát sữa chua của cô Ma-già Da-đà Uppalavanna, rồi ngồi kiết già dưới cội Bồ đề tại Uruvelā (Bodhgaya). Đêm Đại Giác Ngộ, ngài chứng ngộ Nhân duyên sinh khởi — Duyên khởi 12 chi — và bốn chân lý Thánh: Khổ, Tập, Diệt, Đạo.",
      "Sau khi thành đạo, trong 45 năm còn lại ngài giáo hóa khắp miền Trung Ấn Độ: tại Vườn Nai Sarnath, ngài thuyết Kinh Chuyển Pháp Luân (Dhammacakkappavattana) — giảng bốn Chân lý Thánh và con đường Bát Chánh Đạo. Tăng đoàn phát triển với những đệ tử nổi tiếng như Sāriputta, Moggallāna, Ānanda, Upāli; vua Bimbisāra và dòng họ Sākya quy y. Kinh điển Theravāda sau này ghi lại hơn 8.400 pháp môn dạy trong các Nikāya.",
      "Ngài nhập diệt (Parinibbāna) tại Kusinārā, tuổi 80. Trước khi đi, ngài căn dặn: «Hãy lấy chính mình làm hòn đảo, lấy chính mình làm chỗ nương tựa, lấy Pháp làm hòn đảo, lấy Pháp làm chỗ nương tựa» — Mahāparinibbāna Sutta. Di sản là tập hợp giáo lý được kết tập thành Tam tạng Pāli và truyền suốt 25 thế kỷ qua dòng truyền thừa Theravāda.",
    ],
  },
  {
    id: "first-council",
    period: "Kết tập Kinh điển",
    era: "≈ 483 TCN",
    title: "Kết tập lần thứ nhất — Rājagaha",
    summary:
      "Ngay sau khi Đức Phật Nhập diệt, 500 bậc Arahant kết tập tại hang Sattapanni, Rājagaha: Ānanda phụng tụng Kinh tạng, Upāli phụng tụng Luật tạng.",
    highlight: "Ānanda tụng Kinh — Upāli tụng Luật: nền tảng của Sutta Piṭaka và Vinaya Piṭaka.",
    wiki: { en: "First Buddhist council" },
    body: [
      "Ba tháng sau khi Đức Phật nhập diệt, Tôn trưởng Mahākassapa chủ trì kỳ kết tập đầu tiên tại hang Sattapanni gần thành Vương Xá (Rājagaha), dưới sự bảo trợ của vua Ajātasattu. 500 vị Arahant tham dự với mục đích duy nhất: bảo toàn giáo pháp nguyên văn.",
      "Tại đây, Tôn giả Ānanda — đệ tử đa văn nhất — phụng tụng toàn bộ Kinh tạng (Sutta Piṭaka), mỗi kinh bắt đầu bằng «Tôi nghe như vầy» (Evaṃ me sutaṃ). Tôn giả Upāli — bậc thập thủ giới luật — phụng tụng Luật tạng (Vinaya Piṭaka) với mọi điều luật và duyên khởi sinh ra điều đó.",
      "Kỳ kết tập xác định phương pháp bảo truyền: mỗi bộ lớp được học thuộc, hệ thống hóa theo Cửu phần (nine aṅgas) và đọc chéo trong các nhóm hành nghi — nhờ vậy giáo pháp được truyền khẩu hiệu suốt nhiều thế kỷ trước khi được chép thành văn.",
    ],
  },
  {
    id: "second-council",
    period: "Kết tập Kinh điển",
    era: "≈ 383 TCN",
    title: "Kết tập lần thứ hai — Vesālī và sự tách dòng",
    summary:
      "Mười điều luật của nhóm Vajji bị luận tội vi phạm Luật; kỳ kết tập xác lập lại tính thuần khiết của giới luật và về lâu dài dẫn đến sự phân thành các trường phái.",
    highlight: "Giới luật được xác định là nền tảng không thể đổi đổi — vùng biên giữa các truyền thống sau này.",
    wiki: { en: "Second Buddhist council" },
    body: [
      "Khoảng 100 năm sau khi Đức Phật nhập diệt, tại thành Vệ Xá (Vesālī), các Tôn trưởng thấy nhóm Tỳ kheo Vajji hành mười điều lệ trái Luật — trong đó có thói quen xin tiền và khất thực theo giờ. Tôn trưởng Yasa và 700 Arahant kết tập lại để luận định.",
      "Mười điều bị tuyên là không hợp Luật, kết tập lần này được gọi là Kết tập Vesālī. Tuy nhiên nhóm Vajji không chịu, lập nên dòng Mahāsāṃghika — sự kiện thường được coi là mầm mống chia tách thành các trường phái Đại thừa sau này.",
      "Dòng giữ giáo pháp nguyên gốc theo Tam tạng Pāli về sau gọi là Theravāda — «Học thuyết của các vị Trưởng lão» (Thera) — giữ đường truyền chính thống tại Sri Lanka, Myanmar, Thái Lan, Lào, Campuchia và phía Nam Ấn Độ.",
    ],
  },
  {
    id: "third-council",
    period: "Kết tập Kinh điển",
    era: "≈ 250 TCN",
    title: "Kết tập lần thứ ba — Pāṭaliputta và Vua Asoka",
    summary:
      "Tôn trưởng Moggaliputtatissa chủ trì, định lại giáo pháp, soạn bộ Kathāvatthu trong Vô Tội Lớn và mở đường cho truyền bá Phật giáo ra toàn cầu.",
    highlight: "Asoka cử 9 đoàn truyền giáo ra 9 hướng — trong đó có đoàn Mahinda xuống Lanka.",
    wiki: { en: "Third Buddhist council" },
    body: [
      "Dưới triều vua Asoka — vị vua Đại đế Maurya quy y sau cuộc chiến Kalinga — Phật giáo trở thành triều đình tôn giáo và được truyền bá mạnh mẽ. Vua dựng nhiều trụ đá (Aśoka Pillar) khắc pháp bảo như tại Sarnath, Sanchi; trụ đá Lumbini xác nhận nơi Phật đản sinh.",
      "Kết tập lần thứ ba diễn ra tại Pāṭaliputta do Tôn trưởng Moggaliputtatissa chủ trì, gạt bỏ các tà thuyết lẫn vào, và soạn bộ Kathāvatthu — bộ thứ bảy trong Vô Tội Lớn (Abhidhamma Piṭaka).",
      "Asoka cử các đoàn truyền giáo: con trai Mahinda và con gái Saṅghamittā xuống Sri Lanka mang theo các kinh chính và cành bồ đề từ Bodhgaya, gieo hạt cho dòng Theravāda ở phương Nam tồn tại đến ngày nay.",
    ],
  },
  {
    id: "fourth-council",
    period: "Kết tập Kinh điển",
    era: "≈ 29 TCN",
    title: "Kết tập lần thứ tư — Sri Lanka, kinh điển lần đầu được ghi chép",
    summary:
      "Tại hang Aluvihāre, Matale — vì chiến loạn và dịch bệnh đe dọa mất truyền khẩu — 500 nhà sư ghi chép toàn bộ Tam tạng Pāli ra văn bản.",
    highlight: "Bản ghi Tam tạng Pāli tại Aluvihāre là văn bản Phật giáo nguyên thủy sớm nhất được bảo tồn toàn vẹn.",
    wiki: { en: "Fourth Buddhist council" },
    body: [
      "Đến thời vua Vaṭṭagāmaṇī Abhaya của Sri Lanka, đất nước chìm trong chiến loạn và đói kém; truyền khẩu giáo pháp có nguy cơ thất truyền. Các Tôn trưởng của tự viện Mahāvihāra quyết định ghi chép toàn bộ Tam tạng ra lá cọ (ola leaves) tại hang Aluvihāre, Matale.",
      "Toàn bộ Tam tạng — Kinh (Sutta), Luật (Vinaya), Vô Tội (Abhidhamma) — cùng phần chú giải được ghi chép bằng tiếng Pāli, lần đầu tiên đi từ truyền khẩu sang văn bản viết. Đây là bộ kinh điển Phật giáo được bảo tồn nguyên văn, hoàn chỉnh nhất trên thế giới.",
      "Từ bản gốc Sri Lanka, Tam tạng Pāli được sao chép lan sang Myanmar, Thái Lan, Lào, Campuchia — và ngày nay là căn bản của toàn bộ học liệu Theravāda.",
    ],
  },
  {
    id: "sri-lanka",
    period: "Sri Lanka",
    era: "TK 3 TCN — nay",
    title: "Sri Lanka — bách niên Mahāvihāra và Buddhaghosa",
    summary:
      "Đảo Lanka trở thành thủ phủ của Theravāda: Mahāvihāra ở Anurādhapura, các đại thiền sư như Buddhaghosa soạn Visuddhimagga, và phong cách truyền giáo tiếng Pāli.",
    highlight: "«Con đường thanh tịnh» (Visuddhimagga) — tác phẩm chín phần của Buddhaghosa — nền tảng học Thiền Theravāda.",
    wiki: { en: "Buddhaghosa" },
    body: [
      "Sri Lanka — «hòn đảo sư tử» — là nơi Theravāda có sự tồn tại liên tục lâu dài nhất trên thế giới. Tự viện Mahāvihāra ở Anurādhapura trở thành trung tâm học thuật, giữ bản gốc Tam tạng và là chuẩn mực cho các dòng sau.",
      "Đầu thế kỷ thứ 5, đại sư Buddhaghosa từ Ấn Độ đến Mahāvihāra, dịch chú giải Singhalese về Pāli và soạn bộ Visuddhimagga (Con đường Thanh tịnh) — một đỉnh cao hệ thống hóa giáo lý và thực hành Thiền của Theravāda: Giới (Sīla), Định (Samādhi), Tuệ (Paññā).",
      "Qua các thời kỳ, đảo Lanka chứng kiến sự hưng thịnh của các tự viện như Abhayagiri, Jetavana; cùng những thời khủng hoảng khi Phật giáo suýt tuyệt tích và phải phục hưng bằng cách tái thọ giới từ Sri Lanka sang các nước láng giềng — truyền thống tái truyền (upasampadā) vẫn diễn ra giữa các quốc gia Theravāda cho đến ngày nay.",
    ],
  },
  {
    id: "southeast-asia",
    period: "Đông Nam Á",
    era: "TK 11–19",
    title: "Truyền vào Đông Nam Á — Myanmar, Thái Lan, Lào, Campuchia",
    summary:
      "Từ thời vua Anawrahta của Bagan và các vương quốc Sukhothai, Lan Xang, Angkor, Theravāda trở thành tôn giáo nền tảng của cả khu vực Đông Nam Á lục địa.",
    highlight: "Myanmar, Thái Lan, Lào, Campuchia — bốn quốc gia Theravāda với hàng trăm nghìn tự viện và truyền thống Tăng già toàn quốc.",
    wiki: { en: "Theravada" },
    body: [
      "Vua Anawrahta của vương quốc Bagan (Myanmar, TK 11) mời Tôn trưởng Shin Arahan từ đất Môn về, đưa Theravāda trở thành tôn giáo nhà nước, mở ra thời đại xây chùa هزار đền ở Bagan. Myanmar trở thành nơi bảo tồn và phục hưng giáo pháp nhiều lần — trong đó có kỳ Kết tập Kinh điển lần thứ 5 ở Mandalay (1871) khắc toàn bộ Tam tạng lên 729 bia đá, và lần thứ 6 tại Yangon (1954–1956) với các quốc gia Theravāda cùng tham dự.",
      "Tại Thái Lan, từ thời Sukhothai (TK 13), vua Ram Khamhaeng mời các Tôn trưởng Sri Lanka sang, thiết lập dòng Mahāvihāra; tiếp đó nhà Ayutthaya và Chakri duy trì Phật giáo làm tôn giáo quốc gia. Truyền thống Tăng già Thái Lan tổ chức quy củ với giáo hội Phật giáo trung ương, hoàng gia chính thức chủ trì các lễ Phật đản, Mai Khao Bùa (Khao Phansa).",
      "Ở Lào, vương quốc Lan Xang (TK 14) trở thành quốc gia Theravāda với tượng Phật ngọc Jade Buddha (Phra Keo) và tự viện Wat Phra That Luang làm biểu tượng. Campuchia — vương quốc Angkor — chuyển từ Mahāyāna Hindu sang Theravāda từ TK 13–14 và giữ truyền thống chùa là trung tâm xã hội nông thôn cho đến ngày nay.",
    ],
  },
  {
    id: "vietnam-theravada",
    period: "Việt Nam",
    era: "TK 2 — nay",
    title: "Phật giáo Theravāda tại Việt Nam",
    summary:
      "Từ những nét đầu ở Óc Eo (Phù Nam) đến sự hiện diện mạnh mẽ của hệ phái Nguyên thủy Nam tông tại miền Nam Việt Nam với Bửu Sơn Kỳ Hương và Tăng già Nam tông.",
    highlight: "Chùa Bửu Long, Tịnh xá Trung tâm, Việt Nam Quốc Tự — những điểm nhấn của Nam tông Việt Nam.",
    wiki: { vi: "Phật giáo Nam tông Việt Nam", en: "Buddhism in Vietnam" },
    body: [
      "Phật giáo đến vùng Nam Việt Nam từ rất sớm: các di chỉ Óc Eo (An Giang, thuộc vương quốc Phù Nam, TK 2–6) khai quật được tượng Phật gỗ và di vật Mahāyāna lẫn Theravāda, cho thấy tuyến thương mại Biển Đông thời cổ đã gắn truyền thống Phật giáo phương Nam với xứ sở này.",
      "Sự hiện diện thực thụ của Theravāda tại Việt Nam hiện đại bắt đầu mạnh mẽ từ đầu TK 20. Năm 1895, Hòa thượng Hộ Tông (Trairatanaransi) người Khmer tại Trà Vinh được phong làm Hòa thượng chuyên môn về Nam tông, mở đường cho hệ phái Nguyên thủy. Tiếp đó, phong trào Bửu Sơn Kỳ Hương của Bồ tát Đoàn Minh Huyên và sự ra đời của Tăng già Nam tông (1960) với chùa Việt Nam Quốc Tự (1964), Tịnh xá Trung tâm (1965) đã đưa giáo lý Theravāda đến đông đảo tín đồ Việt Nam.",
      "Ngày nay hệ phái Theravāda Việt Nam tổ chức chặt chẽ với giáo hội trung ương, trường Phật học Pāli, các lễ Upasatha, Kiết hạ an cư theo đúng Luật tạng. Các khóa học Kinh điển Pāli, thiền Vipassanā theo phong cách Mahāsi và Pa-Auk thu hút cả người trẻ. Phát âm, tụng kinh Pāli và các kỳ lễ Vesak được tổ chức trang nghiêm trên khắp các chùa Nam tông.",
    ],
  },
  {
    id: "modern-revival",
    period: "Hiện đại",
    era: "TK 20 — nay",
    title: "Phục hưng Vipassanā và Theravāda toàn cầu",
    summary:
      "Từ Mahāsi Sayadaw, Ajahn Chah, Ledi Sayadaw đến Goenka — thiền Vipassanā lan ra toàn thế giới; các tự viện Theravāda mọc lên ở phương Tây và qua mạng internet.",
    highlight: "«Hãy đi và tự mình thấy» (Ehipassiko) — tính mở của giáo pháp khiến Theravāda lan tỏa khắp các châu lục.",
    wiki: { en: "Vipassana movement" },
    body: [
      "Đầu TK 20, nhà sư Myanmar Ledi Sayadaw bắt đầu phong trào dạy thiền Vipassanā cho cả cư sĩ — trước đây chỉ dành cho Tăng sĩ. Từ đó, dòng thiền Mahāsi Sayadaw (Yangon), dòng Pa-Auk (phân tích sắc danh), và phương pháp U Ba Khin/Goenka lan khắp Myanmar rồi ra thế giới.",
      "Ở Thái Lan, dòng Ajahn Chah (Phong trào Rừng — Forest Tradition) kết hợp nghiêm trì Luật với thiền tuệ, sinh ra các tự viện Forest Sangha ở Anh, Mỹ, Úc. Dòng Ajahn Mun, Ajahn Sao trở thành mẫu mực cho thiền sư thicket.",
      "Ngày nay Theravāda có hơn 150 triệu tín đồ, từ Sri Lanka, Myanmar, Thái Lan, Lào, Campuchia đến các cộng đồng di cư và tự viện ở Mỹ, châu Âu, Úc. Ứng dụng số như Dharma này tiếp tục sứ mệnh 25 thế kỷ: đưa giáo pháp nguyên thủy đến với mọi người, mọi nơi — Ehipassiko, hãy đến và tự mình kiểm chứng.",
    ],
  },
];

/* ----------------------- Ảnh Wikipedia ----------------------- */
/* Nạp summary để lấy ảnh thumbnail — CORS mở trên Wikipedia REST;  */
/* fallback qua proxy dùng chung với Tin tức & Tra cứu.             */

type WikiSummaryImage = { thumbnail?: { source: string }; originalimage?: { source: string } };

const IMAGE_CACHE_KEY = "dharma-history-images";
type ImageCache = Record<string, string>; // entryId -> imageUrl

function loadImageCache(): ImageCache {
  try {
    const raw = sessionStorage.getItem(IMAGE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ImageCache) : {};
  } catch {
    return {};
  }
}

function saveImageCache(cache: ImageCache) {
  try {
    sessionStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* bỏ qua khi đầy bộ nhớ */
  }
}

/** Nạp ảnh minh họa cho một mục lịch sử (thumbnail Wikipedia). */
export async function fetchHistoryImage(entry: HistoryEntry): Promise<string | undefined> {
  const cache = loadImageCache();
  if (cache[entry.id]) return cache[entry.id];
  if (!entry.wiki) return undefined;

  const candidates: string[] = [];
  if (entry.wiki.vi) candidates.push(`https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entry.wiki.vi)}?redirect=true`);
  if (entry.wiki.en) candidates.push(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entry.wiki.en)}?redirect=true`);

  for (const url of candidates) {
    try {
      const data = await fetchJsonViaProxies<WikiSummaryImage>(url, 10_000);
      const img = data.originalimage?.source || data.thumbnail?.source;
      if (img) {
        // dùng thumbnail kích thước vừa phải nếu là bản original quá lớn
        const sized = data.thumbnail?.source ?? img;
        cache[entry.id] = sized;
        saveImageCache(cache);
        return sized;
      }
      return undefined; // có trang nhưng không có ảnh
    } catch {
      /* thử ứng viên kế tiếp */
    }
  }
  return undefined;
}

/** Link đọc thêm Wikipedia (vi ưu tiên). */
export function wikiUrl(entry: HistoryEntry, lang: "vi" | "en"): string | undefined {
  const title = entry.wiki?.[lang] ?? entry.wiki?.[lang === "vi" ? "en" : "vi"];
  return title ? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}` : undefined;
}
