/**
 * Danh mục GIỌNG NÓI của Trợ lý Phật học — đồng bộ với SERVER_VOICES trong
 * convex/aiChat.ts (máy chủ nhận voice id + male để chọn giọng TTS).
 *
 * Tên giọng theo Pāli theo tông trang nghiêm của ứng dụng Dharma:
 * • Mettā  (từ ái)      — nữ, ấm áp dịu dàng
 * • Karuṇā (bi mẫn)     — nữ, trầm dịu
 * • Paññā  (trí tuệ)    — nữ, sáng rõ
 * • Sati   (chánh niệm) — nữ, thong thả
 * • Metta  (không dấu)  — nam, ấm áp
 * • Adosa  (vô sân)     — nam, trầm trang nghiêm
 * • Upekkhā (xả)        — nam, điềm tĩnh
 * • Sīla   (giới đức)   — nam, sáng rõ
 */

export type AiVoice = {
  id: string;
  name: string; // tên hiển thị
  male: boolean;
  desc: string;
  /** Từ khóa ưu tiên khi chọn giọng Web Speech (tiếng Việt) */
  browser: RegExp;
};

export const AI_VOICES: Record<string, AiVoice> = {
  metta: {
    id: "metta",
    name: "Mettā",
    male: false,
    desc: "Nữ · ấm áp, dịu dàng",
    browser: /female|nữ|hoa|linh|google\s*vi/i,
  },
  karuna: {
    id: "karuna",
    name: "Karuṇā",
    male: false,
    desc: "Nữ · trầm dịu, từ bi",
    browser: /female|nữ|google\s*vi/i,
  },
  panna: {
    id: "panna",
    name: "Paññā",
    male: false,
    desc: "Nữ · sáng rõ, tỉnh táo",
    browser: /female|nữ|google\s*vi/i,
  },
  sati: {
    id: "sati",
    name: "Sati",
    male: false,
    desc: "Nữ · thong thả, an trú",
    browser: /female|nữ|google\s*vi/i,
  },
  mettam: {
    id: "mettam",
    name: "Metta",
    male: true,
    desc: "Nam · ấm áp, thân gần",
    browser: /male|nam|google\s*vi/i,
  },
  adosa: {
    id: "adosa",
    name: "Adosa",
    male: true,
    desc: "Nam · trầm ấm, trang nghiêm",
    browser: /male|nam|google\s*vi/i,
  },
  upekkha: {
    id: "upekkha",
    name: "Upekkhā",
    male: true,
    desc: "Nam · điềm tĩnh, bình xả",
    browser: /male|nam|google\s*vi/i,
  },
  sila: {
    id: "sila",
    name: "Sīla",
    male: true,
    desc: "Nam · sáng rõ, minh mẫn",
    browser: /male|nam|google\s*vi/i,
  },
};

/** Giọng mặc định khi người dùng chưa chọn: nữ Mettā. */
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
