/**
 * HÀM DÙNG CHUNG cho trang Trợ lý Phật học.
 *
 * Tách ra khỏi `pages/Assistant.tsx` để file trang không quá lớn — mọi thứ
 * ở đây là logic thuần (không chạm React state) nên kiểm thử được và dùng
 * lại được cho cả chế độ đàm thoại lẫn khung chat.
 */

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
/* Góp ý / báo lỗi ngay trong khung chat                                 */
/* ------------------------------------------------------------------ */

/**
 * Bỏ dấu tiếng Việt trước khi so khớp từ khoá.
 *
 * BẮT BUỘC phải bỏ dấu thay vì viết lớp ký tự như `[oóô]`: “lỗi” có ký tự
 * ỗ là U+1ED7, KHÁC HẲN ô (U+00F4), nên lớp ký tự viết tay dễ bỏ sót và
 * không khớp. Bỏ dấu thì “lỗi”/“loi”/“Lỗi” đều về cùng một chuỗi.
 * Riêng “đ” không tự tách dấu theo NFD nên phải thay tay.
 */
function deaccentForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Bỏ dấu kèm bản đồ chỉ số: `map[i]` là vị trí trong chuỗi GỐC của ký tự
 * thứ i của chuỗi đã bỏ dấu.
 *
 * Cần bản đồ vì bỏ dấu KHÔNG bảo toàn độ dài ở mọi vị trí, nên dùng độ dài
 * để cắt chuỗi gốc sẽ cắt lệch và làm mất đầu câu (đã thử và thấy hỏng).
 */
function deaccentWithMap(value: string): { flat: string; map: number[] } {
  let flat = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of value) {
    const d = deaccentOne(ch);
    for (let k = 0; k < d.length; k++) {
      flat += d[k];
      map.push(i);
    }
    i += ch.length;
  }
  return { flat, map };
}

/** Bỏ dấu một ký tự đơn (dùng cho bản đồ chỉ số). */
function deaccentOne(ch: string): string {
  const base = ch.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (base === "đ") return "d";
  if (base === "Đ") return "D";
  return base;
}

/*
 * Người dùng gõ thẳng trong khung chat: “góp ý và báo lỗi: ...”. Yêu cầu:
 * đẩy nội dung tới hộp thư hỗ trợ và Trợ lý đáp lại, không hiện email.
 *
 * CỐ Ý VỀ ĐỘ CHÍNH XÁC: chỉ nhận khi CỤM MỞ ĐẦU nằm ngay đầu câu. Nếu
 * nhận “lỗi” ở bất kỳ đâu thì câu hỏi Phật học thường gặp sẽ bị nuốt
 * nhầm (ví dụ “làm sao khắc phục đau khổ vô minh?”), nên phải bám đầu câu.
 */
/**
 * BẬC 1 — cụm mở đầu CHẮC CHẮN là góp ý / báo lỗi.
 *
 * Chỉ cần đứng đầu câu là nhận, không cần thêm điều kiện. Toàn bộ đều là
 * cách nói dứt khoát của người dùng khi muốn báo lỗi.
 */
const FEEDBACK_LEAD_PATTERNS = [
  /^gop\s*y\s*(va\s*bao\s*loi)?/i,
  /^bao\s*loi\s*(va\s*gop\s*y)?/i,
  /^bao\s*loi\s*ky\s*thuat/i,
  /^phan\s*hoi/i,
  /^khieu\s*nai/i,
  /^nhan\s*xet/i,
  /^y\s*kien(\s*cua\s*toi)?/i,
  /^y\s*tuong(\s*cua\s*toi)?/i,
  /^bao\s*van\s*de/i,
  /^bao\s*su\s*co/i,
  /^ghi\s*nhan\s*loi/i,
  /^phat\s*hien\s*loi/i,
  /^loi\s*ky\s*thuat/i,
  /^loi\s*ung\s*dung/i,
  /^ung\s*dung\s*bi\s*loi/i,
  /^app\s*bi\s*loi/i,
  /^toi\s*gap\s*loi/i,
  /^gap\s*loi/i,
  /^bi\s*loi/i,
  /^loi\s*xay\s*ra/i,
  /^day\s*la\s*loi/i,
  /^ho\s*tro\s*ky\s*thuat/i,
  /^khac\s*phuc\s*(su\s*co|loi|van\s*de|ung\s*dung|app)/i,
  /^gui\s*ho\s*tro/i,
  /^van\s*de\s*ky\s*thuat/i,
  /^su\s*co\s*ky\s*thuat/i,
  /^error/i,
  /^feedback/i,
  /^report/i,
  /^bug/i,
];

