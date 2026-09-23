/**
 * TRÍCH KINH PHÁP CÚ (Dhammapada) — hiện ngẫu nhiên trên Trang chủ.
 * Mỗi câu gồm bản dịch nghĩa tiếng Việt + nguyên văn Pāli.
 * Dịch theo bản kinh Pháp Cú (Bộ kinh Tiểu Bộ, Khuddaka Nikāya).
 */

export type DhpVerse = {
  n: number; // số câu trong Kinh Pháp Cú
  vi: string;
  pali: string;
};

export const DHAMMAPADA: DhpVerse[] = [
  {
    n: 1,
    vi: "Tâm là chủ đạo, dẫn đưa mọi pháp; tâm là tối thượng, tâm tạo thành các pháp. Khi tâm bất thiện mà nói hay hành động, khổ đau theo sau như bánh xe theo chân con vật kéo xe.",
    pali: "Manopubbaṅgamā dhammā, manoseṭṭhā manomayā; manasā ce paduṭṭhena, bhāsati vā karoti vā; tato naṃ dukkhamanveti, cakkaṃ va vahato padaṃ.",
  },
  {
    n: 5,
    vi: "Hận thù không thể nào dập tắt được hận thù; chỉ có lòng không hận mới dập tắt được hận thù. Đây là pháp luật muôn đời.",
    pali: "Na hi verena verāni, sammantīdha kudācanaṃ; averena ca sammanti, esa dhammo sanantano.",
  },
  {
    n: 35,
    vi: "Tâm rung động chao đảo, khó chế ngự, khó giữ gìn — bậc trí điều phục tâm như thợ cung tên nắn thẳng mũi tên.",
    pali: "Dubbaṭṭho caritāssā ya, dunnivarāya uṭṭhitaṃ; taṃ ve seṭṭhaṃ manodhātu, uṭṭhitaṃ sabbadhammehi.",
  },
  {
    n: 103,
    vi: "Dù người giết ngàn ngàn quân địch trên chiến trường, người chiến thắng chính mình còn cao quý hơn gấp vạn lần.",
    pali: "Yo sahassampi sahe, saṃgāme mantanibbalaṃ; añcaṃ buddhiyā jahe, sahassāmanusaṃ care.",
  },
  {
    n: 129,
    vi: "Ai dùng roi đánh đập chúng sinh, muốn yên ổn mà còn biết sợ hãi; cũng như chính mình muốn sống yên ổn, người khác cũng vậy biết sợ roi.",
    pali: "Sabbe tasanti daṇḍassa, sabbe bhāyanti maccuno; attānaṃ upamaṃ katvā, na haneyya na ghātaye.",
  },
  {
    n: 160,
    vi: "Chính mình là nơi nương tựa của mình; chính mình là người chủ của mình. Do đó, hãy chế ngự mình như thương gia chế ngự con ngựa quý.",
    pali: "Attā hi attano nātho, ko hi nātho paro siyā; attanā eva sudantena, nāthaṃ labhati dullabhaṃ.",
  },
  {
    n: 183,
    vi: "Không làm các điều ác, khéo làm các việc lành, giữ tâm ý trong sạch — đó là lời dạy của chư Phật.",
    pali: "Sabbapāpassa akaraṇaṃ, kusalassa upasampadā; sacittapariyodapanaṃ, etaṃ buddhāna sāsanaṃ.",
  },
  {
    n: 190,
    vi: "Người nương tựa Đức Phật, Pháp, Tăng và con đường thánh — với trí tuệ thấy rõ Tứ Diệu Đế, thoát mọi khổ đau.",
    pali: "Buddhaṃ saraṇaṃ gacchāmi, Dhammañca saṅghañca; paññāya daṭṭhā sabbepi, dukkhā te bhavanti sabbe.",
  },
  {
    n: 204,
    vi: "Sức khỏe là lợi lạc cao nhất, bằng lòng là phúc báo quý nhất; tin tưởng là thân quyến tốt nhất, Niết-bàn là hạnh phúc tối thượng.",
    pali: "Ārogyaparamā lābhā, saṭṭhiparamā yaṃ sukhaṃ; viśāsāparamā mitti, nibbānaṃ paramaṃ sukhaṃ.",
  },
  {
    n: 212,
    vi: "Vì yêu thương nên ưu buồn, vì yêu thương nên sợ hãi; người thoát khỏi ràng buộc yêu ái, không còn ưu buồn, không còn sợ hãi.",
    pali: "Piyato jāyatī soko, piyato jāyatī bhayaṃ; piyato vippamuttassa, natthi soko kuto bhayaṃ.",
  },
  {
    n: 223,
    vi: "Hãy thắng cơn giận bằng lòng không giận, thắng điều ác bằng điều lành, thắng lòng keo kiệt bằng bố thí, thắng kẻ nói dối bằng lời nói thật.",
    pali: "Akkodhena jine kodhaṃ, asādhuṃ sādhunā jine; jine kadariyaṃ dānena, saccenālikavādinaṃ.",
  },
  {
    n: 276,
    vi: "Các Phật chỉ trỏ con đường; hãy tự tu tập để giải thoát — con đường trong sạch là con đường ta đã đi.",
    pali: "Tumhehi kiccamātappaṃ, akkhātāro tathāgatā; paṭipattā pamokkhanti, jhāyino mārabandhanā.",
  },
  {
    n: 320,
    vi: "Như voi chiến giữa trận, chịu mũi tên bắn vùi; ta cũng vậy, chịu nhục mà không than — trầm tĩnh kiên nhẫn như cây đại thụ.",
    pali: "Ahaṃ nāgo va saṅgāme, cāpato patitaṃ saraṃ; atmto daṇḍagahātissa, tamhā so ṭhātamācare.",
  },
  {
    n: 368,
    vi: "Bậc có thân an trú, lời an trú, tâm an trú, không thèm khát thế tục — gọi là người an tịnh sáng suốt.",
    pali: "Passaddhakāyasātā pā, passaddhavacanā bhikkhu; passaddhamānasaṃ ñatvā, santusitā upādānaṃ.",
  },
  {
    n: 383,
    vi: "Hãy dũng cảm vượt qua dòng luân hồi, xa lánh các dục; đã dứt các pháp ràng buộc, không còn tham ái — chứng Niết-bàn an lành.",
    pali: "Chinda sote parakkamma, kāme panuda brāhmaṇa; saṅkhārānaṃ khayaṃ ñatvā, akataññūsi brāhmaṇa.",
  },
  {
    n: 423,
    vi: "Bậc đã vượt qua dòng xoáy rộng lớn, vượt bờ bên kia, đã thắng mọi cấu kết, dứt mọi dây trói, không bị phiền não xâm phạm — đó là bậc Bà-la-môn chiến thắng.",
    pali: "Yo gāme so pāraṃ taraṇo, sotasāghātimattiyam; aviññāpayitattā jhāyī, tam ahaṃ brūmi brāhmaṇaṃ.",
  },
];

/** Lấy một câu Pháp Cú ngẫu nhiên (ổn định trong một phiên nhờ seed). */
export function randomDhpVerse(): DhpVerse {
  return DHAMMAPADA[Math.floor(Math.random() * DHAMMAPADA.length)];
}
