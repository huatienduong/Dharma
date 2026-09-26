/**
 * HÀM DÙNG CHUNG cho trang Trợ lý Phật học.
 *
 * Tách ra khỏi `pages/Assistant.tsx` để file trang không quá lớn — mọi thứ
 * ở đây là logic thuần (không chạm React state) nên kiểm thử được và dùng
 * lại được cho cả chế độ đàm thoại lẫn khung chat.
 */

import {
  BookOpen,
  Heart,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  CHAT_STORAGE_KEY as CHAT_KEY,
  decryptString,
  encryptString,
} from "@/lib/secureStorage";

/**
 * Kết quả chuẩn hoá của các nhánh hỏi: nhánh đọc ảnh, nhánh đọc tệp và
 * nhánh hội thoại chữ — cùng một hợp đồng để phần xử lý lỗi dùng chung.
 */
export type AskResult =
  | { ok: true; reply: string }
  | { ok: false; code?: string; message: string };

export type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  /** Ảnh người dùng tải lên (base64) — chỉ hiển thị, không gửi lại AI */
  image?: { base64: string; mime: string };
  /** storageId ảnh AI tạo — nạp URL từ Convex File Storage khi hiển thị */
  imageStorageId?: string;
};

/* ------------------------------------------------------------------ */
/* Lịch sử hội thoại — MÃ HÓA AES-256-GCM trên thiết bị (không cần đăng  */
/* nhập). Dữ liệu cũ chưa mã hóa được nâng cấp tự động: đọc → mã hóa lại */
/* → ghi đè bản thô, người dùng không mất dữ liệu hiện có.               */
/* ------------------------------------------------------------------ */

export async function loadLocalChatSecure(): Promise<Msg[] | null> {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return null;
    let parsed: unknown;
    if (raw.includes(":")) {
      // Bản mã có dạng "iv:cipher" — giải mã trước khi đọc
      const plain = await decryptString(raw);
      if (!plain) return null;
      parsed = JSON.parse(plain);
    } else {
      // Dữ liệu cũ chưa mã hóa → nâng cấp tự động: mã hóa lại, xóa bản thô
      parsed = JSON.parse(raw);
      const upgraded = await encryptString(JSON.stringify(parsed));
      try {
        localStorage.setItem(CHAT_KEY, upgraded);
      } catch {
        /* không ghi được bản mã → giữ nguyên bản thô */
      }
    }
    const arr = parsed as Msg[];
    if (!Array.isArray(arr)) return null;
    // Tin nhắn cũ chưa có mốc giờ → gán thời gian lệch nhau theo thứ tự
    return arr
      .filter(
        (m): m is Msg =>
          Boolean(
            m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          ),
      )
      .map((m, i, a) => ({
        ...m,
        ts:
          typeof m.ts === "number"
            ? m.ts
            : Date.now() - (a.length - i) * 60_000,
      }));
  } catch {
    return null;
  }
}

/** Lưu lịch sử — LUÔN mã hóa AES-256-GCM trước khi ghi xuống thiết bị. */
export async function saveLocalChatSecure(msgs: Msg[]): Promise<void> {
  try {
    const enc = await encryptString(JSON.stringify(msgs.slice(-100)));
    localStorage.setItem(CHAT_KEY, enc);
  } catch {
    /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
  }
}