/**
 * BẬC 2 — từ mở đầu hay gặp nhưng CHƯA chắc chắn (“vấn đề”, “sự cố”, “lỗi”…).
 *
 * Chỉ nhận khi phần còn lại của câu có từ khoá kỹ thuật. Nhờ vậy câu hỏi
 * Phật học kiểu “Vấn đề duyên khởi là gì?” hay “Sự cố trong tâm là sao?”
 * vẫn ra trợ lý bình thường.
 */
const FEEDBACK_WEAK_LEAD_PATTERN =
  /^(de\s*xuat|ho\s*tro|van\s*de|su\s*co|loi|treo|mat\s*tieng|khong\s*(hoat\s*dong|phan\s*hoi|nghe|ra\s*tieng|chay))/i;

/**
 * Bỏ cụm mở đầu và dấu câu ở đầu, giữ lại phần thân.
 *
 * Phải bỏ được CẢ từ mở đầu bật 2 (lỗi, vấn đề, sự cố, đề xuất…). Nếu không,
 * từ “lỗi” còn nằm lại trong phần thân và tự khớp với từ khoá lỗi, khiến
 * “Lợi ích…” và “Lỗi lầm trong nhân quả…” bị nuốt nhầm.
 *
 * KHÔNG `.trim()` ở cuối: độ dài phần thân dùng để suy ra vị trí cắt trong
 * chuỗi gốc; cắt bớt khoảng trắng cuối sẽ làm vị trí cắt lệch.
 */
function stripFeedbackLead(text: string): string {
  return text
    .replace(
      /^\s*(gop\s*y|bao\s*loi|phan\s*hoi|khieu\s*nai|nhan\s*xet|y\s*kien|y\s*tuong|bao\s*van\s*de|bao\s*su\s*co|ghi\s*nhan\s*loi|phat\s*hien\s*loi|loi\s*xay\s*ra|day\s*la\s*loi|gap\s*loi|bi\s*loi|toi\s*gap\s*loi|loi\s*ky\s*thuat|loi\s*ung\s*dung|ung\s*dung\s*bi\s*loi|app\s*bi\s*loi|ho\s*tro\s*ky\s*thuat|khac\s*phuc\s*(su\s*co|loi|van\s*de|ung\s*dung|app)|gui\s*ho\s*tro|van\s*de\s*ky\s*thuat|su\s*co\s*ky\s*thuat|feedback|report|bug|error|de\s*xuat|ho\s*tro|van\s*de|su\s*co|loi|treo|mat\s*tieng|khong\s*(hoat\s*dong|phan\s*hoi|nghe|ra\s*tieng|chay))\s*(va\s*(gop\s*y|bao\s*loi)\s*)?/i,
      "",
    )
    .replace(/^[\s:.,\-–—]+/, "");
}

/** Từ khoá cho thấy đây là báo lỗi kỹ thuật chứ không phải góp ý chung. */
/**
 * Từ khoá CHẮC CHẮN LÀ LỖI — dùng để dán nhãn “Báo lỗi” thay vì “Góp ý”.
 * Chỉ gồm từ mô tả sự cố thật.
 */
const ERROR_KEYWORDS =
  /\bloi\b|hong|sap|treo|crash|\bbug\b|khong hoat dong|khong chay|khong phan hoi|khong nghe|khong ra tieng|khong phat (am|tieng)|mat tieng|mat ket noi|that bai|bi ngat|ngat giua|dong bang|chay cham|nhanh qua|lo hang|buffer|\blag\b|nhay qua|nhay|hay nhay|ket loi|loi ky thuat|khong duoc gui|khong bam duoc|khong len|trang trang/;

/**
 * Từ thuộc về phần mềm — dùng để CHẶT CỬA bật 2 (từ mở đầu mơ hồ như
 * “vấn đề”, “đề xuất”). Rộng hơn nhóm trên, không dùng để dán nhãn.
 *
 * LƯU Ý: KHÔNG dùng “lỗi” trần. Bỏ dấu xong “lời” và “lỗi” trùng nhau, nên
 * “Treo lời giảng của Đại thừa” sẽ bị tính là có từ khoá kỹ thuật rồi nuốt
 * mất. Vì vậy chỉ khớp “lỗi” khi đi kèm danh từ báo lỗi kỹ thuật.
 */
