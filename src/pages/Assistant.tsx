import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import {
  startMicRecording,
  stopMicRecording,
} from "@/lib/micRecorder";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { loadVoicePref } from "@/lib/aiVoices";
import { wantsImage } from "@/lib/imageIntent";
import { MAX_IMAGES_PER_MESSAGE } from "@/lib/appFeatures";
import { callConvexAction } from "@/lib/convexAction";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import {
  CHAT_STORAGE_KEY as CHAT_KEY,
  decryptString,
  encryptString,
} from "@/lib/secureStorage";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  BookOpen,
  Check,
  Copy,
  Eraser,
  Heart,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Scale,
  Send,
  Share2,
  Settings,
  Sparkles,
  Square,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

/**
 * Kết quả chuẩn hoá của cả hai nhánh hỏi: nhánh đọc ảnh (Gemini) và nhánh
 * hội thoại chữ (Groq) — cùng một hợp đồng để phần retry/xử lý lỗi dùng chung.
 */
type AskResult =
  | { ok: true; reply: string }
  | { ok: false; code?: string; message: string };

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  /** Ảnh người dùng tải lên (base64) — chỉ hiển thị, không gửi lại AI */
  image?: { base64: string; mime: string };
  /** storageId ảnh AI tạo — nạp URL từ Convex File Storage khi hiển thị */
  imageStorageId?: string;
};

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
function pickSuggestions(): typeof SUGGESTION_POOLS {
  const shuffled = [...SUGGESTION_POOLS].sort(() => Math.random() - 0.5);
  const priority = shuffled.filter((s) => s.icon === Sparkles);
  const rest = shuffled.filter((s) => s.icon !== Sparkles);
  return [...priority, ...rest].slice(0, SUGGESTION_COUNT);
}

/* ------------------------------------------------------------------ */
/* Nhận diện giọng nói cho chế độ ĐÀM THOÁI RẢNH TAY (continuous)      */
/* — tách khỏi useVoiceSearch (chỉ nghe từng câu) để tự khởi động lại  */
/* ------------------------------------------------------------------ */

type RecResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type RecLike = {
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

function newRecognition(): RecLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecLike;
    webkitSpeechRecognition?: new () => RecLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/* ------------------------------------------------------------------ */
/* Lịch sử hội thoại — MÃ HÓA AES-256-GCM trên thiết bị (không cần đăng  */
/* nhập). Dữ liệu cũ chưa mã hóa được nâng cấp tự động: đọc → mã hóa lại */
/* → ghi đè bản thô, người dùng không mất dữ liệu hiện có.               */
/* ------------------------------------------------------------------ */

async function loadLocalChatSecure(): Promise<Msg[] | null> {
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
/**
 * Bỏ dấu tiếng Việt để nhận lệnh kể cả khi người dùng gõ/nói thiếu dấu.
 */
function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
function isClearHistoryCommand(raw: string): boolean {
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
 *
 * Rất thận trọng để không mở nhầm: chỉ nhận câu lệnh NGẮN, không dấu hỏi,
 * không phải câu hỏi, và không nhận câu kiểu "gọi điện cho mẹ tôi".
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

/**
 * Câu nghe được có phải chính giọng trợ lý vừa đọc qua loa ngoài không.
 *
 * Không có bước này thì điện thoại nghe lại câu trả lời của trợ lý, gửi lại
 * như thể người dùng hỏi, rồi trợ lý lại trả lời — hội thoại lặp vô hạn và
 * người dùng tưởng micro bị hỏng.
 */
function looksLikeEcho(heard: string, spoken: string, withinMs: number): boolean {
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

function isStartCallCommand(raw: string): boolean {
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
 * Số lượt hội thoại gửi kèm cho AI. Phải khớp `HISTORY_LIMIT` ở
 * `convex/aiChat.ts` (16) — đủ để trợ lý nhớ xuyên suốt cuộc trò chuyện mà
 * vẫn nằm trong hạn mức token của gói.
 */
const CONTEXT_MESSAGES = 16;

/**
 * Lời chào / cảm ơn thuần túy — trả lời ngay tại máy, không gọi AI.
 *
 * Khi đang đàm thoại, chờ chép xong + gọi AI mất 1–2 giây, nghe rất chậm so
 * với một câu chào. Ở đây chỉ nhận câu NGẮN và không có ý hỏi Phật học nào
 * (tối đa 5 từ, không có dấu hỏi, không chứa từ khoá hỏi han), nên không
 * có rủi ro bỏ sót ý người dùng. Trả về null nếu không phải lời chào.
 */
function smallTalkReply(raw: string): string | null {
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

async function saveLocalChatSecure(msgs: Msg[]) {
  try {
    const enc = await encryptString(JSON.stringify(msgs.slice(-100)));
    localStorage.setItem(CHAT_KEY, enc);
  } catch {
    /* bộ nhớ đầy / WebCrypto lỗi — bỏ qua */
  }
}

export default function Assistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";
  const ask = useAction(api.aiChat.ask);
  const createImage = useAction(api.aiChat.createImage);

  const [history, setHistory] = useState<Msg[]>([]);
  const historyRef = useRef<Msg[]>([]);
  const pendingRef = useRef<Msg[]>([]);
  // Đề xuất câu hỏi — chọn ngẫu nhiên MỘT LẦN mỗi lần vào ứng dụng.
  const [suggestions] = useState(() => pickSuggestions());

  // Nạp lịch sử ĐÃ MÃ HÓA từ thiết bị (WebCrypto là bất đồng bộ)
  useEffect(() => {
    let alive = true;
    void loadLocalChatSecure().then((msgs) => {
      if (alive && msgs) {
        historyRef.current = msgs;
        setHistory(msgs);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  // FIX "không phản hồi": đếm thời gian chờ AI — quá 60s hiển thị lỗi
  // thay vì đứng ở "đang suy niệm" vĩnh viễn (provider treo không trả).
  const [stalled, setStalled] = useState(false);
  const [image, setImageState] = useState<{ base64: string; mime: string } | null>(null);
  /**
   * Ảnh bổ sung (ảnh thứ 2 trở đi trong cùng một lượt). `image` giữ ảnh đầu
   * để phần xem trước cạnh ô nhập không phải sửa; các ảnh còn lại nằm ở đây.
   */
  const [extraImages, setExtraImages] = useState<{ base64: string; mime: string }[]>([]);
  const extraImagesRef = useRef<{ base64: string; mime: string }[]>([]);
  /**
   * Hàm thay thế `setImage` cho phần giao diện: bỏ ảnh đính kèm thì bỏ luôn
   * cả các ảnh bổ sung, không bao giờ còn ảnh "cô đơn" nào lọt vào lượt gửi.
   */
  const setImage = useCallback((next: { base64: string; mime: string } | null) => {
    setImageState(next);
    if (next === null) {
      extraImagesRef.current = [];
      setExtraImages([]);
    }
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    supported: micSupported,
    listening,
    refining: micRefining,
    interim: micInterim,
    start,
    stop,
    transcribeClip,
  } = useVoiceSearch();
  const {
    speak: speakVI,
    stop: stopSpeaking,
    prime: primeSpeechAudio,
  } = useVietnameseTTS();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Khi đang hiện chữ từng phần, không tự cuộn toàn bộ vùng chat xuống đáy.
  const suppressNextAutoScrollRef = useRef(false);
  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  /**
   * Lỗi trả lời hiện ngay trong hội thoại kèm nút "Gửi lại" — người dùng
   * không phải gõ lại câu hỏi chỉ vì một lỗi mạng tạm thời.
   */
  const [failedReply, setFailedReply] = useState<{
    message: string;
    question: string;
    msg: Msg;
  } | null>(null);
  // Tiến trình tạo ảnh: null = không tạo, số 0–100 = phần trăm đang chạy.
  const [imageProgress, setImageProgress] = useState<number | null>(null);
  /**
   * Đang phân tích ảnh người dùng gửi. Lượt phân tích ảnh có thể mất vài
   * giây; nói rõ đang xem ảnh thay vì để người dùng tưởng app bị treo rồi
   * bấm gửi lại.
   */
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const imageProgressRef = useRef<number | null>(null);
  // Nhịp tăng phần trăm giả lập cho tới khi máy chủ trả ảnh về.
  const imageTickRef = useRef<number | null>(null);

  /* ----- Giọng đọc người dùng chọn (lưu cục bộ, dùng cho chat + đàm thoại) ----- */
  const [voiceId, setVoiceId] = useState<string>(loadVoicePref);
  const voiceIdRef = useRef(voiceId);
  useEffect(() => {
    voiceIdRef.current = voiceId;
  }, [voiceId]);

  /* ================= CHẾ ĐỘ ĐÀM THOÁI (kiểu Gemini Live) ============== */
  /* Nói như gọi điện: AI nghe liên tục, tự gửi khi bạn ngừng câu, tự     */
  /* trả lời bằng giọng nói rồi lại nghe tiếp — KHÔNG cần bấm mic.        */

  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "listening" | "thinking" | "speaking" | "muted"
  >("listening");
  const [interim, setInterim] = useState("");
  /** Số lần thử lại khi trợ lý còn đang bận (để không bỏ rơi câu nói). */
  const busyWaitsRef = useRef(0);
  /** Số lần tự gửi lại trong đàm thoại khi request lỗi (1 lần cho đủ). */
  const callRetryRef = useRef(0);
  /** Gọi xóa hội thoại / kết thúc cuộc gọi từ nơi định nghĩa trước trong file. */
  const clearAllRef = useRef<(() => Promise<void> | void) | null>(null);
  const endCallRef = useRef<(() => void) | null>(null);
  const openCallRef = useRef<(() => void) | null>(null);
  // Nối các hàm được khai báo phía dưới trong file. Dùng ref để lệnh trong
  // khung chat ("xoá hội thoại", "mở đàm thoại") gọi được chúng mà không
  // phải đụng tới mảng deps của useCallback.
  useEffect(() => {
    clearAllRef.current = clearAll;
    endCallRef.current = endCall;
    openCallRef.current = openCall;
  });

  /** Im lặng bao lâu thì coi là nói xong (ms) — chống cắt cụt "Xin chào". */
  const CALL_SILENCE_MS = 1000;
  /** Trần chờ cho một lượt nói (ms) — câu dài không bị treo. */
  const CALL_MAX_UTTERANCE_MS = 6000;
  /** Ngưỡng coi là "đang nói" khi đo âm lượng (RMS 0–1). */
  const CALL_VOICE_ON = 0.06;

  const callActiveRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const sendingRef = useRef(false);
  const mutedRef = useRef(false);
  const micDeniedRef = useRef(false);
  const busyRef = useRef(false);
  // Hàng đợi câu hỏi — khi trợ lý đang trả lời, câu hỏi gửi tiếp KHÔNG bị
  // bỏ im lặng mà xếp hàng; trả lời xong tự gửi tiếp (khắc phục lỗi
  // "AI không trả lời câu hỏi tiếp trong cuộc trò chuyện").
  const queueRef = useRef<string[]>([]);
  // Ghi nhớ tin đã thu hồi để nếu AI đang trả lời, phản hồi về sau không thêm
  // lại tin nhắn/ảnh vừa bị người dùng gỡ.
  const recalledMessagesRef = useRef(new WeakSet<Msg>());
  const recalledImagesRef = useRef(new WeakSet<Msg>());
  const sendRef = useRef<
    (text: string, opts?: { fromCall?: boolean }) => Promise<void>
  >(async () => {});
  const lastAiWordAtRef = useRef(0);
  /**
   * Chờ một nhịp im lặng sau khi trợ lý vừa đọc xong thì mới mở lại mic.
   * Điện thoại để loa ngoài nên âm thanh cuối của trợ lý vẫn còn vọng vào
   * micro vài trăm mili giây; mở mic ngay lập tức thì trợ lý nghe lại chính
   * câu mình vừa nói và tự trả lời → hội thoại lặp vô hạn.
   */
  const aiQuietUntilRef = useRef(0);
  /** Câu trợ lý vừa đọc to — dùng để nhận ra tiếng vọng từ loa. */
  const lastSpokenRef = useRef("");
  /** Mốc lúc trợ lý ngừng đọc — chỉ trong lúc gần đó mới chặn tiếng vọng. */
  const aiFinishedAtRef = useRef(0);
  const lastAssistantEventAtRef = useRef(0);
  const recRef = useRef<RecLike | null>(null);
  const startListeningRef = useRef<() => void>(() => {});

  /* ----- Watchdog đàm thoại 2 chiều: nếu phiên nghe mic rơi/treo quá 12s
   * (trình duyệt âm thầm dừng SpeechRecognition, tab bị treo ngắn…) thì tự
   * khởi động lại — cuộc gọi không bao giờ "đứng hình" vô tiếng. ----- */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (
        callActiveRef.current &&
        !mutedRef.current &&
        !micDeniedRef.current &&
        !aiSpeakingRef.current &&
        !sendingRef.current &&
        Date.now() - lastAssistantEventAtRef.current > 12_000
      ) {
        lastAssistantEventAtRef.current = Date.now();
        startListeningRef.current();
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  // Đồng hồ phòng treo: nếu AI không trả lời trong 60s → báo lỗi ra UI
  useEffect(() => {
    if (!busy) {
      setStalled(false);
      return;
    }
    // Lượt phân tích ảnh chậm hơn lượt chat thường (model phải "nhìn" ảnh rồi
    // soạn câu trả lời), nên cho thêm thời gian thay vì báo treo sớm rồi khiến
    // người dùng tưởng ảnh không được gửi đi.
    const limit = analyzingImage ? 45_000 : 30_000;
    const id = window.setTimeout(() => setStalled(true), limit);
    return () => window.clearTimeout(id);
  }, [busy, analyzingImage]);

  /* ----- Mở khóa autoplay âm thanh (chạm/bấm đầu tiên) ----- */
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new AudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        void ctx.resume();
      } catch {
        /* trình duyệt cũ — bỏ qua */
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* ----- Gộp lịch sử cục bộ + tin nhắn phiên ----- */
  const messages: Msg[] = [...history, ...pending];

  // Tự cuộn khi có tin nhắn mới, nhưng không cuộn trong lúc câu trả lời đang
  // được hiện dần; người dùng vẫn có thể tự cuộn để đọc từ đầu.
  useEffect(() => {
    if (suppressNextAutoScrollRef.current) {
      suppressNextAutoScrollRef.current = false;
      return;
    }
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, busy]);

  /* ----- Tiến trình tạo ảnh: phần trăm tăng dần tới 92% rồi chờ server ---- */
  const startImageProgress = useCallback(() => {
    if (imageTickRef.current !== null) window.clearInterval(imageTickRef.current);
    imageProgressRef.current = 0;
    setImageProgress(0);
    // Tăng chậm dần và bão hòa ở 92% — ảnh thật sự về là nhảy lên 100%.
    imageTickRef.current = window.setInterval(() => {
      const cur = imageProgressRef.current ?? 0;
      const next = cur >= 92 ? 92 : cur + (cur < 30 ? 4 : cur < 70 ? 2 : 1);
      imageProgressRef.current = next;
      setImageProgress(next);
    }, 350);
  }, []);

  const finishImageProgress = useCallback(() => {
    if (imageTickRef.current !== null) {
      window.clearInterval(imageTickRef.current);
      imageTickRef.current = null;
    }
    if (imageProgressRef.current === null) return;
    imageProgressRef.current = null;
    setImageProgress(100);
    window.setTimeout(() => {
      if (imageProgressRef.current === null) setImageProgress(null);
    }, 700);
  }, []);

  // Dọn nhịp khi rời trang để không rò rỉ timer.
  useEffect(
    () => () => {
      if (imageTickRef.current !== null) {
        window.clearInterval(imageTickRef.current);
      }
    },
    [],
  );

  /* ----- Gửi câu hỏi (chat + đàm thoại dùng chung) ----- */
  const send = useCallback(
    async (text: string, opts?: { fromCall?: boolean }) => {
      const q = text.trim();
      // Lệnh xóa hội thoại: xóa sạch ngay và kết thúc cuộc trò chuyện.
      if (isClearHistoryCommand(q)) {
        setInput("");
        setImage(null);
        setFailedReply(null);
        void clearAllRef.current?.();
        if (callActiveRef.current) endCallRef.current?.();
        return;
      }
      // Yêu cầu đàm thoại ngay trong khung chat → mở thẳng màn đàm thoại.
      if (isStartCallCommand(q)) {
        setInput("");
        if (callActiveRef.current) return;
        openCallRef.current?.();
        return;
      }
      // Gom ảnh đính kèm theo hạn mức gói. Ảnh vượt hạn mức vẫn KHÔNG chặn
      // người dùng: cắt bớt rồi vẫn gửi đi để AI trả lời các ảnh còn lại.
      const allImages: { base64: string; mime: string }[] = !opts?.fromCall
        ? [image, ...extraImages].filter((i): i is { base64: string; mime: string } => !!i)
        : [];
      const overQuota = allImages.length - MAX_IMAGES_PER_MESSAGE;
      const attachedImages = allImages.slice(0, MAX_IMAGES_PER_MESSAGE);
      const attachedImage = attachedImages[0] ?? null;
      if (!q && !attachedImage) return;
      const question = q || "Hãy mô tả và giải thích hình ảnh này trong phạm vi Phật học.";
      // Đang bận: xếp hàng chờ (chat) hoặc nhắc nhở nhẹ (đàm thoại) thay vì
      // nuốt im lặng câu hỏi của người dùng.
      if (busyRef.current) {
        if (attachedImage) {
          toast.error("Hãy đợi câu trả lời hiện tại xong rồi gửi hình ảnh.");
        } else if (!opts?.fromCall && q.length <= 500) {
          queueRef.current.push(q);
          toast("Trợ lý đang trả lời — câu hỏi của bạn đã xếp hàng.", {
            duration: 2200,
          });
        } else {
          toast.error("Đang trả lời — vui lòng chờ chút rồi nói tiếp.");
        }
        return;
      }

      // Câu mới đã gửi → lỗi cũ không còn ý nghĩa.
      setFailedReply(null);

      const base: Msg[] = [...historyRef.current, ...pendingRef.current];
      const userMsg: Msg = {
        role: "user",
        // Nhiều ảnh: ghi rõ số ảnh trong bong bóng vì phần xem trước chỉ hiện ảnh đầu.
        content:
          attachedImages.length > 1
            ? `${question}\n\n(kèm ${attachedImages.length} ảnh)`
            : question,
        ts: Date.now(),
        // Lưu ảnh đi kèm tin nhắn để hiển thị lại trong hội thoại
        image: attachedImage
          ? { base64: attachedImage.base64, mime: attachedImage.mime }
          : undefined,
      };

      if (!opts?.fromCall) {
        setInput("");
        setImage(null);
        if (overQuota > 0) {
          toast(
            `Gói cho phép ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt — ${overQuota} ảnh chưa được gửi, Trợ lý vẫn trả lời dựa trên ${MAX_IMAGES_PER_MESSAGE} ảnh còn lại.`,
            { duration: 4000 },
          );
        }
      }
      // Luôn thêm vào phiên (kể cả call) để giữ ngữ cảnh và không mất lịch sử.
      // Đánh dấu busy đồng bộ ngay để chặn hai request chồng nhau trước khi
      // useEffect kịp cập nhật — nguyên nhân gửi tiếp bị kẹt ở trạng thái busy.
      pendingRef.current = [...pendingRef.current, userMsg];
      setPending(pendingRef.current);
      busyRef.current = true;
      setBusy(true);

      // Tự phục hồi khi kết nối chập chờn: thử lại tối đa 3 lần với khoảng
      // chờ tăng dần. Các lỗi nghiệp vụ vẫn dừng ngay để không gửi sai.
      const payloadMessages = [...base, { role: "user" as const, content: question }]
        .slice(-CONTEXT_MESSAGES)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 7500),
        }));
      // Ảnh: nhánh riêng (Gemini đọc ảnh) vì Groq không còn model thị giác.
      // Hỏng/thiếu thì tự lùi về `ask` y như cũ — không mất tính năng cũ.
      const askOnce = async (): Promise<AskResult> => {
        if (attachedImages.length > 0) {
          setAnalyzingImage(true);
          try {
          // Gửi nhiều ảnh theo cấu trúc mới; nếu máy chủ chưa có bản mới (hoặc
          // lỗi) thì thử lại bằng cấu trúc một ảnh cũ, cuối cùng mới lùi về
          // `ask` — luôn có đường ra, không bao giờ chết cứng ở bước này.
          const shapes: Record<string, unknown>[] = [
            {
              messages: payloadMessages,
              images: attachedImages.map((i) => ({
                base64: i.base64,
                mime: i.mime,
              })),
            },
            {
              messages: payloadMessages,
              imageBase64: attachedImage?.base64,
              imageMime: attachedImage?.mime,
            },
          ];
          for (const shape of shapes) {
            try {
              const vision = await callConvexAction<AskResult>(
                "visionChat:analyzeImage",
                { ...shape, ...getDeviceMeta() },
              );
              if (vision.ok || vision.code === "rate_limited") return vision;
              // Nhánh đọc ảnh đã chạy và báo lỗi nghiệp vụ (hết hạn mức, ảnh
              // không đọc được…) → trả nguyên lỗi đó ra. Trước đây im lặng
              // rơi xuống `ask` vốn KHÔNG đọc ảnh, nên trợ lý trả lời như thể
              // không có ảnh nào — người dùng tưởng hệ thống không thấy ảnh.
              if (vision.message) return vision;
            } catch {
              /* thử cấu trúc tiếp theo */
            }
          }
          } finally {
            setAnalyzingImage(false);
          }
        }
        return ask({
          // Gửi kèm 24 lượt gần nhất đúng với ngữ cảnh backend sử dụng. Cắt bớt
          // ký tự phòng khi lịch sử cũ chứa câu trả lời rất dài để lượt hỏi
          // sau không bị từ chối; tin nhắn hiện tại luôn nằm cuối.
          messages: payloadMessages,
          imageBase64: attachedImage?.base64,
          imageMime: attachedImage?.mime,
          ...getDeviceMeta(),
        });
      };
      // Nhánh dự phòng: khi `ask` báo máy chủ chính đang lỗi, gọi nhánh Groq
      // REST/Gemini riêng để người dùng VẪN được trả lời ngay.
      const askResilient = async (): Promise<AskResult> => {
        // Nhánh dự phòng: gọi trước, vì khi máy chủ chính đang lỗi thì chờ nó
        // trả về cũng chẳng có kết quả — cứ gọi song song cho chắc.
        const fallback = async (): Promise<AskResult | null> => {
          try {
            return await callConvexAction<AskResult>(
              "chatFallback:chatFallback",
              { messages: payloadMessages, ...getDeviceMeta() },
            );
          } catch {
            return null;
          }
        };
        try {
          const fb = await fallback();
          if (fb?.ok) return fb;
          // Nhánh dự phòng đã trả lời dứt khoát (hết hạn mức, lỗi hệ thống)
          // thì nhánh chính không thêm được gì: nó dùng CHUNG hạn mức với
          // nhánh dự phòng và còn gửi prompt dài hơn nhiều, nên gọi tiếp chỉ
          // làm hao thêm hạn mức của những người đang dùng thật. Chỉ khi
          // nhánh dự phòng hỏng hẳn (không gọi được) mới thử nhánh chính.
          if (fb) return fb;
        } catch {
          /* bỏ qua, thử nhánh chính */
        }
        try {
          const primary = await askOnce();
          if (primary.ok || primary.code !== "ai_unavailable") return primary;
        } catch (err) {
          // `ask` ném lỗi (Server Error / mất kết nối) — thử nhánh dự phòng
          // một lần nữa trước khi báo cho người dùng.
          const fb = await fallback();
          if (fb?.ok) return fb;
          throw err;
        }
        return { ok: false, code: "ai_unavailable", message: "Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút." };
      };
      const askWithRetry = async () => {
        let lastError: unknown = new Error("Không gửi được câu hỏi.");
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const result = await askResilient();
            if (result.ok) return result;
            // Lỗi nghiệp vụ đã được backend phân loại: trả về client thay vì
            // ném ConvexError (production thường che thành "Server Error").
            const expectedError = Object.assign(new Error(result.message), {
              expectedAiFailure: true,
              code: result.code,
            });
            throw expectedError;
          } catch (err) {
            lastError = err;
            const msg = convexErrMessage(err);
            const expected = (err as { expectedAiFailure?: boolean })
              .expectedAiFailure;
            const transient =
              /hết giờ|timeout|network|fetch|rate|429|5\d\d|ECONN|tạm chưa trả lời|server error|called by client|request id|websocket|disconnect|mất kết nối/i.test(
                msg,
              );
            if (expected || !transient || attempt === 2) throw err;
            await new Promise((resolve) =>
              window.setTimeout(resolve, 600 * (attempt + 1)),
            );
          }
        }
        throw lastError;
      };

      try {
        // Người dùng yêu cầu tạo hình → chạy TẠO ẢNH trước (có thanh tiến
        // trình), sau đó mới lấy lời giải thích ngắn từ trợ lý.
        const wantsArt = !attachedImage && wantsImage(question);
        let generatedImageId: string | undefined;
        if (wantsArt) {
          startImageProgress();
          try {
            const res = await createImage({
              prompt: question,
              ...getDeviceMeta(),
            });
            if (res.ok) generatedImageId = res.storageId;
            else {
              finishImageProgress();
              toast.error(res.message);
            }
          } catch (err) {
            finishImageProgress();
            if (!opts?.fromCall) {
              toast.error(
                convexErrMessage(err) ||
                  "Chưa tạo được hình. Vui lòng thử lại sau.",
              );
            }
          }
        }

        // Đàm thoại: chờ tối đa 25s rồi bỏ qua, không để người dùng ngồi
        // nhìn "Đang suy niệm" mãi — yêu cầu chạy nền vẫn tự huỷ về sau.
        const answer = await (opts?.fromCall
          ? Promise.race([
              askWithRetry(),
              new Promise<never>((_, reject) =>
                window.setTimeout(
                  () => reject(new Error("hết giờ (25s)")),
                  25_000,
                ),
              ),
            ])
          : askWithRetry());
        setFailedReply(null);
        callRetryRef.current = 0;
        const reply = answer.reply;
        if (wantsArt) finishImageProgress();
        const replyMsg: Msg = {
          role: "assistant",
          content: reply,
          ts: Date.now(),
          ...(generatedImageId ? { imageStorageId: generatedImageId } : {}),
        };
        // Gom thao tác lưu tin nhắn về một nơi để cả chữ và chế độ đàm thoại
        // dùng chung cùng một quy tắc thu hồi tin nhắn.
        const finishReply = () => {
          pendingRef.current = pendingRef.current.filter((m) => m !== userMsg);
          setPending(pendingRef.current);
          if (recalledMessagesRef.current.has(userMsg)) return false;
          const messageToSave =
            userMsg.image && recalledImagesRef.current.has(userMsg)
              ? { ...userMsg, image: undefined }
              : userMsg;
          const nextHistory = [...historyRef.current, messageToSave, replyMsg];
          historyRef.current = nextHistory;
          setHistory(nextHistory);
          // Ảnh base64 nặng: chỉ giữ ảnh trong 40 tin nhắn gần nhất, tin cũ
          // hơn bỏ ảnh (giữ chữ) để lịch sử lưu trữ không phình to.
          const cut = Math.max(0, nextHistory.length - 40);
          const trimmed = nextHistory.map((m, idx) =>
            idx < cut && m.image ? { ...m, image: undefined } : m,
          );
          void saveLocalChatSecure(trimmed);
          return true;
        };

        if (opts?.fromCall) {
          if (!finishReply()) return;
          // Trong cuộc gọi: đọc to bằng giọng người dùng đã chọn — server TTS
          // trước (Gemini/OpenAI), quá 4s hoặc lỗi thì tự rơi về giọng trình
          // duyệt; đọc xong tự nghe tiếp → đàm thoại 2 chiều liền mạch.
          if (!callActiveRef.current) return;
          aiSpeakingRef.current = true;
          sendingRef.current = false;
          setInterim("");
          setCallStatus("speaking");
          lastAssistantEventAtRef.current = Date.now();
          // Đóng mic ngay khi bắt đầu đọc: không để trình duyệt nghe nhầm
          // giọng trợ lý thành câu hỏi của người dùng.
          aiQuietUntilRef.current = Date.now() + 400;
          // Không đọc to đường dẫn (đọc "https slash slash..." rất khó nghe);
          // người dùng vẫn thấy và bấm được link trong hội thoại.
          const spoken = reply
            .replace(/https?:\/\/\S+/g, "")
            .replace(/[ \t]{2,}/g, " ")
            .trim();
          void speakVI(spoken || reply, {
            voice: voiceIdRef.current,
            onDone: () => {
              aiSpeakingRef.current = false;
              lastAiWordAtRef.current = Date.now();
              lastAssistantEventAtRef.current = Date.now();
              if (!callActiveRef.current) return;
              lastSpokenRef.current = spoken || reply;
              // Đợi hết vọng cuối rồi mới mở lại mic.
              aiFinishedAtRef.current = Date.now();
              aiQuietUntilRef.current = Date.now() + 900;
              setCallStatus("listening");
              startListeningRef.current();
            },
          });
        } else {
          // Backend trả về câu trả lời đầy đủ; hiển thị từng phần để người dùng
          // đọc tự nhiên, không bị kéo xuống đáy liên tục khi chữ đang hiện.
          suppressNextAutoScrollRef.current = true;
          await new Promise<void>((resolve) => {
            const chars = Array.from(reply);
            let shown = 0;
            setStreamingReply("");
            const tick = () => {
              if (shown >= chars.length) {
                setStreamingReply(null);
                resolve();
                return;
              }
              shown = Math.min(chars.length, shown + 3);
              setStreamingReply(chars.slice(0, shown).join(""));
              window.setTimeout(tick, 24);
            };
            tick();
          });
          finishReply();
        }
      } catch (err) {
        setStreamingReply(null);
        finishImageProgress();
        const errorMessage = convexErrMessage(err);
        const errText =
          /\[convex|server error|called by client|request id/i.test(errorMessage)
            ? "Kết nối máy chủ chưa ổn định. Bạn hãy gửi lại câu này sau ít giây."
            : errorMessage;
        // Lỗi nằm ngay trong hội thoại kèm nút gửi lại, thay vì chỉ có toast
        // biến mất sau mấy giây.
        setFailedReply({
          message: errText || "Không gửi được câu hỏi.",
          question,
          msg: userMsg,
        });
        if (!opts?.fromCall) {
          toast.error(errText || "Không gửi được câu hỏi.");
        } else {
          toast.error(errText || "Không kết nối được trợ lý.");
          // Không mở màn "đang nâng cấp" chỉ vì một request AI lỗi: màn che toàn
          // màn hình khiến người dùng tưởng mất kết nối và không gửi tiếp được.
          sendingRef.current = false;
          if (callActiveRef.current) {
            setCallStatus("listening");
            // Tự gửi lại đúng câu vừa nói một lần — nguyên nhân "đàm thoại
            // không phản hồi" là người dùng phải nói lại từ đầu.
            if (callRetryRef.current < 1) {
              callRetryRef.current += 1;
              window.setTimeout(() => {
                if (callActiveRef.current) {
                  void sendRef.current(question, { fromCall: true });
                }
              }, 1200);
              return;
            }
            callRetryRef.current = 0;
            window.setTimeout(() => startListeningRef.current(), 800);
          }
        }
      } finally {
        finishImageProgress();
        busyRef.current = false;
        setBusy(false);
        // Trả lời xong → tự gửi câu hỏi đang xếp hàng bằng callback mới nhất,
        // để lượt tiếp theo nhận đủ vừa được câu trả lời vừa lưu vào lịch sử.
        if (!opts?.fromCall) {
          window.setTimeout(() => {
            const next = queueRef.current.shift();
            if (!next) return;
            if (busyRef.current) queueRef.current.unshift(next);
            else void sendRef.current(next);
          }, 80);
        }
      }
    },
    [ask, createImage, extraImages, image],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /* ----- Gửi lại câu vừa bị lỗi (nút "Gửi lại" trong hội thoại) ----- */
  const retryFailed = useCallback(() => {
    const failed = failedReply;
    if (!failed || busyRef.current) return;
    setFailedReply(null);
    // Gỡ bong bóng lỗi cũ khỏi hàng chờ để không hiện hai lần cùng một câu.
    pendingRef.current = pendingRef.current.filter((m) => m !== failed.msg);
    setPending(pendingRef.current);
    void send(failed.question);
  }, [failedReply, send]);

  /* ----- Đàm thoại: trả lời tại chỗ cho lời chào (không gọi AI) ----- */
  const handleLocalReply = useCallback(
    (userText: string, reply: string) => {
      const userMsg: Msg = { role: "user", content: userText, ts: Date.now() };
      const replyMsg: Msg = { role: "assistant", content: reply, ts: Date.now() };
      const nextHistory = [...historyRef.current, userMsg, replyMsg];
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      void saveLocalChatSecure(nextHistory);
      if (!callActiveRef.current) return;
      aiSpeakingRef.current = true;
      setInterim("");
      setCallStatus("speaking");
      lastAssistantEventAtRef.current = Date.now();
      void speakVI(reply, {
        voice: voiceIdRef.current,
        onDone: () => {
          aiSpeakingRef.current = false;
          lastAiWordAtRef.current = Date.now();
          lastAssistantEventAtRef.current = Date.now();
          if (!callActiveRef.current) return;
          lastSpokenRef.current = reply;
          aiFinishedAtRef.current = Date.now();
          aiQuietUntilRef.current = Date.now() + 900;
          setCallStatus("listening");
          startListeningRef.current();
        },
      });
    },
    [speakVI],
  );

  /* ----- Đàm thoại: xử lý một câu người dùng vừa nói ----- */
  const handleUtterance = useCallback(
    (text: string) => {
      // "Xoá hội thoại" trong đàm thoại → xóa sạch và kết thúc cuộc gọi.
      if (isClearHistoryCommand(text)) {
        clearAllRef.current?.();
        if (callActiveRef.current) endCallRef.current?.();
        return;
      }
      // Câu rỗng (nghe ra tiếng ồn) → nghe lại, không gửi lên trợ lý.
      if (!text.trim()) {
        setInterim("");
        if (callActiveRef.current) setCallStatus("listening");
        window.setTimeout(() => startListeningRef.current(), 300);
        return;
      }
      if (busyRef.current || sendingRef.current) {
        // Trợ lý còn đang trả lời: thử lại nhiều lần thay vì một lần rồi bỏ.
        if (++busyWaitsRef.current <= 10) {
          window.setTimeout(() => startListeningRef.current(), 500);
        }
        return;
      }
      busyWaitsRef.current = 0;
      // Lời chào/cảm ơn thuần → đáp ngay, khỏi chờ chép lại rồi gọi AI.
      const fast = smallTalkReply(text);
      if (fast) {
        handleLocalReply(text, fast);
        return;
      }
      setInterim("");
      sendingRef.current = true;
      setCallStatus("thinking");
      lastAssistantEventAtRef.current = Date.now();
      void send(text, { fromCall: true });
    },
    [handleLocalReply, send],
  );

  /* ----- Đàm thoại: bắt đầu một phiên nghe liên tục ----- */
  const startListening = useCallback(() => {
    if (
      !callActiveRef.current ||
      mutedRef.current ||
      micDeniedRef.current ||
      aiSpeakingRef.current ||
      sendingRef.current
    ) {
      return;
    }
    // Vừa đọc xong: chờ hết tiếng vọng rồi mới mở mic, nếu không trợ lý
    // nghe lại chính câu mình vừa đọc và tự hỏi lại nhau.
    const quiet = aiQuietUntilRef.current - Date.now();
    if (quiet > 0) {
      window.setTimeout(() => {
        if (callActiveRef.current) startListeningRef.current();
      }, quiet + 40);
      return;
    }
    try {
      // Bỏ onend của phiên cũ TRƯỚC khi hủy: nếu không, onend của phiên cũ
      // chạy và chốt nhầm câu của phiên mới.
      if (recRef.current) recRef.current.onend = null;
      recRef.current?.abort();
    } catch {
      /* noop */
    }

    // Trình duyệt không có Web Speech (Firefox, một số WebView): chỉ ghi âm
    // rồi chép lại bằng Whisper. Trước đây nhánh này báo "micro đã tắt" và
    // chết luôn → không nghe được lệnh trong cuộc gọi.
    const startRecordOnly = () => {
      let loudSince = 0;
      let lastLoudAt = 0;
      void startMicRecording((level) => {
        if (!callActiveRef.current) return;
        const now = Date.now();
        if (level >= CALL_VOICE_ON) {
          if (!loudSince) loudSince = now;
          lastLoudAt = now;
          return;
        }
        if (!loudSince) return;
        if (now - lastLoudAt < CALL_SILENCE_MS || now - loudSince < 700) return;
        loudSince = 0;
        setCallStatus("thinking");
        void stopMicRecording().then((clip) =>
          transcribeClip(clip, "").then((heard) => handleUtterance(heard)),
        );
      });
    };

    const rec = newRecognition();
    if (!rec) {
      if (micSupported) {
        micDeniedRef.current = false;
        setCallStatus("listening");
        // Báo người dùng biết đang dùng nhánh ghi âm, không phải bị treo.
        toast.info(
          "Trình duyệt không nhận dạng giọng nói trực tiếp — Trợ lý đang ghi âm rồi chép lại, bạn cứ nói bình thường.",
        );
        startRecordOnly();
      } else {
        micDeniedRef.current = true;
        setCallStatus("muted");
      }
      return;
    }
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalBuf = "";
    let pendingBuf = "";
    let lastSpeechAt = 0;
    let speechStartedAt = 0;
    let lastEventAt = 0;
    let sessionStartedAt = 0;
    let commitTimer: number | null = null;
    let committed = false;
    let waitRetries = 0;
    let watchdog = 0;
    let errorStreak = 0;
    // Đo âm lượng: dự phòng cho trình duyệt không có/không nghe được Web
    // Speech — khi đó người dùng nói xong vẫn chốt câu để Whisper tự nghe.
    let loudSince = 0;
    let lastLoudAt = 0;

    const cancelCommit = () => {
      if (commitTimer !== null) {
        window.clearTimeout(commitTimer);
        commitTimer = null;
      }
    };
    const stopWatchdog = () => {
      if (watchdog) {
        window.clearInterval(watchdog);
        watchdog = 0;
      }
    };
    // Dựng lại phiên nghe khi trình duyệt treo hoặc báo lỗi tạm. Đây là
    // nguyên nhân "nói mà trợ lý không nghe": phiên nghe chết âm thầm.
    const restartSession = () => {
      if (committed || !callActiveRef.current) return;
      stopWatchdog();
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
      window.setTimeout(() => {
        if (callActiveRef.current && !committed) startListeningRef.current();
      }, 350);
    };

    // Chốt câu: dừng ghi âm rồi chép lại bằng Whisper (chính xác hơn bản nghe
    // trực tiếp của trình duyệt). Lỗi thì giữ nguyên bản gốc.
    const commit = (force = false) => {
      cancelCommit();
      if (committed || !callActiveRef.current) return;
      const heard = (finalBuf + " " + pendingBuf)
        .replace(/\s+/g, " ")
        .trim();
      if (!force && heard.length < 2) return;
      // Mic nghe lại chính giọng loa: bỏ qua và mở phiên nghe mới, tuyệt đối
      // không gửi đi — nếu gửi, trợ lý sẽ trả lời câu của chính nó rồi lặp.
      if (
        looksLikeEcho(
          heard,
          lastSpokenRef.current,
          Date.now() - aiFinishedAtRef.current,
        )
      ) {
        cancelCommit();
        stopWatchdog();
        void stopMicRecording();
        finalBuf = "";
        pendingBuf = "";
        setInterim("");
        setCallStatus("listening");
        window.setTimeout(() => {
          if (callActiveRef.current) startListeningRef.current();
        }, 500);
        return;
      }
      committed = true;
      finalBuf = "";
      pendingBuf = "";
      recRef.current = null;
      stopWatchdog();
      try {
        rec.onend = null;
        rec.stop();
      } catch {
        /* noop */
      }
      setInterim(heard);
      // Lời chào/cảm ơn thuần: đáp ngay, khỏi chờ chép lại (tiết kiệm 1–2 giây).
      if (smallTalkReply(heard)) {
        void stopMicRecording();
        handleUtterance(heard);
        return;
      }
      setCallStatus("thinking");
      void stopMicRecording().then((clip) =>
        transcribeClip(clip, heard).then((better) => handleUtterance(better)),
      );
    };

    // KHÔNG gửi ngay khi vừa nghe được vài chữ. Web Speech chốt từng từ rất
    // sớm, nên "Xin chào" từng bị cắt còn "Xin". Chỉ gửi khi đã im lặng đủ
    // lâu (người dùng nói xong), có trần chờ để câu dài không bị treo.
    const scheduleCommit = (force = false) => {
      cancelCommit();
      if (committed || !callActiveRef.current) return;
      const heard = (finalBuf + " " + pendingBuf)
        .replace(/\s+/g, " ")
        .trim();
      // Chưa có chữ nào từ trình duyệt: chỉ chốt khi đo âm lượng bảo đã nói
      // xong (dự phòng không có Web Speech).
      if (heard.length < 2) {
        if (force) commit(true);
        return;
      }
      const now = Date.now();
      // Trợ lý đang nói hoặc vừa nói xong: KHÔNG bỏ rơi câu của người dùng —
      // hẹn thử lại sau ít phút (trước đây lỗi ở đây làm câu nói biến mất).
      if (
        aiSpeakingRef.current ||
        sendingRef.current ||
        now - lastAiWordAtRef.current < 350
      ) {
        if (++waitRetries > 20) return;
        commitTimer = window.setTimeout(scheduleCommit, 400);
        return;
      }
      const silentMs = now - lastSpeechAt;
      const waitedMs = now - speechStartedAt;
      if (silentMs < CALL_SILENCE_MS && waitedMs < CALL_MAX_UTTERANCE_MS) {
        commitTimer = window.setTimeout(
          scheduleCommit,
          Math.max(
            100,
            Math.min(
              CALL_SILENCE_MS - silentMs,
              CALL_MAX_UTTERANCE_MS - waitedMs,
            ),
          ),
        );
        return;
      }
      commit();
    };

    rec.onstart = () => {
      errorStreak = 0;
      lastAssistantEventAtRef.current = Date.now();
      if (callActiveRef.current) setCallStatus("listening");
    };
    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += `${r[0].transcript} `;
        else pending += `${r[0].transcript} `;
      }
      pendingBuf = pending;
      const now = Date.now();
      errorStreak = 0;
      lastEventAt = now;
      if (!lastSpeechAt) speechStartedAt = now;
      lastSpeechAt = now;
      // Nối dấu thay vì ghi đè, để câu hiện ra đúng như đang nói.
      setInterim(`${finalBuf} ${pending}`.replace(/\s+/g, " ").trim());
      scheduleCommit();
    };
    rec.onerror = (e) => {
      const code = e.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        micDeniedRef.current = true;
        setCallStatus("muted");
        toast.error("Cần cấp quyền micro để đàm thoại bằng giọng nói.");
        return;
      }
      // Lỗi tạm (no-speech / aborted / network / audio-capture): mở lại phiên
      // nghe. Trước đây im lặng bỏ qua → micro như bị treo.
      if (Date.now() - sessionStartedAt < 800 && ++errorStreak > 4) {
        micDeniedRef.current = true;
        setCallStatus("muted");
        toast.error(
          "Trình duyệt không nhận dạng được giọng nói. Hãy dùng Chrome/Safari mới nhất.",
        );
        return;
      }
      restartSession();
    };
    rec.onend = () => {
      recRef.current = null;
      stopWatchdog();
      cancelCommit();
      // Trình duyệt tự kết thúc phiên nghe: vẫn chốt câu đang dở nếu có.
      if (!committed) commit();
      if (
        callActiveRef.current &&
        !mutedRef.current &&
        !micDeniedRef.current &&
        !aiSpeakingRef.current &&
        !sendingRef.current &&
        !committed
      ) {
        window.setTimeout(() => {
          if (callActiveRef.current) startListeningRef.current();
        }, 300);
      }
    };
    recRef.current = rec;
    sessionStartedAt = Date.now();
    lastEventAt = sessionStartedAt;
    // Bảo vệ: Chrome/Safari đôi khi treo phiên nghe mà không báo lỗi. Không có
    // gì trong 12 giây → tự dựng lại phiên nghe để không "chết âm thầm".
    stopWatchdog();
    watchdog = window.setInterval(() => {
      if (committed || !callActiveRef.current) return;
      // Đang có tiếng (đo được) → để đo mức lo, không dựng lại phiên nghe.
      if (loudSince) return;
      if (Date.now() - lastEventAt < 12_000) return;
      lastEventAt = Date.now();
      restartSession();
    }, 2000);
    try {
      rec.start();
      // Ghi âm song song: sau khi có câu, chép lại bằng Whisper cho chính xác.
      // Đồng thời đo mức âm lượng để tự chốt câu khi trình duyệt im lặng
      // (nhiều máy không có Web Speech → không có kết quả nào để dựa vào).
      void startMicRecording((level) => {
        if (committed) return;
        const now = Date.now();
        if (level >= CALL_VOICE_ON) {
          if (!loudSince) loudSince = now;
          lastLoudAt = now;
          return;
        }
        if (!loudSince) return;
        const quietMs = now - lastLoudAt;
        const spokenMs = now - loudSince;
        if (quietMs < CALL_SILENCE_MS || spokenMs < 700) return;
        loudSince = 0;
        // Chỉ chốt khi trình duyệt chưa nghe được gì; nếu đã có chữ thì đường
        // chính (Web Speech) tự chốt theo nhịp im lặng.
        if (finalBuf.trim().length < 2 && pendingBuf.trim().length < 2) {
          scheduleCommit(true);
        }
      });
    } catch {
      /* đã start — bỏ qua */
    }
  }, [handleUtterance, transcribeClip]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const openCall = useCallback(() => {
    if (busyRef.current) {
      toast("Trợ lý đang trả lời — hãy đợi câu trả lời hiện tại xong.");
      return;
    }
    if (!micSupported) {
      toast.error(
        "Trình duyệt không hỗ trợ micro. Hãy dùng Chrome/Safari mới nhất.",
      );
      return;
    }
    stopSpeaking();
    // Mở khóa phát âm ngay trong cú bấm Call. stopSpeaking có thể đóng
    // AudioContext cũ, vì vậy phải prime lại sau khi dừng.
    primeSpeechAudio();
    micDeniedRef.current = false;
    mutedRef.current = false;
    sendingRef.current = false;
    aiSpeakingRef.current = false;
    setInterim("");
    setCallStatus("listening");
    setCallOpen(true);
    callActiveRef.current = true;
    lastAssistantEventAtRef.current = Date.now();
    window.setTimeout(() => startListeningRef.current(), 400);
  }, [micSupported, primeSpeechAudio, stopSpeaking]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    recRef.current = null;
    // Nhả micro ngay khi kết thúc cuộc gọi, nếu không đèn ghi âm cứ sáng.
    void stopMicRecording();
    stopSpeaking();
    sendingRef.current = false;
    aiSpeakingRef.current = false;
    setCallOpen(false);
    setCallStatus("listening");
  }, [stopSpeaking]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
      void stopMicRecording();
      setInterim("");
      setCallStatus("muted");
    } else {
      lastAssistantEventAtRef.current = Date.now();
      setCallStatus("listening");
      startListeningRef.current();
    }
  }, []);

  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const pickImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ hỗ trợ file ảnh.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 20 MB. Hãy chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Không thể đọc ảnh trên thiết bị.");
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        toast.error("Trình duyệt không mở được ảnh này. Hãy thử lại bằng JPG hoặc PNG.");
      img.onload = () => {
        if (!img.width || !img.height) {
          toast.error("Ảnh không hợp lệ. Hãy chọn ảnh khác.");
          return;
        }
        // Groq nhận ảnh base64 trong image_url. Thu nhỏ vừa đủ để nhận diện
        // chữ và vật thể, đồng thời tránh vượt giới hạn request và tiết kiệm dữ liệu.
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Không thể xử lý ảnh trên thiết bị.");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          toast.error("Không thể chuyển ảnh sang định dạng phù hợp.");
          return;
        }
        const picked = { base64, mime: "image/jpeg" };
        // Ảnh đầu tiên giữ chỗ xem trước; ảnh tiếp theo xếp vào hàng chờ tới
        // trần của gói. Không bao giờ chặn người dùng — vượt trần thì thay ảnh
        // cũ nhất và AI vẫn trả lời các ảnh còn lại.
        if (!image) {
          extraImagesRef.current = [];
          setExtraImages([]);
          setImageState(picked);
          return;
        }
        const extras = extraImagesRef.current;
        const next =
          extras.length >= MAX_IMAGES_PER_MESSAGE - 1
            ? [...extras.slice(1), picked]
            : [...extras, picked];
        if (extras.length >= MAX_IMAGES_PER_MESSAGE - 1) {
          toast(
            `Gói cho phép ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt — ảnh mới thay ảnh cũ nhất. Trợ lý vẫn trả lời các ảnh còn lại.`,
            { duration: 4000 },
          );
        }
        extraImagesRef.current = next;
        setExtraImages(next);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [image]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearAll = async () => {
    queueRef.current = [];
    pendingRef.current = [];
    historyRef.current = [];
    setPending([]);
    setHistory([]);
    setFailedReply(null);
    try {
      localStorage.removeItem(CHAT_KEY);
    } catch {
      /* noop */
    }
    toast.success("Đã xóa hội thoại.");
  };

  /** Thu hồi một tin nhắn đã gửi; ảnh đi kèm cũng bị gỡ cùng tin nhắn. */
  const recallMessage = useCallback((target: Msg) => {
    if (target.role !== "user") return;
    recalledMessagesRef.current.add(target);
    historyRef.current = historyRef.current.filter((m) => m !== target);
    pendingRef.current = pendingRef.current.filter((m) => m !== target);
    setHistory(historyRef.current);
    setPending(pendingRef.current);
    void saveLocalChatSecure(historyRef.current);
    toast.success("Đã thu hồi tin nhắn.");
  }, []);

  /** Chỉ gỡ ảnh, vẫn giữ lại nội dung chữ của tin nhắn. */
  const recallImage = useCallback((target: Msg) => {
    if (!target.image) return;
    recalledImagesRef.current.add(target);
    const stripImage = (m: Msg): Msg =>
      m === target ? { ...m, image: undefined } : m;
    historyRef.current = historyRef.current.map(stripImage);
    pendingRef.current = pendingRef.current.map(stripImage);
    setHistory(historyRef.current);
    setPending(pendingRef.current);
    void saveLocalChatSecure(historyRef.current);
    toast.success("Đã thu hồi hình ảnh.");
  }, []);

  const onVoiceChat = useCallback(
    (text: string) => {
      // Không gửi câu rỗng khi nghe ra toáng tiếng ồn — chỉ báo lại cho
      // người dùng biết để họ nói lại.
      if (!text.trim()) {
        toast("Mình chưa nghe rõ. Bạn nói lại giúp nhé.");
        return;
      }
      void send(text);
    },
    [send],
  );

  const isEmpty = messages.length === 0;

  /* ================================================================ */
  /* FULL MÀN HÌNH — cả viewport là Trợ lý Phật học Dharma AI            */
  /* ================================================================ */
  return (
    <div className="fb-bg flex h-[100dvh] flex-col overflow-hidden">
      {/* ---------- Header: gọi bên trái, tên ở giữa, điều khiển bên phải ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-border/60 bg-background/95 px-2 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-1 justify-self-start">
          <button
            type="button"
            onClick={openCall}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Đàm thoại bằng giọng nói"
            title="Đàm thoại bằng giọng nói"
          >
            <Phone className="h-5 w-5 shrink-0" />
          </button>
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <p className="max-w-[9.5rem] truncate text-center text-[13px] font-extrabold uppercase tracking-[0.12em] text-foreground sm:max-w-none sm:text-[15px] sm:tracking-[0.18em]">
            Trợ lý Phật học
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 justify-self-end">
          <button
            type="button"
            onClick={() => navigate("/settings?section=about")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent hover:text-accent-foreground"
            title="Cài đặt và cập nhật ứng dụng"
            aria-label="Cài đặt và cập nhật ứng dụng"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ---------- Khu hội thoại: chiếm toàn bộ phần còn lại ---------- */}
      <div
        ref={scrollRef}
        className={cn(
          isEmpty
            ? "fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] top-[4.75rem] z-10 overflow-hidden bg-background px-4 py-3"
            : "min-h-0 flex-1 overflow-y-auto pb-24 pt-16 transition-[padding] duration-200",
          !isEmpty && image && "pb-48",
        )}
      >
        {isEmpty ? (
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center text-center">
            <p className="max-w-md text-lg font-semibold leading-relaxed tracking-tight text-foreground sm:text-xl">
              Hôm nay tôi có thể giúp gì cho bạn trên con đường Phật pháp?
            </p>
            <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => void send(s.text)}
                  className="rounded-2xl border border-border/60 bg-card px-4 py-3 text-left text-sm leading-snug text-foreground/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 sm:text-base"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3 sm:px-4 [&>*:first-child]:mt-0">
            {messages.map((m, i) => {
              // Nhóm tin nhắn liên tiếp cùng người gửi — kiểu Messenger
              const grouped = i > 0 && messages[i - 1].role === m.role;
              return m.role === "user" ? (
                <UserMessage
                  key={i}
                  content={m.content}
                  ts={m.ts}
                  grouped={grouped}
                  image={m.image}
                  onRecall={() => recallMessage(m)}
                  onRecallImage={m.image ? () => recallImage(m) : undefined}
                />
              ) : (
                <AssistantMessage
                  key={i}
                  content={m.content}
                  ts={m.ts}
                  grouped={grouped}
                  image={m.image}
                  imageStorageId={m.imageStorageId}
                />
              );
            })}
            {streamingReply !== null && streamingReply.length > 0 && (
              <AssistantMessage content={streamingReply} ts={Date.now()} grouped={false} />
            )}
            {/* Lỗi trả lời + nút gửi lại, hiện ngay trong hội thoại */}
            {failedReply && (
              <div className="mt-4 flex items-start gap-2">
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <Undo2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 sm:max-w-[78%]">
                  <div className="rounded-3xl rounded-bl-md border border-destructive/40 bg-destructive/10 px-4 py-3">
                    <p className="text-sm font-semibold text-destructive">
                      Trợ lý chưa trả lời được
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                      {failedReply.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={retryFailed}
                        disabled={busy}
                        className="gap-1.5"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                        Gửi lại
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setFailedReply(null)}
                        disabled={busy}
                      >
                        Bỏ qua
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {imageProgress !== null && (
              <div className="mt-4 flex items-start gap-2">
                <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
                  <Bot className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1 sm:max-w-[75%]">
                  <div className="rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>
                        {imageProgress >= 100
                          ? "Đã tạo xong hình"
                          : "Đang vẽ hình theo yêu cầu của bạn"}
                      </span>
                      <span className="tabular-nums text-primary">
                        {imageProgress}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-300 ease-out"
                        style={{ width: `${imageProgress}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Trợ lý đang phác họa — vui lòng chờ thêm ít giây.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {busy && streamingReply === null && imageProgress === null && (stalled ? (
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="pt-2 text-sm text-muted-foreground">
                  Trả lời quá lâu hoặc kết nối không ổn định — hãy thử gửi lại câu hỏi.
                </p>
              </div>
            ) : (
              <AssistantThinking />
            ))}
          </div>
        )}
      </div>

      <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-3xl bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4"
        >
          {image && (
            <div className="mb-2 flex items-center gap-2 pl-1">
              <div className="relative">
                <img
                  src={`data:${image.mime};base64,${image.base64}`}
                  alt="Ảnh sẽ gửi"
                  className="h-16 w-16 rounded-xl border border-border/60 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                  aria-label="Xóa ảnh"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                Ảnh kèm câu hỏi
              </span>
            </div>
          )}

          <div className="flex items-end gap-1 rounded-[24px] border border-border/70 bg-card p-1.5 shadow-lg transition focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickImage(f);
                e.target.value = "";
              }}
            />
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                aria-label="Gửi ảnh cho trợ lý"
                title="Tải lên hình ảnh"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void clearAll()}
                className="flex h-8 w-8 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                title="Xóa hội thoại"
                aria-label="Xóa hội thoại"
              >
                <Eraser className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder=""
              className="max-h-32 min-h-9 flex-1 resize-none self-center bg-transparent py-2 text-[16px] leading-relaxed outline-none placeholder:text-muted-foreground/60 sm:text-[17px]"
            />

            {micSupported && (
              <button
                type="button"
                onClick={() => (listening ? stop() : start(onVoiceChat))}
                disabled={micRefining}
                aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:opacity-60",
                  listening && "bg-destructive/10 text-destructive",
                )}
              >
                {micRefining ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin text-gold" />
                ) : (
                  <Mic className="h-[18px] w-[18px]" />
                )}
                {listening && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                  </span>
                )}
              </button>
            )}

            <Button
              type="submit"
              size="icon"
              disabled={busy || (!input.trim() && !image)}
              className="h-10 w-10 shrink-0 rounded-full"
              aria-label="Gửi câu hỏi"
            >
              {busy ? (
                <AudioLines className="h-[18px] w-[18px] animate-pulse" />
              ) : (
                <Send className="h-[18px] w-[18px]" />
              )}
            </Button>
          </div>

          {/* Trạng thái nghe / chép lại: người dùng luôn biết ứng dụng đang
              nghe gì và đã nghe được bao nhiêu. */}
          {(listening || micRefining || micInterim) && (
            <div className="mt-2 flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
              {micRefining ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" />
                  <span>Đang chép lại cho rõ và đúng dấu…</span>
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
                  <span className="truncate">
                    {micInterim || "Đang nghe… nói xong bấm lại để gửi"}
                  </span>
                </>
              )}
            </div>
          )}
        </form>

      {callOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#09090b] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55rem 38rem at 50% 42%, rgba(245,158,11,0.15), transparent 62%), linear-gradient(180deg, rgba(17,17,17,0.96), rgba(9,9,11,1))",
            }}
          />

          <div className="relative z-10 flex h-full w-full max-w-[1800px] flex-col">
            <div className="flex w-full items-center justify-between px-5 pt-5 sm:px-8">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-700">
                  <Bot className="h-6 w-6 text-white" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                    Trợ lý Phật học
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={endCall}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-6">
              <div
                className={cn(
                  "orb-shell h-52 w-52 sm:h-64 sm:w-64 lg:h-80 lg:w-80",
                  callStatus === "listening" && "orb-listening",
                  callStatus === "speaking" && "orb-speaking",
                  callStatus === "thinking" && "orb-thinking",
                  callStatus === "muted" && "opacity-50",
                )}
              >
                <div className="orb-core" />
              </div>

              <p className="mt-8 text-center text-xl font-medium tracking-wide text-white/90 sm:text-2xl">
                {callStatus === "listening"
                  ? "Đang nghe"
                  : callStatus === "thinking"
                    ? "Đang suy niệm"
                    : callStatus === "speaking"
                      ? "Đang trả lời"
                      : "Micro đã tắt"}
              </p>

              {/* Chỉ hiển thị trạng thái ngắn — không còn văn bản trả lời/caption */}
            </div>

            <div className="relative z-10 flex items-center justify-center gap-6 pb-[max(1.6rem,env(safe-area-inset-bottom))] pt-2">
              {callStatus !== "muted" ? (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                  aria-label="Tắt micro"
                  title="Tắt micro"
                >
                  <Mic className="h-7 w-7" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-amber-500/20 backdrop-blur transition hover:bg-amber-500/30"
                  aria-label="Bật micro"
                  title="Bật micro"
                >
                  <MicOff className="h-7 w-7" />
                </button>
              )}

              <button
                type="button"
                onClick={endCall}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition hover:bg-red-400 active:scale-95"
                aria-label="Kết thúc đàm thoại"
                title="Kết thúc"
              >
                <PhoneOff className="h-8 w-8" />
              </button>

              <div className="flex h-16 w-16 items-center justify-center">
                {callStatus === "speaking" && (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      aiSpeakingRef.current = false;
                      sendingRef.current = false;
                      lastAssistantEventAtRef.current = Date.now();
                      setCallStatus("listening");
                      startListeningRef.current();
                    }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                    aria-label="Ngừng đọc"
                    title="Ngừng đọc"
                  >
                    <Square className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Vệ sinh hiển thị: đảm bảo không còn ký tự markdown (**, *, ###) trong khung
 * chat — kể cả tin nhắn cũ lưu trước khi máy chủ tự làm sạch đầu ra.
 */
function plainText(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[*•]+\s+/gm, "– ");
}

function AssistantMessage({
  content,
  ts,
  grouped,
  image,
  imageStorageId,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
  /** Ảnh người dùng tải lên (chưa dùng ở bong bóng trợ lý) */
  image?: { base64: string; mime: string };
  /** storageId ảnh AI tạo trong Convex File Storage */
  imageStorageId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = plainText(content);
  // Nạp URL ảnh từ storage — URL ổn định nên lịch sử cũ vẫn xem lại được.
  const imageUrl = useQuery(
    api.aiChat.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : "skip",
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    const payload = `${text}\n\n— Trợ lý Phật học`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Trợ lý Phật học", text: payload });
        return;
      }
    } catch {
      // Người dùng đã hủy chia sẻ — bỏ qua.
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      /* bộ nhớ đầy hoặc trình duyệt chặn clipboard */
    }
  };

  return (
    <div className={cn("flex items-start gap-2", grouped ? "mt-1.5" : "mt-5")}>
      {/* Avatar robot ở TRÊN — thẳng hàng đầu bong bóng trả lời */}
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1 sm:max-w-[75%]">
        {image && (
          <img
            src={`data:${image.mime};base64,${image.base64}`}
            alt="Hình ảnh Trợ lý Phật học tạo theo yêu cầu"
            className="mb-2 block max-h-80 w-auto max-w-full rounded-3xl rounded-bl-md border border-border/50 object-cover shadow-sm"
          />
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Hình ảnh Trợ lý Phật học tạo theo yêu cầu"
            className="mb-2 block max-h-80 w-auto max-w-full rounded-3xl rounded-bl-md border border-border/50 object-cover shadow-sm"
          />
        )}
        <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-2.5 text-[18px] leading-[1.8] text-foreground/95 shadow-sm sm:text-[19px]">
          {text}
        </div>
        <div className="mt-1 flex items-center gap-1 pl-2 text-[12px] text-muted-foreground/70">
          <span>{formatTs(ts)}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded px-1 py-0.5 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sao chép câu trả lời"
            title={copied ? "Đã sao chép" : "Sao chép"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-gold" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded px-1 py-0.5 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chia sẻ câu trả lời"
            title="Chia sẻ"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMessage({
  content,
  ts,
  grouped,
  image,
  onRecall,
  onRecallImage,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
  image?: { base64: string; mime: string };
  onRecall: () => void;
  onRecallImage?: () => void;
}) {
  return (
    <div className={cn("flex justify-end", grouped ? "mt-1.5" : "mt-5")}>
      <div className="flex max-w-[86%] flex-col items-end sm:max-w-[78%]">
        {/* Ảnh đi kèm — có nút thu hồi riêng, không cần xóa cả tin nhắn. */}
        {image && (
          <div className="relative mb-1.5 max-w-full">
            <img
              src={`data:${image.mime};base64,${image.base64}`}
              alt="Ảnh người dùng gửi kèm"
              className="block max-h-64 w-auto max-w-full rounded-2xl border border-border/60 object-cover shadow-sm"
            />
            {onRecallImage && (
              <button
                type="button"
                onClick={onRecallImage}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur transition hover:bg-black/85 active:scale-95"
                aria-label="Thu hồi hình ảnh"
                title="Thu hồi hình ảnh"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {content && (
          <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[18px] leading-[1.8] text-primary-foreground shadow-sm sm:text-[19px]">
            {content}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 pr-1 text-[12px] text-muted-foreground/70">
          <span>{formatTs(ts)}</span>
          <button
            type="button"
            onClick={onRecall}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Thu hồi tin nhắn"
            title="Thu hồi tin nhắn"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Thu hồi
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Định dạng thời gian tin nhắn — LUÔN có ngày tháng cạnh giờ:
 * hôm nay → "14:05 · Hôm nay"; hôm trước → "14:05 · 24/09";
 * khác năm → "14:05 · 24/09/2025".
 */
function formatTs(ts: number): string {
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
function convexErrMessage(err: unknown): string {
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

function AssistantThinking() {
  return (
    <div className="mt-5 flex items-start gap-2">
      {/* Avatar robot ở TRÊN, đồng hàng với bong bóng chờ */}
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-6 w-6" />
      </span>
      <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-gold/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
