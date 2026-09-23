/**
 * KHO AUDIO (dữ liệu độc lập với trình phát):
 * — NGHE KINH: tụng Pāli công cộng (archive.org — Buddhist Protective Chants)
 * — NHẠC THIỀN: chuông/hạc ambient công cộng (archive.org — Mystical Gongs)
 * Tất cả URL đã xác minh HTTP 206/200 — phát trực tiếp trong ứng dụng.
 */

export type AudioTrack = {
  id: string;
  title: string;
  author: string;
  kind: "chant" | "music";
  url: string;
};

export const AUDIO_TRACKS: AudioTrack[] = [
  /* ------------------------- NGHE KINH (Pāli) ------------------------- */
  {
    id: "chant-buddhanussati",
    title: "Buddhānussati",
    author: "Niệm Phật",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/01.%20Buddhanussati.mp3",
  },
  {
    id: "chant-mettanussati",
    title: "Mettānussati",
    author: "Niệm Từ",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/02.%20Mettanussati.mp3",
  },
  {
    id: "chant-asubhanussati",
    title: "Asubhānussati",
    author: "Niệm Bất Tịnh",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/03.%20Aubhanussati.mp3",
  },
  {
    id: "chant-marananussati",
    title: "Maraṇānussati",
    author: "Niệm Tử",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/04.%20Marananussati.mp3",
  },
  {
    id: "chant-atta-maha",
    title: "Aṭṭha Mahā Saṃvega Vatthu",
    author: "Tám điều khởi não thắng",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/05.%20Atta%20Maha%20Sanvega%20Vatthu.mp3",
  },
  {
    id: "chant-salla",
    title: "Salla Sutta",
    author: "Kinh Mũi Tên",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/06.%20Salla%20Sutta.mp3",
  },
  {
    id: "chant-vijaya",
    title: " Vijaya Sutta",
    author: "Kinh Chiến Thắng",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/07.%20Vijaya%20Sutta.mp3",
  },
  {
    id: "chant-piyehi",
    title: "Piyehi Vippayogo Dukkho",
    author: "Ly biệt người thương là khổ",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/08.%20Piyehi%20Vippayogo%20Dukkho.mp3",
  },
  {
    id: "chant-tilakkhana",
    title: "Ti-Lakkhaṇa",
    author: "Tam pháp ấn",
    kind: "chant",
    url: "https://ia800107.us.archive.org/26/items/buddhist-protective-chants_202103/10.%20Ti-Lakkhana.mp3",
  },

  /* ------------------------- NHẠC THIỀN ------------------------- */
  {
    id: "gong-1",
    title: "Chuông Thiền I",
    author: "Mystical Gongs",
    kind: "music",
    url: "https://ia802808.us.archive.org/24/items/02track2_202002/01%20Track%201.mp3",
  },
  {
    id: "gong-2",
    title: "Chuông Thiền II",
    author: "Mystical Gongs",
    kind: "music",
    url: "https://ia802808.us.archive.org/24/items/02track2_202002/02%20Track%202.mp3",
  },
  {
    id: "gong-3",
    title: "Chuông Thiền III",
    author: "Mystical Gongs",
    kind: "music",
    url: "https://ia802808.us.archive.org/24/items/02track2_202002/03%20Track%203.mp3",
  },
];

/** Nhãn nhóm hiển thị trong tab của trang Nghe. */
export const AUDIO_KIND_LABEL: Record<AudioTrack["kind"], string> = {
  chant: "Nghe kinh",
  music: "Nhạc thiền",
};