/** Xoá toàn bộ lịch sử đã lưu trên thiết bị. */
export function clearLocalChat(): void {
  try {
    localStorage.removeItem(CHAT_KEY);
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ */
/* Nhận diện giọng nói cho chế độ ĐÀM THOÁI RẢNH TAY (continuous)      */
/* ------------------------------------------------------------------ */

export type RecResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
export type RecLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

export function newRecognition(): RecLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecLike;
    webkitSpeechRecognition?: new () => RecLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/* ------------------------------------------------------------------ */
/* Lệnh thoại / lệnh chữ                                               */
/* ------------------------------------------------------------------ */

/** Bỏ dấu tiếng Việt để nhận lệnh kể cả khi người dùng gõ/nói thiếu dấu. */
export function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Câu HỎI CÁCH xóa ("làm sao xóa hội thoại") — KHÔNG phải lệnh xóa. */
const CLEAR_QUESTION =
  /(lam sao|co cach nao|the nao|lam the nao|huong dan|tai sao|bang cach|o dau|nut nao|thao tac)/;
/** Động từ xóa. */
const CLEAR_VERB = /(xoa|quen|bo|reset|clear)/;
/** Đối tượng cần xóa. */
const CLEAR_TOPIC =
  /(hoi thoai|tro chuyen|lich su|chat|nhac|moi|bat dau|tu dau|tat ca|het di|thu muc)/;

/**
 * Người dùng yêu cầu xóa toàn bộ hội thoại bằng lời hoặc chữ
 * ("xoá hội thoại", "bắt đầu lại", "quên hết đi") → ứng dụng tự xóa sạch
 * và kết thúc cuộc trò chuyện, không cần qua AI.
 *
 * Rất thận trọng: câu hỏi về CÁCH xóa không phải lệnh xóa; câu dài không phải
 * lệnh ngắn. Chỉ nhận lệnh ngắn, không dấu hỏi, không có từ hỏi cách.
 */
export function isClearHistoryCommand(raw: string): boolean {
  const t = deaccent(raw.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  const words = t.split(" ").filter(Boolean);
  if (words.length > 8) return false;
  if (/[?]/.test(raw)) return false;
  if (CLEAR_QUESTION.test(t)) return false;
  // Lệnh ngắn trần trụi ("xóa hết", "quên đi", "reset lại") cũng là lệnh xóa —
  // nhưng phải bắt đầu bằng động từ xóa và rất ngắn, để không nuốt nhầm câu
  // kể chuyện dài ("quên hết chuyện đó đi").
  if (words.length <= 3 && /^(xoa|quen|bo|reset|clear)/.test(words[0])) {
    return true;
  }
  if (CLEAR_VERB.test(t)) return CLEAR_TOPIC.test(t);
  return /(bat dau lai|tu dau lai|tro chuyen moi|reset lai)/.test(t);
}

/**
 * YÊU CẦU MỞ ĐÀM THOẠI từ trong khung chat — người dùng chỉ cần nhắn
 * "mở đàm thoại" là ứng dụng bật màn đàm thoại, không cần qua AI.
 */
const CALL_OPEN_PATTERNS = [
  // "mở / bật / bắt đầu / chuyển sang ... đàm thoại, gọi điện, chế độ nói"
  /\b(mo|bat|bat dau|chuyen sang|chuyen qua|chuyen|vao|quay ve)\b\s*(dam thoi|goi dien|dien thoai|che do noi|che do dam thoi|che do goi dien)\b/,
  // chỉ cần nói thẳng: "đàm thoại", "gọi điện thoại với tôi"
  /^(dam thoi|goi dien|dien thoai|che do noi)\b/,
  // "nói chuyện / trò chuyện ... bằng giọng nói / tiếng Việt / voice"
  /\b(noi chuyen|tro chuyen|goi)\b.*\b(bang giong noi|giong noi|tieng viet|voice)\b/,
  // "tôi muốn nói chuyện", "cho tôi đàm thoại"
  /\b(toi muon|ban muon|muon|cho toi|hay|oi)\b.*\b(dam thoi|noi chuyen|tro chuyen)\b/,
];

export function isStartCallCommand(raw: string): boolean {
  const t = deaccent(raw.toLowerCase())
    .replace(/thoai/g, "thoi") // "thoại" -> "thoi" để khớp mẫu
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  const words = t.split(" ").filter(Boolean);
  if (words.length > 6) return false;
  if (/[?]/.test(raw)) return false;
  if (CLEAR_QUESTION.test(t)) return false;
  // "gọi điện cho mẹ", "gọi bác sĩ" — đang gọi người khác, không phải mở app.
  if (/\b(cho|ve|cho me|cha me|ban|khach|nguoi|bac si)\b/.test(t) && !/\bcho toi\b/.test(t)) {
    return false;
  }
  return CALL_OPEN_PATTERNS.some((re) => re.test(t));
}

/**
 * Câu nghe được có phải chính giọng trợ lý vừa đọc qua loa ngoài không.
 *
 * Không có bước này thì điện thoại nghe lại câu trả lời của trợ lý, gửi lại
 * như thể người dùng hỏi, rồi trợ lý lại trả lời — hội thoại lặp vô hạn và
 * người dùng tưởng micro bị hỏng.
 */
export function looksLikeEcho(
  heard: string,
  spoken: string,
  withinMs: number,
): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(heard);
  const b = norm(spoken);
  // Chỉ xét trong khoảng ngay sau khi trợ lý vừa đọc xong — tiếng vọng
  // xuất hiện ở đúng khoảnh đó. Ngoài khoảng này thì cùng câu là người
  // dùng thật sự hỏi lại, tuyệt đối không bỏ.
  if (withinMs < 0 || withinMs > 8000) return false;
  if (a.length < 12 || b.length < 12) return false;
  if (a === b) return true;
  if (b.includes(a)) return true;
  const words = (x: string) => x.split(" ").filter((w) => w.length > 2);
  const wa = words(a);
  const wb = new Set(words(b));
  // Câu nghe được phải dài và trùng phần lớn từ ngữ với câu đã đọc thì mới
  // tính là vọng — tránh nuốt câu hỏi ngắn trùng chủ đề ("vô minh là gì?").
  if (wa.length < 4) return false;
  let hit = 0;
  wa.forEach((w) => {
    if (wb.has(w)) hit += 1;
  });
  return hit / wa.length >= 0.8;
}

/* ------------------------------------------------------------------ */
/* Trả lời tại chỗ + rút gọn để đọc to                                   */
/* ------------------------------------------------------------------ */

/**
 * Lời chào / cảm ơn thuần túy — trả lời ngay tại máy, không gọi AI.
 *
 * Khi đang đàm thoại, chờ chép xong + gọi AI mất 1–2 giây, nghe rất chậm so
 * với một câu chào. Ở đây chỉ nhận câu NGẮN và không có ý hỏi Phật học nào
 * (tối đa 5 từ, không có dấu hỏi, không chứa từ khoá hỏi han), nên không
 * có rủi ro bỏ sót ý người dùng. Trả về null nếu không phải lời chào.
 */
export function smallTalkReply(raw: string): string | null {
  const t = raw
    .toLowerCase()
    .replace(/[.,!?;:…“”"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;
  const words = t.split(" ").filter(Boolean);
  if (words.length > 5) return null;
  // Có dấu hỏi hoặc từ khoá hỏi han → đó là câu hỏi thật, phải gửi AI.
  if (/[?]/u.test(raw)) return null;
  if (/(giải thích|cho biết|hỏi|về|là gì|thế nào|như thế|tại sao|giúp|tư vấn|có nên|bao giờ|ở đâu|ai là)/.test(t)) {
    return null;
  }
  if (/^(xin |xin! )?(chao|chào|hello|hi|hey|alo|alô|good (morning|afternoon|evening|day))/.test(t)) {
    return "Xin chào bạn. Mình ở đây, cùng tìm hiểu Phật pháp nhé.";
  }
  if (/^(cam on|cảm ơn|thanks|thank you|thank)/.test(t)) {
    return "Không có gì bạn nhé. Cứ hỏi bất cứ điều gì bạn muốn biết.";
  }
  if (/^(vâng|va|ok|okay|duoc|được|ung|ừ|hm|ừm|hmm|bloop|test)/.test(t)) {
    return "Mình đang nghe đây. Bạn muốn tìm hiểu điều gì hôm nay?";
  }
  return null;
}

/**
 * Rút gọn câu trả lời để ĐỌC TO trong chế độ đàm thoại.
 *
 * Một câu trả lời đầy đủ có thể dài 2.000 ký tự — đọc to mất hơn 2 phút,
 * người dùng phải ngồi nghe hết rồi mới nói tiếp được, dễ tưởng app treo.
 * Ở đây chỉ đọc phần đầu (tối đa 3 câu / 320 ký tự) và nhắc xem phần đầy đủ
 * trong khung chat. Toàn bộ câu trả lời vẫn hiện đầy đủ trong hội thoại.
 */
export function speakableSummary(
  raw: string,
  maxChars = 320,
  maxSentences = 3,
): { spoken: string; truncated: boolean } {
  const text = raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
  if (!text) return { spoken: "", truncated: false };
  const sentences = text.match(/[^.!?…]+[.!?…]+/g) ?? [text];
  let spoken = "";
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim();
    if (i >= maxSentences) break;
    if (spoken && spoken.length + s.length > maxChars) break;
    spoken += s + " ";
    if (spoken.length >= maxChars) break;
  }
  spoken = spoken.trim();
  if (!spoken) spoken = text.slice(0, maxChars);
  // So sánh trên dạng đã bỏ dấu kết câu cuối, nếu không “Xin chào.” bị
  // tưởng là đã bị cắt bớt.
  const bare = (s: string) => s.replace(/[.!?…\s]+$/, "").trim();
  const truncated = bare(spoken).length < bare(text).length;
  return {
    spoken: truncated
      ? `${spoken} Phần đầy đủ bạn xem trong khung chat nhé.`
      : spoken,
    truncated,
  };
}

/* ------------------------------------------------------------------ */
/* Hiển thị                                                             */
/* ------------------------------------------------------------------ */

/**
 * Vệ sinh hiển thị: đảm bảo không còn ký tự markdown (**, *, ###) trong khung
 * chat — kể cả tin nhắn cũ lưu trước khi máy chủ tự làm sạch đầu ra.
 */
export function plainText(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[*•]+\s+/gm, "– ");
}

/**
 * Định dạng thời gian tin nhắn — LUÔN có ngày tháng cạnh giờ:
 * hôm nay → "14:05 · Hôm nay"; hôm trước → "14:05 · 24/09";
 * khác năm → "14:05 · 24/09/2025".
 */
export function formatTs(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return `${time} · Hôm nay`;
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = sameYear
    ? d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    : d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  return `${time} · ${date}`;
}

/**
 * Bóc thông điệp lỗi từ backend Convex — ConvexError trên production gửi
 * thông điệp qua thuộc tính `data` (có thể bọc trong Error.message dạng
 * chuỗi JSON). Trả về chuỗi đọc được cho người dùng.
 */
export function convexErrMessage(err: unknown): string {
  if (!err) return "";
  // ConvexError client-side: { data: "thông điệp" }
  const direct = (err as { data?: unknown }).data;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (direct && typeof direct === "object") {
    const m = (direct as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error && err.message.trim()) {
    const raw = err.message;
    // Chuỗi dạng JSON: {"data":"..."} hoặc {"message":"..."}
    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw) as { data?: unknown; message?: unknown };
        if (typeof parsed.data === "string" && parsed.data.trim()) return parsed.data;
        if (typeof parsed.message === "string" && parsed.message.trim()) return parsed.message;
      } catch {
        /* không phải JSON — dùng nguyên chuỗi */
      }
    }
    return raw;
  }
  return String(err);
}

