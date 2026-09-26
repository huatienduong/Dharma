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
  const [image, setImage] = useState<{ base64: string; mime: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    supported: micSupported,
    listening,
    start,
    stop,
    refine: refineUtterance,
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
  // Tiến trình tạo ảnh: null = không tạo, số 0–100 = phần trăm đang chạy.
  const [imageProgress, setImageProgress] = useState<number | null>(null);
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
    const id = window.setTimeout(() => setStalled(true), 30_000);
    return () => window.clearTimeout(id);
  }, [busy]);

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
      const attachedImage = !opts?.fromCall ? image : null;
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

      const base: Msg[] = [...historyRef.current, ...pendingRef.current];
      const userMsg: Msg = {
        role: "user",
        content: question,
        ts: Date.now(),
        // Lưu ảnh đi kèm tin nhắn để hiển thị lại trong hội thoại
        image: attachedImage
          ? { base64: attachedImage.base64, mime: attachedImage.mime }
          : undefined,
      };

      if (!opts?.fromCall) {
        setInput("");
        setImage(null);
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
      const askOnce = () =>
        ask({
          // Chỉ gửi 4 lượt gần nhất đúng với ngữ cảnh backend sử dụng. Cắt bớt
          // ký tự phòng khi lịch sử cũ chứa câu trả lời rất dài để lượt hỏi
          // sau không bị từ chối; tin nhắn hiện tại luôn nằm cuối.
          messages: [...base, { role: "user" as const, content: question }]
            .slice(-4)
            .map((m) => ({
              role: m.role,
              content: m.content.slice(0, 7500),
            })),
          imageBase64: attachedImage?.base64,
          imageMime: attachedImage?.mime,
          ...getDeviceMeta(),
        });
      const askWithRetry = async () => {
        let lastError: unknown = new Error("Không gửi được câu hỏi.");
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const result = await askOnce();
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

        const answer = await askWithRetry();
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
          void speakVI(reply, {
            voice: voiceIdRef.current,
            onDone: () => {
              aiSpeakingRef.current = false;
              lastAiWordAtRef.current = Date.now();
              lastAssistantEventAtRef.current = Date.now();
              if (!callActiveRef.current) return;
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
        const userMsg =
          /\[convex|server error|called by client|request id/i.test(errorMessage)
            ? "Kết nối máy chủ chưa ổn định. Bạn hãy gửi lại câu này sau ít giây."
            : errorMessage;
        if (!opts?.fromCall) {
          toast.error(userMsg || "Không gửi được câu hỏi.");
        } else {
          toast.error(userMsg || "Không kết nối được trợ lý.");
          // Không mở màn "đang nâng cấp" chỉ vì một request AI lỗi: màn che toàn
          // màn hình khiến người dùng tưởng mất kết nối và không gửi tiếp được.
          sendingRef.current = false;
          if (callActiveRef.current) {
            setCallStatus("listening");
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
    [ask, createImage, image],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /* ----- Đàm thoại: xử lý một câu người dùng vừa nói ----- */
  const handleUtterance = useCallback(
    (text: string) => {
      if (busyRef.current || sendingRef.current) {
        window.setTimeout(() => startListeningRef.current(), 600);
        return;
      }
      setInterim("");
      sendingRef.current = true;
      setCallStatus("thinking");
      lastAssistantEventAtRef.current = Date.now();
      void send(text, { fromCall: true });
    },
    [send],
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
    try {
      recRef.current?.abort();
    } catch {
      /* noop */
    }
    const rec = newRecognition();
    if (!rec) {
      micDeniedRef.current = true;
      setCallStatus("muted");
      return;
    }
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;

    let finalBuf = "";
    rec.onstart = () => {
      lastAssistantEventAtRef.current = Date.now();
      if (callActiveRef.current) setCallStatus("listening");
    };
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalBuf += r[0].transcript;
        else setInterim(r[0].transcript);
      }
      const t = finalBuf.trim();
      if (
        t.length >= 2 &&
        !aiSpeakingRef.current &&
        !sendingRef.current &&
        Date.now() - lastAiWordAtRef.current > 350
      ) {
        finalBuf = "";
        recRef.current = null;
        try {
          rec.onend = null;
          rec.stop();
        } catch {
          /* noop */
        }
        // Dừng ghi âm rồi chép lại: văn bản chính xác hơn nhiều so với bản
        // nghe trực tiếp của trình duyệt. Lỗi thì giữ nguyên bản gốc.
        void stopMicRecording().then((clip) =>
          refineUtterance(t, clip).then((better) => handleUtterance(better)),
        );
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        micDeniedRef.current = true;
        setCallStatus("muted");
        toast.error("Cần cấp quyền micro để đàm thoại bằng giọng nói.");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      if (
        callActiveRef.current &&
        !mutedRef.current &&
        !micDeniedRef.current &&
        !aiSpeakingRef.current &&
        !sendingRef.current
      ) {
        window.setTimeout(() => {
          if (callActiveRef.current) startListeningRef.current();
        }, 300);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      // Ghi âm song song: sau khi có câu, chép lại bằng Whisper cho chính xác.
      void startMicRecording();
    } catch {
      /* đã start — bỏ qua */
    }
  }, [handleUtterance]);

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
        setImage({ base64, mime: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

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
                aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
                  listening && "bg-destructive/10 text-destructive",
                )}
              >
                <Mic className="h-[18px] w-[18px]" />
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
