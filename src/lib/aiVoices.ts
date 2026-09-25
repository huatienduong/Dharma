/**
 * Danh mục GIỌNG NÓI của Trợ lý Phật học — đồng bộ với SERVER_VOICES trong
 * convex/aiChat.ts (máy chủ nhận voice id + male để chọn giọng TTS).
 *
 * Tên hiển thị tiếng Việt cho người dùng; id giữ nguyên (máy server dùng).
 *  • metta   — Nữ, từ ái      ấm áp dịu dàng
 *  • karuna  — Nữ, bi mẫn     trầm dịu
 *  • panna   — Nữ, trí tuệ    sáng rõ
 *  • sati    — Nữ, chánh niệm thong thả
 *  • mettam  — Nam, từ ái     ấm áp thân gần
 *  • adosa   — Nam, vô sân    trầm trang nghiêm
 *  • upekkha — Nam, bình xả   điềm tĩnh
 *  • sila    — Nam, giới đức  sáng rõ
 */

export type AiVoice = {
  id: string;
  name: string; // tên hiển thị (tiếng Việt)
  male: boolean;
  desc: string;
  /** Từ khóa ưu tiên khi chọn giọng Web Speech (tiếng Việt) */
  browser: RegExp;
};

export const AI_VOICES: Record<string, AiVoice> = {
  metta: {
    id: "metta",
    name: "Nữ — Từ Ái",
    male: false,
    desc: "Giọng nữ · ấm áp, dịu dàng",
    browser: /female|nữ|hoa|linh|google\s*vi/i,
  },
  karuna: {
    id: "karuna",
    name: "Nữ — Bi Mẫn",
    male: false,
    desc: "Giọng nữ · trầm dịu, từ bi",
    browser: /female|nữ|google\s*vi/i,
  },
  panna: {
    id: "panna",
    name: "Nữ — Trí Tuệ",
    male: false,
    desc: "Giọng nữ · sáng rõ, tỉnh táo",
    browser: /female|nữ|google\s*vi/i,
  },
  sati: {
    id: "sati",
    name: "Nữ — Chánh Niệm",
    male: false,
    desc: "Giọng nữ · thong thả, an trú",
    browser: /female|nữ|google\s*vi/i,
  },
  mettam: {
    id: "mettam",
    name: "Nam — Từ Ái",
    male: true,
    desc: "Giọng nam · ấm áp, thân gần",
    browser: /male|nam|google\s*vi/i,
  },
  adosa: {
    id: "adosa",
    name: "Nam — Vô Sân",
    male: true,
    desc: "Giọng nam · trầm ấm, trang nghiêm",
    browser: /male|nam|google\s*vi/i,
  },
  upekkha: {
    id: "upekkha",
    name: "Nam — Bình Xả",
    male: true,
    desc: "Giọng nam · điềm tĩnh, bình xả",
    browser: /male|nam|google\s*vi/i,
  },
  sila: {
    id: "sila",
    name: "Nam — Giới Đức",
    male: true,
    desc: "Giọng nam · sáng rõ, minh mẫn",
    browser: /male|nam|google\s*vi/i,
  },
};

/** Giọng mặc định khi người dùng chưa chọn: nữ Từ Ái. */
export const DEFAULT_VOICE_ID = "metta";

export function getVoice(voiceId?: string | null): AiVoice {
  return AI_VOICES[voiceId ?? ""] ?? AI_VOICES[DEFAULT_VOICE_ID];
}

/** Danh sách giọng hiển thị trong bộ chọn, nữ trước nam. */
export const VOICE_LIST: AiVoice[] = [
  AI_VOICES.metta,
  AI_VOICES.karuna,
  AI_VOICES.panna,
  AI_VOICES.sati,
  AI_VOICES.mettam,
  AI_VOICES.adosa,
  AI_VOICES.upekkha,
  AI_VOICES.sila,
];

/** Khóa lưu lựa chọn giọng trong localStorage. */
export const VOICE_PREF_KEY = "ds-assistant-voice";

export function loadVoicePref(): string {
  try {
    return localStorage.getItem(VOICE_PREF_KEY) ?? DEFAULT_VOICE_ID;
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

export function saveVoicePref(voiceId: string) {
  try {
    localStorage.setItem(VOICE_PREF_KEY, voiceId);
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}