const TECH_TERMS =
  /loi (ky thuat|xay ra|ung dung|app|he thong|ket noi|giao dien|may chu|phan mem|hien thi|tra loi|doc|phat sinh|ket qua|mo ra)|doc (to|loi|cau|het)|het tieng|am thanh|giong (doc|de|to)|phat am|hong|sap|treo|crash|bug|khong hoat dong|khong chay|khong phan hoi|khong nghe|khong ra tieng|khong phat (am|tieng)|mat tieng|mat ket noi|that bai|bi ngat|ngat giua|dong bang|chay cham|nhanh qua|lo hang|buffer|lag|ket loi|loi ky thuat|khong duoc gui|khong bam duoc|khong len|trang trang|ung dung|\bapp\b|nut|hanh dong|thong bao|man hinh|tai ve|dang tai|ket noi|giao dien|chet app|dong app|tai tep|tai anh|nap tien|quay lai|len loi|thong tin sai|tra loi sai|khong dung y|sai khac|chay lai|mo lai|reset|thi thuong|lam treo|doc qua nho|\bmic\b|hang dong|nhay qua|nhay|hay nhay|qua nhanh/;

/**
 * Từ mở đầu bậc 2 NHƯNG TỰ NÓ ĐÃ LÀ LỖI — không cần thêm từ khoá kỹ thuật
 * nào ở phần thân. “Không hoạt động”, “không nghe”… là lời kêu cứu rõ ràng,
 * không thể là câu hỏi Phật học.
 *
 * CỐ Ý KHÔNG ĐỂ “treo”, “mất tiếng”, “không nghe” ở đây: đây cũng là từ Hán
 * Việt dùng trong giáo lý (“treo lời giảng”, “mất tiếng trong nhà tông”,
 * “không nghe rõ lời giảng”), nếu cho tự nhận thì những câu hỏi Phật học đó bị
 * nuốt mất. Muốn báo lỗi kiểu đó (ví dụ “mất tiếng đọc to câu trả lời”) vẫn
 * vào được vì phần thân có từ khoá kỹ thuật.
 */
const SELF_TECHNICAL_LEAD =
  /^(khong hoat dong|khong chay|khong phan hoi|khong ra tieng|khong phat (am|tieng))\b/;

/**
 * Ngưỡng phần thân ngắn hơn thế thì coi như người dùng CHƯA viết nội dung.
 * Ví dụ “báo lỗi”, “góp ý:”, “hỗ trợ kỹ thuật ơi” đều dưới ngưỡng.
 */
const BARE_FEEDBACK_BODY_MAX = 8;

/**
 * Lệnh mở đầu hợp lệ — nhắc đúng danh sách này khi người dùng gõ thiếu nội
 * dung, để lần sau họ viết đúng mẫu.
 */
export const FEEDBACK_COMMANDS =
  "báo lỗi, góp ý, hỗ trợ kỹ thuật, khắc phục sự cố, khiếu nại, nhận xét, ý kiến, đề xuất";

/** Hướng dẫn cách viết, dùng khi người dùng chỉ gõ lệnh mà chưa có nội dung. */
export const BARE_FEEDBACK_GUIDE =
  `🙏 Để gửi góp ý hoặc báo lỗi trực tiếp trong khung chat, bạn hãy viết theo đúng mẫu:\n\nLỆNH: NỘI DUNG CỤ THỂ CẦN HỖ TRỢ\n\nCác lệnh dùng để mở đầu câu: ${FEEDBACK_COMMANDS}.\n\nVí dụ viết đúng:\n• báo lỗi: nút xoá hội thoại bị treo\n• góp ý: xin thêm chủ đề về Trung đạo\n• hỗ trợ kỹ thuật: giọng đọc bị ngắt giữa chừng\n• khắc phục sự cố: ứng dụng đóng băng khi mở lại\n\nBạn mới gõ lệnh mà chưa viết nội dung nên Trợ lý chưa gửi được. Bạn thêm phần nội dung cụ thể ngay sau dấu hai chấm rồi gửi lại nhé. Trợ lý tự chuyển thẳng cho bộ phận kỹ thuật, không cần mở Cài đặt và không cần để lại email.`;

