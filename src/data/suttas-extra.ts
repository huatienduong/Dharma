import type { Sutta } from "./suttas";

/* ------------------------------------------------------------------ */
/* BỔ SUNG KHO KINH TẠNG — những bài kinh QUAN TRỌNG NHẤT của Phật giáo */
/* Nguyên thủy (Theravāda) chưa có trong kho cốt lõi. Mỗi bài kèm:      */
/*   • Pāli gốc (trích đoạn then chốt)                                  */
/*   • Dịch nghĩa tiếng Việt                                            */
/*   • Luận giải + Chú giải (Aṭṭhakathā)                                */
/* ------------------------------------------------------------------ */

export const SUTTAS_EXTRA: Sutta[] = [
  {
    id: "mn10",
    pitaka: "nikaya",
    collection: "Trung Bộ Kinh (Majjhima Nikāya)",
    nikaya: "MN",
    number: "10",
    title: "Kinh Đại Niệm Xứ",
    paliTitle: "Mahāsatipaṭṭhāna Sutta",
    location: "Xứ Kuru — Kammāsadhamma",
    speaker: "Đức Phật",
    summary:
      "Con đường độc nhất đưa đến thanh tịnh chúng sanh: bốn niệm xứ — quán thân, quán thọ, quán tâm, quán pháp.",
    sections: [
      {
        heading: "Lời mở đầu — Con đường độc nhất",
        text: [
          "«Ekāyano ayaṃ, bhikkhave, maggo sattānaṃ visuddhiyā, sokaparidevānaṃ samatikkamāya, dukkhadomanassānaṃ atthaṅgamāya, ñāyassa adhigamāya, nibbānassa sacchikiriyāya, yadidaṃ cattāro satipaṭṭhānā.»",
          "«Này các Tỳ-kheo, đây là con đường độc nhất (ekāyano maggo) đưa đến thanh tịnh cho chúng sanh, vượt khỏi sầu bi, diệt trừ khổ ưu, thành tựu chánh trí, chứng ngộ Niết-bàn — đó là bốn niệm xứ.»",
          "Bốn niệm xứ: quán thân trong thân (kāyānupassanā), quán thọ trong thọ (vedanānupassanā), quán tâm trong tâm (cittānupassanā), quán pháp trong pháp (dhammānupassanā).",
        ],
      },
      {
        heading: "Quán thân — Niệm hơi thở",
        text: [
          "«Idha, bhikkhave, bhikkhu araññagato vā rukkhamūlagato vā suññāgāragato vā nisīdati pallaṅkaṃ ābhujitvā ujuṃ kāyaṃ paṇidhāya parimukhaṃ satiṃ upaṭṭhapetvā.»",
          "«Ở đây, này các Tỳ-kheo, Tỳ-kheo đi đến khu rừng, gốc cây hay nhà trống, ngồi kiết già, giữ thân thẳng, đặt niệm trước mặt.»",
          "«So satova assasati, sato passasati» — «Vị ấy chánh niệm thở vào, chánh niệm thở ra.» Rồi quán niệm thân ngay trong thân, không dính mắc vào tham ưu ở đời.",
        ],
      },
      {
        heading: "Ba mươi bảy phẩm trợ đạo trong bốn niệm xứ",
        text: [
          "Quán pháp bao gồm: năm triền cái (nīvaraṇa), năm uẩn (khandha), sáu xứ nội-ngoại (āyatana), bảy giác chi (bojjhaṅga), Tứ Diệu Đế (ariyasacca) — tức toàn bộ ba mươi bảy phẩm trợ đạo đều được bao trùm trong bốn niệm xứ.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Vì sao gọi là «độc nhất»?",
        text: [
          "«Ekāyano» không nghĩa là con đường duy nhất theo nghĩa loại trừ, mà là con đường đi THẲNG MỘT LỐI, không rẽ ngang: từ niệm thân đến niệm thọ, tâm, pháp theo một trật tự dẫn thẳng đến giải thoát.",
          "Bốn niệm xứ là toàn thể pháp tu: chỉ (samatha) và quán (vipassanā) đều nằm trong đó. Không cần thêm con đường nào khác.",
        ],
      },
      {
        heading: "Tứ niệm xứ và Bát Chánh Đạo",
        text: [
          "Chánh niệm và chánh định trong Bát Chánh Đạo chính là tuệ giác sinh khởi từ bốn niệm xứ. Kinh Đại Niệm Xứ vì thế là bản đồ thực hành đầy đủ nhất mà Đức Phật để lại.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā (Sumaṅgalavilāsinī)",
        text: [
          "Chú giải giải thích «ekāyano» là con đường của một người (ekassa ayanaṃ) — đi một mình, không đồng hành với phiền não; cũng là con đường phải đi một lần mà tới đích.",
          "Đức Phật thuyết kinh này tại xứ Kuru vì dân xứ ấy có sức khỏe, trí tuệ và khí hậu thuận lợi cho tu tập niệm xứ — bối cảnh được chọn lựa có chủ ý.",
        ],
      },
    ],
  },
  {
    id: "mn118",
    pitaka: "nikaya",
    collection: "Trung Bộ Kinh (Majjhima Nikāya)",
    nikaya: "MN",
    number: "118",
    title: "Kinh Niệm Hơi Thở",
    paliTitle: "Ānāpānasati Sutta",
    location: "Khu vườn Đông (Pubbārāma), Sāvatthī",
    speaker: "Đức Phật",
    summary:
      "Niệm hơi thở được tu tập đầy đủ sẽ viên mãn bốn niệm xứ, bảy giác chi và cuối cùng là minh giải thoát.",
    sections: [
      {
        heading: "Niệm hơi thở viên mãn bốn niệm xứ",
        text: [
          "«Ānāpānasati, bhikkhave, bhāvitā bahulīkatā mahapphalā hoti mahānisaṃsā.»",
          "«Này các Tỳ-kheo, niệm hơi thở được tu tập, được làm cho sung mãn, đưa đến quả lớn, lợi ích lớn.»",
          "«Ānāpānasati, bhikkhave, bhāvitā bahulīkatā cattāro satipaṭṭhāne paripūreti; cattāro satipaṭṭhānā bhāvitā bahulīkatā satta bojjhaṅge paripūreti; satta bojjhaṅgā bhāvitā bahulīkatā vijjāvimuttiṃ paripūrenti.»",
          "«Niệm hơi thở tu tập sung mãn làm viên mãn bốn niệm xứ; bốn niệm xứ làm viên mãn bảy giác chi; bảy giác chi làm viên mãn minh giải thoát (vijjāvimutti).»",
        ],
      },
      {
        heading: "Mười sáu đề mục — Bốn tứ",
        text: [
          "Nhóm thân: thở vào dài/ngắn (biết rõ); cảm nhận toàn thân; an tịnh thân hành.",
          "Nhóm thọ: cảm nhận hỷ; cảm nhận lạc; cảm nhận tâm hành; an tịnh tâm hành.",
          "Nhóm tâm: cảm nhận tâm; làm tâm hoan hỷ; định tâm; giải thoát tâm.",
          "Nhóm pháp: quán vô thường; quán ly tham; quán diệt; quán xả ly.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Một đề mục — toàn bộ con đường",
        text: [
          "Kinh này là bằng chứng Đức Phật không dạy hai pháp tu tách rời nhau: chỉ và quán cùng nằm trong một đề mục. Khi hơi thở được theo dõi với chánh niệm, mười sáu đề mục tự mở ra như mười sáu cánh cửa của cùng một ngôi nhà.",
          "Trình tự «niệm hơi thở → niệm xứ → giác chi → minh giải thoát» là bản đồ dọc của toàn bộ Ba mươi bảy phẩm trợ đạo.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải phân biệt bốn giai đoạn của định niệm hơi thở: đếm (gaṇanā), theo dõi (anubandhanā), tiếp xúc (phusana), an trú (ṭhapana) — bốn bước dạy cho người mới trước khi đi vào mười sáu đề mục.",
          "«Vijjāvimutti» được chú giải là chánh kiến (đạo tuệ) và quả giải thoát — không phải hai sự kiện khác nhau mà là nhân và quả của cùng một tiến trình.",
        ],
      },
    ],
  },
  {
    id: "mn21",
    pitaka: "nikaya",
    collection: "Trung Bộ Kinh (Majjhima Nikāya)",
    nikaya: "MN",
    number: "21",
    title: "Kinh Ví Dụ Cái Cưa",
    paliTitle: "Kakacūpama Sutta",
    location: "Khu vườn Jeta, Sāvatthī",
    speaker: "Đức Phật",
    summary:
      "Dù bị cắt xẻ bằng cái cưa, người tu vẫn giữ tâm từ — chuẩn mực tối thượng của nhẫn nhục và tâm từ.",
    sections: [
      {
        heading: "Năm cấp độ thắng phục sân hận",
        text: [
          "Đức Phật dạy: khi bị nói lời không tốt, hãy tu tập tâm từ ngay cả với người đang sân hận — trong thời gian ngắn, lâu dài, và với cả kẻ đang hủy hoại mình.",
          "«Ubhatodaṇḍakena, bhikkhave, kakacena corā ocarakā muttāyaṃ ākaḍḍhaṃsu ... tatra pi ce, bhikkhave, bhikkhu ... cittaṃ padūseyya, na tena mama sāsane pakkhando bhavissati.»",
          "«Dù bọn cướp dùng cưa hai lưỡi cắt xẻ tay chân ngươi, nếu ngươi khởi tâm sân hận thì cũng chưa phải là đệ tử của ta.»",
        ],
      },
      {
        heading: "Mettā hơn cả đất, nước, lửa, gió",
        text: [
          "«Seyyathāpi, bhikkhave, pathavī ... āpo ... tejo ... vāyo ...»",
          "Như đất, nước, lửa, gió không hề ghê tởm những gì bất tịnh — tâm từ phải rộng lớn và bình đẳng như vậy.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Tâm từ không phải là phép nhịn",
        text: [
          "Kinh không dạy «cố gắng chịu đựng», mà dạy phá vỡ cấu trúc sân bằng cách mở rộng tâm đến mức sân không còn chỗ đứng. Nhịn để sân tích tụ; tu từ để sân tiêu tan.",
          "Chuẩn mực ở đây rất cao vì mục đích rất thực: một tâm sân dù rất nhỏ cũng đủ để phá hủy toàn bộ định và tuệ vừa xây.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải ví tâm từ như nước hồ mát đổ vào đám cháy; và nhấn mạnh phần «với tất cả mọi người, không giới hạn» — vì từ tâm có giới hạn thì vẫn còn là vùng tranh chấp.",
        ],
      },
    ],
  },
  {
    id: "sn35.28",
    pitaka: "nikaya",
    collection: "Tương Ưng Bộ Kinh (Saṃyutta Nikāya)",
    nikaya: "SN",
    number: "35.28",
    title: "Kinh Lửa Cháy",
    paliTitle: "Ādittapariyāya Sutta",
    location: "Gāyāsīsa, Gayā",
    speaker: "Đức Phật",
    summary:
      "Bài kinh thứ ba sau giác ngộ: tất cả sáu giác quan đang cháy bởi lửa tham, sân, si — nhàm chán, ly tham, giải thoát.",
    sections: [
      {
        heading: "Tất cả đều đang cháy",
        text: [
          "«Sabbaṃ, bhikkhave, ādittaṃ. Kiñca, bhikkhave, sabbaṃ ādittaṃ?»",
          "«Này các Tỳ-kheo, tất cả đều đang cháy. Thế nào là tất cả đang cháy?»",
          "«Cakkhuṃ, bhikkhave, ādittaṃ ... sotaṃ ādittaṃ ... ghānaṃ ādittaṃ ... jivhā ādittā ... kāyo āditto ... mano āditto.»",
          "Mắt, tai, mũi, lưỡi, thân, ý đều đang cháy — cháy bởi lửa tham (rāga), lửa sân (dosa), lửa si (moha).",
        ],
      },
      {
        heading: "Kết quả của nhàm chán",
        text: [
          "«Evaṃ passaṃ, bhikkhave, sutavā ariyasāvako cakkhusmimpi nibbindati ... nibbindaṃ virajjati; virāgā vimuccati.»",
          "«Thấy vậy, này các Tỳ-kheo, bậc Thánh đệ tử nhàm chán mắt... nhàm chán nên ly tham; ly tham nên giải thoát.»",
          "Khi giải thoát, khởi tri: «San khīṇā jāti, vusitaṃ brahmacariyaṃ, kataṃ karaṇīyaṃ, nāparaṃ itthattāyā» — «Sanh đã tận, phạm hạnh đã thành, việc cần làm đã làm, không còn trở lại đời này nữa.»",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Ngọn lửa của giác quan",
        text: [
          "Kinh không nói thế giới là xấu, mà nói cách ta tiếp xúc với nó đang bốc cháy. Lửa ở đây là phản ứng tự động: thích — bám; không thích — chống.",
          "Ba chữ «nibbindati → virajjati → vimuccati» (nhàm chán → ly tham → giải thoát) là trật tự không thể đảo: không có ly tham nếu chưa thấy rõ sự bất toại nguyện; không có giải thoát nếu chưa ly tham.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải kể rằng sau bài kinh này, một ngàn vị Tỳ-kheo theo phái thờ lửa (jaṭila) đã đắc quả A-la-hán — họ từng thờ ngọn lửa thiêng, nay Phật chỉ cho thấy ngọn lửa thật đang đốt cháy chính họ.",
        ],
      },
    ],
  },
  {
    id: "sn12.2",
    pitaka: "nikaya",
    collection: "Tương Ưng Bộ Kinh (Saṃyutta Nikāya)",
    nikaya: "SN",
    number: "12.2",
    title: "Kinh Phân Tích Nhân Duyên",
    paliTitle: "Vibhaṅga Sutta",
    location: "Khu vườn Jeta, Sāvatthī",
    speaker: "Đức Phật",
    summary:
      "Định nghĩa từng chi phần của mười hai nhân duyên (paṭiccasamuppāda) — xương sống của giáo lý Nguyên thủy.",
    sections: [
      {
        heading: "Định nghĩa mười hai chi",
        text: [
          "«Katamo ca, bhikkhave, paṭiccasamuppādo? Avijjāpaccayā, bhikkhave, saṅkhārā; saṅkhārapaccayā viññāṇaṃ; viññāṇapaccayā nāmarūpaṃ; nāmarūpapaccayā saḷāyatanaṃ; saḷāyatanapaccayā phasso; phassapaccayā vedanā; vedanāpaccayā taṇhā; taṇhāpaccayā upādānaṃ; upādānapaccayā bhavo; bhavapaccayā jāti; jātipaccayā jarāmaraṇaṃ ...»",
          "«Do vô minh duyên hành; do hành duyên thức; do thức duyên danh-sắc; do danh-sắc duyên sáu xứ; do sáu xứ duyên xúc; do xúc duyên thọ; do thọ duyên ái; do ái duyên thủ; do thủ duyên hữu; do hữu duyên sanh; do sanh duyên già, chết, sầu, bi, khổ, ưu, não.»",
        ],
      },
      {
        heading: "Định nghĩa từng chi phần",
        text: [
          "Vô minh (avijjā): không biết về khổ, nguyên nhân khổ, sự diệt khổ, con đường diệt khổ.",
          "Hành (saṅkhārā): hành động, lời nói, tư tưởng có tác ý, tạo nghiệp.",
          "Thức (viññāṇaṃ): nhận biết theo sáu môn.",
          "Danh-sắc (nāmarūpaṃ): bốn uẩn vô sắc và sắc pháp.",
          "Ái (taṇhā): ba loại — dục ái, hữu ái, vô hữu ái.",
          "Thủ (upādānaṃ): bốn loại — dục thủ, kiến thủ, giới cấm thủ, ngã luận thủ.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Duyên khởi không phải dòng thời gian",
        text: [
          "Mười hai chi không phải chuỗi mắt xích trải qua nhiều kiếp theo nghĩa máy móc, mà là cấu trúc nhân quả đồng khởi trong mỗi khoảnh khắc tiếp xúc. Hiểu đúng điều này thì «vô minh diệt → hành diệt» là việc làm được ngay ở chi phần đang hoạt động.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải nhấn mạnh ba vòng (tīṇi vattāni) của duyên khởi: phiền não vòng (kilesavaṭṭa), nghiệp vòng (kammavaṭṭa), quả vòng (vipākavaṭṭa) — ba bánh xe quay quanh nhau không có điểm bắt đầu.",
        ],
      },
    ],
  },
  {
    id: "an3.65",
    pitaka: "nikaya",
    collection: "Tăng Chi Bộ Kinh (Aṅguttara Nikāya)",
    nikaya: "AN",
    number: "3.65",
    title: "Kinh Kalama — Tiêu Chuẩn Của Niềm Tin",
    paliTitle: "Kesamutti (Kālāma) Sutta",
    location: "Kesamutta, xứ Kosala",
    speaker: "Đức Phật",
    summary:
      "Đừng tin vì nghe truyền miệng hay truyền thống — hãy tự mình biết rõ điều nào đưa đến hại và khổ, điều nào đưa đến lợi và lạc.",
    sections: [
      {
        heading: "Mười điều không nên vội tin",
        text: [
          "«Mā anussavena, mā paramparāya, mā itikirāya, mā piṭakasampadāya, mā takkahetu, mā nayahetu, mā ākāraparivitakkena, mā diṭṭhinijjhānakkhantiyā, mā bhabbarūpatāya, mā samaṇo no garūti.»",
          "«Chớ tin vì nghe truyền miệng; chớ tin vì truyền thống; chớ tin vì tin đồn; chớ tin vì kinh điển; chớ tin vì suy luận; chớ tin vì lý luận; chớ tin vì hình thức; chớ tin vì hợp ý mình; chớ tin vì vị thầy có vẻ đáng kính.»",
          "«Yadā tumhe, kālāmā, attanāva jāneyyātha: ‘ime dhammā akusalā ... saṃvattanti ahitāya dukkhāyā’ti, atha tumhe, kālāmā, pajaheyyātha.»",
          "«Khi các ngươi TỰ MÌNH biết rõ: những pháp này là bất thiện, đưa đến hại và khổ — hãy từ bỏ.»",
        ],
      },
      {
        heading: "Tiêu chuẩn thực nghiệm",
        text: [
          "Tiêu chuẩn Đức Phật đưa ra không phải uy tín của người nói, mà là kinh nghiệm trực tiếp về hậu quả: tham–sân–si dẫn đến hại mình, hại người, hại cả hai — nên từ bỏ; vô tham–vô sân–vô si dẫn đến lợi mình, lợi người — nên tu tập.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Tự do tư tưởng trong Phật giáo",
        text: [
          "Kinh Kalama không phủ nhận truyền thống hay kinh điển, mà đặt chúng đúng vị trí: là điều đáng tham khảo, không phải điều miễn kiểm chứng. Đức Phật trao quyền phán đoán cho chính người nghe — điều rất hiếm trong bối cảnh tôn giáo đương thời.",
          "Đây cũng là nền tảng đạo đức: hành động đúng phải được thấy bằng chính trải nghiệm của mình, nếu không nó chỉ là sự vâng lời.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải giải thích mười điều trên là mười «cửa» khiến người ta chấp nhận điều chưa kiểm chứng; và nhấn mạnh chữ «attanāva» (tự mình) — sự hiểu biết phải là của chính người học, không mượn được.",
        ],
      },
    ],
  },
  {
    id: "dn31",
    pitaka: "nikaya",
    collection: "Trường Bộ Kinh (Dīgha Nikāya)",
    nikaya: "DN",
    number: "31",
    title: "Kinh Giáo Thọ Thi Ca La Việt",
    paliTitle: "Sigālovāda Sutta",
    location: "Khu vườn Jeta, Rājagaha",
    speaker: "Đức Phật",
    summary:
      "Bổn phận đạo đức của người tại gia theo sáu phương: cha mẹ, thầy tổ, vợ chồng, bạn bè, chủ–tớ, tu sĩ.",
    sections: [
      {
        heading: "Bối cảnh — Người con vái sáu phương",
        text: [
          "Thanh niên Sigāla vái sáu phương theo di huấn của cha. Đức Phật dạy rằng vái như vậy không phải là cách kính lễ đúng theo Thánh pháp, mà sáu phương phải được hiểu là sáu mối quan hệ phải được chu toàn.",
          "«Cha disā, gahapati, veditabbā? Puratthimā disā mātāpitā ... dakkhiṇā disā ācariyā ... pacchimā disā puttadārā ... uttarā disā mittāmaccā ... heṭṭhimā disā dāsakammakarā ... uparimā disā samaṇabrāhmaṇā.»",
          "Đông là cha mẹ; Nam là thầy tổ; Tây là vợ chồng con cái; Bắc là bạn bè; Dưới là chủ–tớ; Trên là tu sĩ, bậc tu hành.",
        ],
      },
      {
        heading: "Bốn điều không nên làm để khỏi mất tài sản",
        text: [
          "«Cattārimāni, gahapati, apāyamukhāni: surāmerayamajjapamādaṭṭhānaṃ, vikālavisikhācariyānuyogo, samajjābhicaraṇaṃ, pāpamittānuyogo.»",
          "Sáu cửa hao tài: say rượu, đi chơi khuya, la cà hội hè, cờ bạc, giao du ác hữu, biếng nhác.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Đạo đức tại gia trọn vẹn",
        text: [
          "Kinh này là bản hiến chương xã hội của Phật giáo Nguyên thủy: giải thoát không đòi phải xuất gia, nhưng đòi các mối quan hệ được chu toàn. Mỗi phương có năm bổn phận đối ứng — quan hệ là hai chiều, không phải quyền hành một phía.",
          "Đức Phật trao cho cả sáu hướng cùng một trọng lượng đạo đức: một người «hướng Bắc» (bạn bè) cẩu thả không thể là người «hướng Đông» (cha mẹ) trọn vẹn.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải ghi Sigāla là con của một gia chủ tại Rājagaha, dạy rằng vái phương là truyền thống dân gian; Đức Phật giữ hình thức nhưng đổi nội dung — biến nghi lễ thành đạo đức sống.",
        ],
      },
    ],
  },
  {
    id: "dhp1",
    pitaka: "nikaya",
    collection: "Tiểu Bộ Kinh — Pháp Cú (Khuddaka Nikāya)",
    nikaya: "KHP",
    number: "1–2",
    title: "Pháp Cú — Phẩm Song Yếu",
    paliTitle: "Dhammapada, Yamakavagga 1–2",
    location: "Do nhiều dịp khác nhau",
    speaker: "Đức Phật",
    summary:
      "Tâm là gốc của mọi pháp: tâm nhiễm ô thì khổ theo; tâm thanh tịnh thì lạc theo như bóng với hình.",
    sections: [
      {
        heading: "Kệ 1 — Tâm nhiễm ô",
        text: [
          "«Manopubbaṅgamā dhammā, manoseṭṭhā manomayā; manasā ce paduṭṭhena, bhāsati vā karoti vā; tato naṃ dukkhamanveti, cakkaṃva vahato padaṃ.»",
          "«Các pháp do tâm dẫn đầu, tâm là chủ, do tâm tạo thành. Nếu nói hay làm với tâm nhiễm ô, khổ đau theo liền như bánh xe theo chân con vật kéo.»",
        ],
      },
      {
        heading: "Kệ 2 — Tâm thanh tịnh",
        text: [
          "«Manopubbaṅgamā dhammā, manoseṭṭhā manomayā; manasā ce pasannena, bhāsati vā karoti vā; tato naṃ sukhamanveti, chāyāva anapāyinī.»",
          "«Các pháp do tâm dẫn đầu, tâm là chủ, do tâm tạo thành. Nếu nói hay làm với tâm thanh tịnh, an lạc theo liền như bóng với hình.»",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Vì sao mở đầu bằng tâm?",
        text: [
          "Hai kệ mở đầu toàn bộ Pháp Cú định vị toàn bộ đạo Phật vào tâm: không có hành động nào là «trung tính» về mặt tâm. Cùng một việc làm, tâm dẫn đầu khác nhau thì nghiệp quả khác nhau.",
          "«Manopubbaṅgamā» — tâm là người dẫn đường: điều này vừa là chẩn đoán vừa là phương pháp. Nếu tâm dẫn đầu, sửa tâm là sửa gốc.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Dhammapada Atthakathā",
        text: [
          "Chú giải kể câu chuyện của Tỳ-kheo Cakkhupāla — mù mắt do phẫu thuật nhưng đã chứng quả; và chuyện vua Pasenadi, làm nền cho hai kệ đầu: tâm dẫn dắt cảnh ngộ, không phải cảnh ngộ dẫn dắt tâm.",
        ],
      },
    ],
  },
  {
    id: "mn63",
    pitaka: "nikaya",
    collection: "Trung Bộ Kinh (Majjhima Nikāya)",
    nikaya: "MN",
    number: "63",
    title: "Kinh Tiểu Mã Luân",
    paliTitle: "Cūḷamālukyaputta Sutta",
    location: "Khu vườn Jeta, Sāvatthī",
    speaker: "Đức Phật",
    summary:
      "Ví dụ mũi tên: người trúng tên độc không nên hỏi lai lịch kẻ bắn mà phải nhổ mũi tên trước — khổ đau cần được giải quyết ngay.",
    sections: [
      {
        heading: "Ví dụ mũi tên độc",
        text: [
          "«Seyyathāpi, mālukyaputta, puriso sallena viddho assa savisena; tassa mittāmaccā ñātisālohitā ... tikicchakaṃ ānetha.»",
          "«Như có người bị mũi tên tẩm thuốc độc bắn trúng; bạn bè thân thuộc liền đưa thầy thuốc đến.»",
          "Người ấy không chịu cho nhổ tên cho đến khi biết rõ: người bắn thuộc giai cấp nào, tên gì, mũi tên làm bằng gì, dây cung làm bằng gì… Vị ấy sẽ chết trước khi biết hết.",
        ],
      },
      {
        heading: "Những câu hỏi Phật không trả lời",
        text: [
          "Thế giới thường hằng hay vô thường, hữu biên hay vô biên, Như Lai có tồn tại sau khi chết hay không — những câu hỏi ấy Đức Phật không tuyên bố, vì chúng không đưa đến ly tham, giác ngộ, Niết-bàn.",
        ],
      },
    ],
    lunGiai: [
      {
        heading: "Thứ tự ưu tiên của giải thoát",
        text: [
          "Kinh này không dạy đầu hàng trước câu hỏi, mà dạy thứ tự ưu tiên: chuyện khổ phải được giải quyết trước chuyện siêu hình. Người tu bị trúng tên độc của tham–sân–si, và việc cấp thiết là nhổ tên, không phải truy vấn lai lịch người bắn.",
        ],
      },
    ],
    chuGiai: [
      {
        heading: "Theo Atthakathā",
        text: [
          "Chú giải ghi Tỳ-kheo Mālukyaputta hoàn tục sau khi nghe kinh; kinh được xếp vào nhóm «avyākata» (điều không tuyên bố) cùng mười bốn câu hỏi siêu hình truyền thống.",
        ],
      },
    ],
  },
];
