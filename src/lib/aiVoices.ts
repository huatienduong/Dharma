/**
 * Danh mục GIỌNG NÓI của Trợ lý Phật học — đồng bộ với SERVER_VOICES trong
 * convex/aiChat.ts (máy chủ nhận voice id + male để chọn giọng TTS).
 * Mô tả giọng chung (nam trầm ấm / nữ nhẹ nhàng) nằm ở máy chủ: VOICE_TONE_DESC
 * cho ElevenLabs (qua voice_settings) và GEMINI_TONE_PREFIX cho Gemini.
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
  /**
   * Cao độ riêng cho lớp dự phòng Web Speech. Máy thường chỉ có 1–2 giọng
   * vi-VN nên 4 mẫu nữ (và 4 mẫu nam) không thể khác nhau thật sự — cấu
   * hình cao độ/pace riêng cho từng mẫu để chúng nghe khác nhau, đúng như
   * tên gọi (từ ái, bi mẫn, trí tuệ, chánh niệm).
   */
  pitch: number;
  rate: number;
};

export const AI_VOICES: Record<string, AiVoice> = {
  metta: {
    id: "metta",
    name: "Nữ — Từ Ái",
    male: false,
    desc: "Giọng nữ · ấm áp, dịu dàng",
    browser: /female|nữ|hoa|linh|google\s*vi/i,
    pitch: 1.12,
    rate: 0.92,
  },
  karuna: {
    id: "karuna",
    name: "Nữ — Bi Mẫn",
    male: false,
    desc: "Giọng nữ · trầm dịu, từ bi",
    browser: /female|nữ|google\s*vi/i,
    pitch: 0.96,
    rate: 0.88,
  },
  panna: {
    id: "panna",
    name: "Nữ — Trí Tuệ",
    male: false,
    desc: "Giọng nữ · sáng rõ, tỉnh táo",
    browser: /female|nữ|google\s*vi/i,
    pitch: 1.04,
    rate: 1.06,
  },
  sati: {
    id: "sati",
    name: "Nữ — Chánh Niệm",
    male: false,
    desc: "Giọng nữ · thong thả, an trú",
    browser: /female|nữ|google\s*vi/i,
    pitch: 1.0,
    rate: 0.82,
  },
  mettam: {
    id: "mettam",
    name: "Nam — Từ Ái",
    male: true,
    desc: "Giọng nam · ấm áp, thân gần",
    browser: /male|nam|google\s*vi/i,
    pitch: 0.98,
    rate: 0.94,
  },
  adosa: {
    id: "adosa",
    name: "Nam — Vô Sân",
    male: true,
    desc: "Giọng nam · trầm ấm, trang nghiêm",
    browser: /male|nam|google\s*vi/i,
    pitch: 0.8,
    rate: 0.86,
  },
  upekkha: {
    id: "upekkha",
    name: "Nam — Bình Xả",
    male: true,
    desc: "Giọng nam · điềm tĩnh, bình xả",
    browser: /male|nam|google\s*vi/i,
    pitch: 0.88,
    rate: 0.8,
  },
  sila: {
    id: "sila",
    name: "Nam — Giới Đức",
    male: true,
    desc: "Giọng nam · sáng rõ, minh mẫn",
    browser: /male|nam|google\s*vi/i,
    pitch: 1.02,
    rate: 1.04,
  },
};

/** Giọng mặc định khi người dùng chưa chọn: nam Từ Ái. */
export const DEFAULT_VOICE_ID = "mettam";

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

/**
 * Sự kiện báo "vừa đổi giọng". localStorage KHÔNG phát sự kiện `storage` trong
 * chính tab ghi vào nó, nên trang Trợ lý (đã mở sẵn) sẽ không biết người dùng
 * vừa chọn giọng khác ở trang Cài đặt → vẫn đọc bằng giọng cũ. Sự kiện này
 * khép lại lỗ hổng đó.
 */
export const VOICE_PREF_EVENT = "ds-voice-pref-change";

export function loadVoicePref(): string {
  try {
    const raw = localStorage.getItem(VOICE_PREF_KEY);
    // Chỉ nhận id có thật trong danh mục — giá trị rác (dữ liệu cũ, người
    // dùng sửa tay) sẽ rơi về mặc định thay vì đọc sai giọng.
    return raw && AI_VOICES[raw] ? raw : DEFAULT_VOICE_ID;
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
  try {
    window.dispatchEvent(
      new CustomEvent<string>(VOICE_PREF_EVENT, { detail: voiceId }),
    );
  } catch {
    /* môi trường không có CustomEvent — bỏ qua */
  }
}