/**
 * Người dùng CHỈ gõ lệnh góp ý / báo lỗi mà chưa kèm nội dung.
 *
 * Trả về `true` để Trợ lý nhắc lại cách viết đúng mẫu, thay vì gửi thư rỗng
 * hoặc im lặng. Chỉ nhận khi câu bắt đầu bằng lệnh góp ý — câu hỏi thường
 * (“Vấn đề duyên khởi là gì?”) không dính vì phần thân của chúng dài.
 */
export function isBareFeedbackCommand(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const { flat } = deaccentWithMap(raw);
  const hasLead =
    FEEDBACK_LEAD_PATTERNS.some((re) => re.test(flat)) ||
    FEEDBACK_WEAK_LEAD_PATTERN.test(flat);
  if (!hasLead) return false;
  const body = stripFeedbackLead(flat).trim();
  return body.length < BARE_FEEDBACK_BODY_MAX;
}

export type ChatFeedback = {
  /** "bug" = báo lỗi, "idea" = góp ý. */
  type: "bug" | "idea";
  /**
   * Nội dung người dùng muốn gửi, giữ NGUYÊN DẤU tiếng Việt — đây là thứ
   * đọc trong thư hỗ trợ, mất dấu thì người nhận khó hiểu.
   */
  message: string;
};

/**
 * Nhận diện tin nhắn góp ý / báo lỗi trong khung chat.
 *
 * Trả về `null` khi đó là câu hỏi thường — đây là nhánh quyết định có chặn
 * lượt hỏi của Trợ lý hay không, nên phải thật hẹn.
 */
export function parseChatFeedback(text: string): ChatFeedback | null {
  const raw = text.trim();
  if (!raw) return null;
  // So khớp trên bản BỎ DẤU cho chắc ăn, nhưng phần gửi đi lấy từ bản GỐC
  // để giữ dấu tiếng Việt.
  //
  // Việc bỏ dấu (NFD rồi xoá dấu) giữ nguyên ĐỘ DÀI chuỗi với tiếng Việt,
  // nên độ dài phần đã bỏ cụm mở đầu dùng để cắt trên chính `raw`.
  const { flat, map } = deaccentWithMap(raw);
  const strongLead = FEEDBACK_LEAD_PATTERNS.some((re) => re.test(flat));
  const weakLead = FEEDBACK_WEAK_LEAD_PATTERN.test(flat);
  if (!strongLead && !weakLead) return null;
  const bodyFlat = stripFeedbackLead(flat);
  // Cụm mở đầu trần (chỉ gõ “góp ý”) thì chưa có gì để gửi — để nơi gọi
  // hỏi lại, tuyệt đối không gửi thư rỗng.
  if (bodyFlat.trim().length < 3) return null;
  // Bật 2 phải kiểm từ khoá kỹ thuật trên PHẦN THÂN, không phải cả câu.
  //
  // LÝ DO: bỏ dấu làm “Lợi ích…” và “Lỗi lầm…” cùng thành chuỗi bắt đầu
  // bằng “loi”, trùng với “lỗi”. Nếu quét cả câu thì hai câu hỏi Phật học
  // này bị nuốt. Chỉ quét phần sau cụm mở đầu thì chúng thoát.
  if (
    !strongLead &&
    !SELF_TECHNICAL_LEAD.test(flat) &&
    !TECH_TERMS.test(bodyFlat)
  ) {
    return null;
  }
  // Vị trí bắt đầu phần thân = vị trí của ký tự ngay SAU phần đã bỏ.
  // Phần đã bỏ dài bằng (độ dài chuỗi đã bỏ dấu) − (độ dài phần thân).
  const removed = flat.length - bodyFlat.length;
  const start = removed < map.length ? map[removed] : raw.length;
  const message = raw.slice(start).replace(/^[\s:.,\-–—]+/, "").trim();
  if (message.length < 3) return null;
  // Phân loại quét CẢ CÂU, vì tới đây đã qua cổng nhận rồi: nếu ai đó viết
  // “báo lỗi” hay “ứng dụng bị lỗi” thì chắc chắn đây là báo lỗi, dù phần
  // thân không lặp lại từ “lỗi”.
  return { type: ERROR_KEYWORDS.test(flat) ? "bug" : "idea", message };
}
