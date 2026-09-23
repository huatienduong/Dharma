// Kho Luận tạng (Abhidhamma Piṭaka) Theravāda — 7 bộ luận chính theo
// truyền thống Mahāvihāra Sri Lanka. Dữ liệu tĩnh luôn có sẵn để tra cứu
// ngay, không phụ thuộc mạng; phần nội dung chuyên sâu do Trợ lý Phật học
// tự biên soạn khi mở từng mục.

export type AbhidhammaEntry = {
  id: string;
  /** Số thứ tự trong 7 bộ Luận tạng (1..7) */
  order?: number;
  title: string;
  pali: string;
  /** Mô tả ngắn về vị trí & nội dung trong Luận tạng */
  desc: string;
  /** Ghi chú về dung lượng / kết cấu */
  note?: string;
};

/** 7 bộ Abhidhamma Piṭaka — thứ tự truyền thống Theravāda. */
export const ABHIDHAMMA_BOOKS: AbhidhammaEntry[] = [
  {
    id: "dhammasangani",
    order: 1,
    title: "Bộ Pháp Tụ",
    pali: "Dhammasaṅgaṇī",
    desc: "Bộ luận mở đầu Luận tạng, liệt kê và phân loại toàn bộ các pháp siêu lý (tâm, tâm sở, sắc pháp, Niết-bàn) theo ba phương diện: bất thiện, thiện và bất định.",
    note: "4 phần (Cittuppādakaṇḍa, Rūpakaṇḍa, Nikkhepakaṇḍa, Aṭṭhakathākaṇḍa)",
  },
  {
    id: "vibhanga",
    order: 2,
    title: "Bộ Phân Tích",
    pali: "Vibhaṅga",
    desc: "Phân tích 18 đề tài giáo lý (uẩn, xứ, giới, đế, quyền, duyên khởi...) bằng ba phương pháp: liệt kê (suttanta), phân tích (abhidhamma) và vấn đáp.",
    note: "18 chương (Vibhaṅga)",
  },
  {
    id: "dhatukatha",
    order: 3,
    title: "Bộ Giới Thuyết",
    pali: "Dhātukathā",
    desc: "Luận về mối tương quan giữa các pháp (uẩn, xứ, giới) — cái nào liên hệ, không liên hệ, đồng sanh, không đồng sanh với cái nào.",
    note: "14 chương vấn đáp",
  },
  {
    id: "puggalapannatti",
    order: 4,
    title: "Bộ Nhân Chế Định",
    pali: "Puggalapaññatti",
    desc: "Phân loại các hạng người (puggala) theo phẩm tính và mức độ tu chứng, từ phàm phu đến bậc Thánh — bổ túc cho phương pháp siêu lý của các bộ trước.",
    note: "10 chương theo nhóm người",
  },
  {
    id: "kathavatthu",
    order: 5,
    title: "Bộ Luận Sự",
    pali: "Kathāvatthu",
    desc: "Ghi lại các cuộc luận tranh do Tôn giả Moggaliputta-tissa chủ trì tại Kết tập thứ 3, bác bỏ 216 quan điểm dị thuyết của các bộ phái đương thời.",
    note: "23 phẩm, 216 luận đề",
  },
  {
    id: "yamaka",
    order: 6,
    title: "Bộ Song Đối",
    pali: "Yamaka",
    desc: "Trình bày các phạm trù giáo lý theo cặp câu hỏi — đáp (song đối) nhằm làm sáng tỏ ranh giới và quan hệ logic giữa các thuật ngữ.",
    note: "10 chương song đối",
  },
  {
    id: "patthana",
    order: 7,
    title: "Bộ Phát Thú",
    pali: "Paṭṭhāna",
    desc: "Bộ luận lớn nhất Luận tạng, trình bày 24 duyên (paccaya) chi phối toàn bộ pháp hữu vi — nền tảng của thuyết duyên khởi siêu lý Theravāda.",
    note: "24 duyên — bộ luận đồ sộ nhất",
  },
];

/** Các phạm trù nền tảng của Vi Diệu Pháp Thượng Tọa Bộ. */
export const ABHIDHAMMA_CATEGORIES: AbhidhammaEntry[] = [
  {
    id: "citta",
    title: "Tâm — Citta",
    pali: "Citta",
    desc: "89 tâm (121 khi phân tích đầy đủ) chia theo cõi, gồm tâm bất thiện, tâm thiện và tâm quả.",
  },
  {
    id: "cetasika",
    title: "Tâm sở — Cetasika",
    pali: "Cetasika",
    desc: "52 tâm sở đồng sanh với tâm: 13 tâm sở biến hành, 14 bất thiện, 25 tịnh hảo.",
  },
  {
    id: "rupa",
    title: "Sắc pháp — Rūpa",
    pali: "Rūpa",
    desc: "28 sắc pháp — phần vật chất của thân, gồm 4 đại và 24 sắc pháp phái sinh.",
  },
  {
    id: "nibbana",
    title: "Niết-bàn — Nibbāna",
    pali: "Nibbāna",
    desc: "Pháp vô vi duy nhất — mục tiêu thứ tư trong 4 pháp siêu lý, không do nhân duyên tạo tác.",
  },
  {
    id: "citta-vithi",
    title: "Tiến trình tâm",
    pali: "Citta-vīthi",
    desc: "Diễn trình sinh khởi của tâm qua 5 môn và ý môn, gồm các lộ tâm (vīthi) và các tâm ngoài lộ.",
  },
  {
    id: "patisandhi",
    title: "Tái tục & nghiệp",
    pali: "Paṭisandhi · Kamma",
    desc: "Tâm tái tục nối liền các kiếp sống; nghiệp và 31 cõi hiện hữu theo tầng bậc tu tập.",
  },
  {
    id: "abhidhammattha-sangaha",
    title: "Thắng Pháp Tập Yếu",
    pali: "Abhidhammattha-saṅgaha",
    desc: "Luận thư tóm tắt toàn bộ Vi Diệu Pháp của Tôn giả Anuruddha — cẩm nang học Abhidhamma phổ biến nhất.",
  },
  {
    id: "visuddhimagga",
    title: "Thanh Tịnh Đạo",
    pali: "Visuddhimagga",
    desc: "Luận thư của Tôn giả Buddhaghosa — bảy thanh tịnh, con đường tu tập dẫn đến giải thoát.",
  },
];

/** Gộp cả 7 bộ luận và các phạm trù nền tảng để tra cứu/tìm kiếm. */
export const ABHIDHAMMA_ALL: AbhidhammaEntry[] = [
  ...ABHIDHAMMA_BOOKS,
  ...ABHIDHAMMA_CATEGORIES,
];

export function getAbhidhammaEntry(id: string): AbhidhammaEntry | undefined {
  return ABHIDHAMMA_ALL.find((e) => e.id === id);
}