/* ------------------------------------------------------------------ */
/* Câu hỏi đề xuất                                                       */
/* ------------------------------------------------------------------ */

/* Kho câu hỏi đề xuất — ƯU TIÊN Bát Chánh Đạo & Tứ Thánh Đế (icon Sparkles
   đánh dấu nhóm ưu tiên). Mỗi lần vào ứng dụng lấy ngẫu nhiên 4 câu: nhóm
   ưu tiên luôn đứng đầu, còn lại bổ sung từ nhóm mở rộng. */
const SUGGESTION_POOLS: { icon: typeof BookOpen; text: string }[] = [
  // Nhóm ưu tiên — Bát Chánh Đạo & Tứ Thánh Đế
  { icon: Sparkles, text: "Bát Chánh Đạo gồm những chi nào?" },
  { icon: Sparkles, text: "Chánh niệm khác chánh định thế nào?" },
  { icon: Sparkles, text: "Chánh kiến vì sao đứng đầu Bát Chánh Đạo?" },
  { icon: Sparkles, text: "Chánh ngữ trong thời đại mạng xã hội" },
  { icon: Sparkles, text: "Chánh mạng: chọn nghề theo Phật pháp" },
  { icon: Sparkles, text: "Tứ Thánh Đế nghĩa là gì?" },
  { icon: Sparkles, text: "Khổ Đế hiện lên trong đời sống thế nào?" },
  { icon: Sparkles, text: "Tập Đế: gốc rễ của khổ nằm ở đâu?" },
  { icon: Sparkles, text: "Vì sao Diệt Đế chính là Niết-bàn?" },
  { icon: Sparkles, text: "Đạo Đế dẫn tới chấm dứt khổ ra sao?" },
  // Nhóm mở rộng — đa dạng chủ đề khác
  { icon: Heart, text: "Hướng dẫn thiền niệm hơi thở cho người mới" },
  { icon: Heart, text: "Làm sao buông bỏ lo âu trước kỳ thi?" },
  { icon: BookOpen, text: "Thiền tông khác Theravāda chỗ nào?" },
  { icon: Scale, text: "Mình nên bắt đầu tập tu như thế nào?" },
];
const SUGGESTION_COUNT = 4;

/** Chọn ngẫu nhiên câu hỏi đề xuất — ưu tiên nhóm Bát Chánh Đạo/Tứ Thánh Đế. */
export function pickSuggestions(): typeof SUGGESTION_POOLS {
  const shuffled = [...SUGGESTION_POOLS].sort(() => Math.random() - 0.5);
  const priority = shuffled.filter((s) => s.icon === Sparkles);
  const rest = shuffled.filter((s) => s.icon !== Sparkles);
  return [...priority, ...rest].slice(0, SUGGESTION_COUNT);
}
