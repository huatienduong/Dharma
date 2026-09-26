import { CallOverlay } from "@/components/CallOverlay";
import { VideoSearchScreen } from "@/components/VideoSearchScreen";
import {
  ChatComposer,
  MAX_FILES_PER_MESSAGE,
  type AttachedFile,
} from "@/components/ChatComposer";
import { ChatThread, type FailedReply } from "@/components/ChatThread";
import { HomeGreeting } from "@/components/HomeGreeting";
import { api } from "@/convex/_generated/api";
import { useCallSession } from "@/hooks/useCallSession";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { useVietnameseTTS } from "@/hooks/use-vietnamese-tts";
import { loadVoicePref, VOICE_PREF_EVENT } from "@/lib/aiVoices";
import { MAX_IMAGES_PER_MESSAGE } from "@/lib/appFeatures";
import { readFileAttachments, readImageAttachment } from "@/lib/attachments";
import {
  clearLocalChat,
  convexErrMessage,
  isClearHistoryCommand,
  isStartCallCommand,
  loadLocalChatSecure,
  parseChatFeedback,
  isBareFeedbackCommand,
  BARE_FEEDBACK_GUIDE,
  plainText,
  saveLocalChatSecure,
  speakableSummary,
  type AskResult,
  type Msg,
} from "@/lib/chatHelpers";
import { callConvexAction } from "@/lib/convexAction";
import {
  aiInvitesVideo,
  isVideoRequest,
  type VideoInfo,
} from "@/lib/videoIntent";
import { searchVideoInBrowser } from "@/lib/videoSearchClient";
import { loadYouTubeKey } from "@/lib/youtubeKey";
import { getDeviceMeta } from "@/lib/deviceSecurity";
import { wantsImage } from "@/lib/imageIntent";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";
import { useAction, useMutation } from "convex/react";
import { ArrowLeft, Phone, Settings, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

/**
 * Số lượt hội thoại gửi kèm cho AI. Phải khớp `HISTORY_LIMIT` ở
 * `convex/aiChat.ts` (16) — đủ để trợ lý nhớ xuyên suốt cuộc trò chuyện mà
 * vẫn nằm trong hạn mức token của gói.
 */
const CONTEXT_MESSAGES = 16;

export default function Assistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/home";
  const ask = useAction(api.aiChat.ask);
  const createImage = useAction(api.aiChat.createImage);
  // Góp ý / báo lỗi gửi thẳng từ khung chat: lưu phiếu rồi gửi thư hỗ trợ.
  // Dùng lại đúng hạ tầng của mục Góp ý trong Cài đặt, không thêm dịch vụ mới.
  const submitFeedback = useMutation(api.library.submitFeedback);
  const sendFeedbackEmail = useAction(api.library.emailFeedback);

  const [history, setHistory] = useState<Msg[]>([]);
  const historyRef = useRef<Msg[]>([]);
  const pendingRef = useRef<Msg[]>([]);

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
  // FIX "không phản hồi": đếm thời gian chờ AI — quá lâu hiển thị lỗi
  // thay vì đứng ở "đang suy niệm" vĩnh viễn (provider treo không trả).
  const [stalled, setStalled] = useState(false);
  const [image, setImageState] = useState<{ base64: string; mime: string } | null>(null);
  /**
   * Ảnh bổ sung (ảnh thứ 2 trở đi trong cùng một lượt). `image` giữ ảnh đầu
   * để phần xem trước cạnh ô nhập không phải sửa; các ảnh còn lại nằm ở đây.
   */
  const [extraImages, setExtraImages] = useState<{ base64: string; mime: string }[]>([]);
  const extraImagesRef = useRef<{ base64: string; mime: string }[]>([]);
  /** Tệp người dùng đính kèm — nhánh đọc tệp sẽ mở và giải thích dữ liệu. */
  const [files, setFiles] = useState<AttachedFile[]>([]);
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
    prefetch: prefetchSpeechVI,
  } = useVietnameseTTS();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Khi đang hiện chữ từng phần, không tự cuộn toàn bộ vùng chat xuống đáy.
  const suppressNextAutoScrollRef = useRef(false);
  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  /**
   * Lỗi trả lời hiện ngay trong hội thoại kèm nút "Gửi lại" — người dùng
   * không phải gõ lại câu hỏi chỉ vì một lỗi mạng tạm thời.
   */
  const [failedReply, setFailedReply] = useState<FailedReply | null>(null);
  // Tiến trình tạo ảnh: null = không tạo, số 0–100 = phần trăm đang chạy.
  const [imageProgress, setImageProgress] = useState<number | null>(null);
  /**
   * Đang phân tích ảnh/tệp người dùng gửi. Lượt này có thể mất vài giây; nói
   * rõ đang xem thay vì để người dùng tưởng app bị treo rồi bấm gửi lại.
   */
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const imageProgressRef = useRef<number | null>(null);
  /**
   * Mốc thời gian của câu trả lời đang được đọc to (nút loa trong khung chat).
   * null = đang rảnh. Giữ cả state lẫn ref: state để tô đậm nút, ref để nút
   * bấm lại biết chính xác câu nào đang đọc mà không cần đưa vào deps.
   */
  const [readingTs, setReadingTs] = useState<number | null>(null);
  const readingTsRef = useRef<number | null>(null);
  /**
   * Mốc thời gian của câu ĐANG CHỜ máy chủ tổng hợp giọng đọc (chưa có tiếng).
   * Tách khỏi readingTs vì hai trạng thái này hiển thị khác nhau: đang chờ
   * thì vòng quay, đang đọc thì nút vuông dừng.
   */
  const [loadingTs, setLoadingTs] = useState<number | null>(null);

  /* ---- Màn tìm video YouTube (mở từ nút camera cạnh nút đàm thoại) ---- */
  const [videoScreen, setVideoScreen] = useState(false);

  const loadingTsRef = useRef<number | null>(null);

  const markReading = useCallback((ts: number | null) => {
    readingTsRef.current = ts;
    setReadingTs(ts);
  }, []);
  const markLoading = useCallback((ts: number | null) => {
    loadingTsRef.current = ts;
    setLoadingTs(ts);
  }, []);
  // Nhịp tăng phần trăm giả lập cho tới khi máy chủ trả ảnh về.
  const imageTickRef = useRef<number | null>(null);

  /* ----- Giọng đọc người dùng chọn (lưu cục bộ, dùng cho chat + đàm thoại) ----- */
  const voiceIdRef = useRef<string>(loadVoicePref());

  // Người dùng có thể đổi giọng ở trang Cài đặt rồi quay lại mà trang này
  // KHÔNG remount (điều hướng giữ nguyên) → ref sẽ giữ giọng cũ và đọc sai
  // so với lựa chọn mới. Nghe sự kiện đổi giọng để cập nhật tại chỗ.
  useEffect(() => {
    const sync = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) voiceIdRef.current = next;
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ds-assistant-voice" && e.newValue) {
        voiceIdRef.current = e.newValue;
      }
    };
    window.addEventListener(VOICE_PREF_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(VOICE_PREF_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* ================= TRẠNG THÁI DÙNG CHUNG ============== */
  const busyRef = useRef(false);
  // Hàng đợi câu hỏi — khi trợ lý đang trả lời, câu hỏi gửi tiếp KHÔNG bị
  // bỏ im lặng mà xếp hàng; trả lời xong tự gửi tiếp.
  const queueRef = useRef<string[]>([]);
  // Ghi nhớ tin đã thu hồi để nếu AI đang trả lời, phản hồi về sau không thêm
  // lại tin nhắn/ảnh vừa bị người dùng gỡ.
  const recalledMessagesRef = useRef(new WeakSet<Msg>());
  const recalledImagesRef = useRef(new WeakSet<Msg>());
  const sendRef = useRef<
    (text: string, opts?: { fromCall?: boolean }) => Promise<void>
  >(async () => {});
  /** Gọi xoá hội thoại từ nơi định nghĩa trước trong file. */
  const clearAllRef = useRef<(() => Promise<void> | void) | null>(null);

  // Nối hàm đọc-sau-khai-báo: hook đàm thoại cần đọc to, hàm đọc to lại do
  // hook trả về — dùng ref để không đụng tới mảng deps của useCallback.
  const speakThenListenRef = useRef<(text: string) => void>(() => {});


  /**
   * GẮN DANH SÁCH VIDEO VÀO CÂU TRẢ LỜI — người dùng chỉ cần nhắn "tôi
   * muốn xem video về …", AI trả lời xong ứng dụng tự tìm video YouTube và
   * gắn tối đa 3 video đề xuất vào đúng câu đó trong khung chat; bấm video nào
   * thì phát ngay tại chỗ. Chạy nền, không chặn câu trả lời.
   *
   * Hai đường tìm, thử theo thứ tự: máy chủ Convex (YouTube Data API, có
   * khoá → tên kênh + thời lượng chuẩn), rồi mới tới tìm trực tiếp trong
   * trình duyệt (Invidious) để tính năng vẫn chạy khi máy chủ chưa sẵn sàng.
   */
  const attachVideo = useCallback(
    (query: string, replyTs: number, replyText: string) => {
      // Hai đường kích hoạt: người dùng hỏi/dán link về video, HOẶC chính
      // Trợ lý đã mời xem video trong câu trả lời — thì phải tìm và gắn
      // video, nếu không lời hứa trong câu trả lời sẽ hụt.
      if (!isVideoRequest(query) && !aiInvitesVideo(replyText)) return;
      let warned = false;
      void (async () => {
        const apply = (list: VideoInfo[]) => {
          const videos = list.slice(0, 3);
          if (!videos.length) return false;
          // Sửa đúng câu trả lời đang chờ; nếu người dùng đã xoá hội thoại
          // thì `ts` không còn trong lịch sử → không làm gì cả.
          const nextHistory = historyRef.current.map((m) =>
            m.ts === replyTs
              ? { ...m, videos, videoQuery: query.trim() }
              : m,
          );
          if (nextHistory === historyRef.current) return false;
          historyRef.current = nextHistory;
          setHistory(nextHistory);
          void saveLocalChatSecure(nextHistory);
          return true;
        };

        // 1. Máy chủ Convex (có khoá API YouTube).
        try {
          const res = await callConvexAction<{
            ok: boolean;
            videos: VideoInfo[];
            message?: string;
          }>("videoSearch:find", { query }, 20_000);
          if (res?.ok && apply(res.videos)) return;
          if (res?.message && !warned) {
            warned = true;
            toast.info(res.message);
          }
        } catch (err) {
          console.warn("[video] máy chủ chưa sẵn sàng, thử tìm trực tiếp:", err);
        }

        // 2. Dự phòng: tìm ngay trong trình duyệt bằng khoá người dùng đã
        // dán ở Cài đặt (lưu mã hoá trên thiết bị).
        const key = await loadYouTubeKey().catch(() => "");
        const local = await searchVideoInBrowser(query, key).catch(() => []);
        if (apply(local)) return;
        if (!warned) {
          toast.info(
            "Chưa tìm được video. Bạn dán link YouTube cụ thể là Trợ lý mở xem ngay trong khung chat nhé.",
          );
        }
      })();
    },
    [],
  );

  const call = useCallSession({
    micSupported,
    transcribeClip,
    speak: speakVI,
    stopSpeaking,
    primeSpeechAudio,
    sendRef,
    onSmallTalk: (userText, reply) => {
      const userMsg: Msg = { role: "user", content: userText, ts: Date.now() };
      const replyMsg: Msg = { role: "assistant", content: reply, ts: Date.now() };
      const nextHistory = [...historyRef.current, userMsg, replyMsg];
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      void saveLocalChatSecure(nextHistory);
      speakThenListenRef.current(reply);
    },
    onClearAll: () => {
      void clearAllRef.current?.();
    },
    busyRef,
    setBusy,
    getVoiceId: () => voiceIdRef.current,
  });
  const {
    callOpen,
    callStatus,
    interim: callInterim,
    openCall,
    endCall,
    toggleMute,
    interruptSpeaking,
    speakThenListen,
    callActiveRef,
    sendingRef,
    lastAssistantEventAtRef,
    callRetryRef,
    callRetryPendingRef,
    setCallStatus,
  } = call;

  useEffect(() => {
    speakThenListenRef.current = speakThenListen;
  }, [speakThenListen]);


  /* ----- Bàn phím ảo: ghim thanh tiêu đề, nâng khung nhập theo bàn phím ----- */
  const vv = useVisualViewport();

  /* ----- Gộp lịch sử cục bộ + tin nhắn phiên ----- */
  const messages: Msg[] = [...history, ...pending];
  const isEmpty = messages.length === 0;

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

  // Đồng hồ phòng treo: nếu AI không trả lời quá lâu → báo lỗi ra UI
  useEffect(() => {
    if (!busy) {
      setStalled(false);
      return;
    }
    // Lượt phân tích ảnh/tệp chậm hơn lượt chat thường (model phải "nhìn" ảnh
    // rồi soạn câu trả lời), nên cho thêm thời gian thay vì báo treo sớm rồi
    // khiến người dùng tưởng ảnh không được gửi đi.
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

  /* ----- Khi đang đàm thoại: chỉ dùng giọng nói, không gõ chữ -----
   *
   * Màn đàm thoại phủ kín màn hình nhưng BÀN PHÍM của trình duyệt vẫn mở và
   * con trỏ vẫn nằm trong ô nhập phía sau — người dùng gõ được rồi gửi tin
   * nhắn lệch ra ngoài cuộc gọi. Đóng bàn phím và xoá phần chữ dở khi vào
   * cuộc gọi. ----- */
  useEffect(() => {
    if (!callOpen) return;
    setInput("");
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }, [callOpen]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* ----- Gửi câu hỏi (chat + đàm thoại dùng chung) ----- */
  const send = useCallback(
    async (text: string, opts?: { fromCall?: boolean }) => {
      const q = text.trim();
      // Mốc bắt đầu lượt gửi trong đàm thoại (giám sát dùng để cứu vòng lặp
      // khi máy chủ treo).
      if (opts?.fromCall) call.sendSinceRef.current = Date.now();
      // Góp ý / báo lỗi gõ thẳng trong khung chat: chuyển thẳng tới bộ phận
      // kỹ thuật, KHÔNG hỏi AI và không gửi kèm bất kỳ thông tin nào của
      // người dùng (không có ô email, không lưu email).
      const feedback = parseChatFeedback(q);
      if (feedback) {
        setInput("");
        await sendChatFeedback(feedback, q);
        return;
      }
      // Người dùng chỉ gõ LỆNH góp ý mà chưa viết nội dung → nhắc lại
      // đúng mẫu “lệnh: nội dung cụ thể”, tuyệt đối không gửi thư rỗng.
      if (isBareFeedbackCommand(q)) {
        setInput("");
        const userMsg: Msg = { role: "user", content: q, ts: Date.now() };
        const replyMsg: Msg = {
          role: "assistant",
          content: BARE_FEEDBACK_GUIDE,
          ts: Date.now(),
        };
        const nextHistory = [...historyRef.current, userMsg, replyMsg];
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        void saveLocalChatSecure(nextHistory);
        return;
      }
      // Lệnh xóa hội thoại: xóa sạch ngay và kết thúc cuộc trò chuyện.
      if (isClearHistoryCommand(q)) {
        setInput("");
        setImage(null);
        setFiles([]);
        setFailedReply(null);
        void clearAllRef.current?.();
        if (callActiveRef.current) endCall();
        return;
      }
      // Yêu cầu đàm thoại ngay trong khung chat → mở thẳng màn đàm thoại.
      if (isStartCallCommand(q)) {
        setInput("");
        if (callActiveRef.current) {
          // Đang trong cuộc gọi: nhả cờ "đang gửi" để micro không bị kẹt
          // đóng vĩnh viễn sau khi gặp lệnh này.
          sendingRef.current = false;
          return;
        }
        openCall();
        return;
      }
      // Gom ảnh + tệp đính kèm theo hạn mức gói. Vượt hạn mức vẫn KHÔNG chặn
      // người dùng: cắt bớt rồi vẫn gửi đi để AI trả lời phần còn lại.
      const allImages: { base64: string; mime: string }[] = !opts?.fromCall
        ? [image, ...extraImages].filter((i): i is { base64: string; mime: string } => !!i)
        : [];
      const overQuota = allImages.length - MAX_IMAGES_PER_MESSAGE;
      const attachedImages = allImages.slice(0, MAX_IMAGES_PER_MESSAGE);
      const attachedImage = attachedImages[0] ?? null;
      const attachedFiles = opts?.fromCall
        ? []
        : files.slice(0, MAX_FILES_PER_MESSAGE);
      if (!q && !attachedImage && attachedFiles.length === 0) return;
      const question =
        q ||
        (attachedImage
          ? "Hãy mô tả và giải thích hình ảnh này trong phạm vi Phật học."
          : "Hãy đọc dữ liệu trong tệp này và giải thích giúp mình.");
      // Đang bận: xếp hàng chờ (chat) hoặc nhắc nhở nhẹ (đàm thoại) thay vì
      // nuốt im lặng câu hỏi của người dùng.
      if (busyRef.current) {
        if (attachedImage || attachedFiles.length > 0) {
          toast.error("Hãy đợi câu trả lời hiện tại xong rồi gửi hình ảnh hoặc tệp.");
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
      const attachNote = [
        attachedImages.length > 1 ? `(kèm ${attachedImages.length} ảnh)` : "",
        attachedFiles.length > 0
          ? `(kèm ${attachedFiles.length} tệp: ${attachedFiles.map((f) => f.name).join(", ")})`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      const userMsg: Msg = {
        role: "user",
        content: attachNote ? `${question}\n\n${attachNote}` : question,
        ts: Date.now(),
        // Lưu ảnh đi kèm tin nhắn để hiển thị lại trong hội thoại
        image: attachedImage
          ? { base64: attachedImage.base64, mime: attachedImage.mime }
          : undefined,
      };

      if (!opts?.fromCall) {
        setInput("");
        setImage(null);
        setFiles([]);
        if (overQuota > 0) {
          toast(
            `Gói cho phép ${MAX_IMAGES_PER_MESSAGE} ảnh mỗi lượt — ${overQuota} ảnh chưa được gửi, Trợ lý vẫn trả lời dựa trên ${MAX_IMAGES_PER_MESSAGE} ảnh còn lại.`,
            { duration: 4000 },
          );
        }
      }
      // Luôn thêm vào phiên (kể cả call) để giữ ngữ cảnh và không mất lịch sử.
      // Đánh dấu busy đồng bộ ngay để chặn hai request chồng nhau trước khi
      // useEffect kịp cập nhật.
      pendingRef.current = [...pendingRef.current, userMsg];
      setPending(pendingRef.current);
      busyRef.current = true;
      setBusy(true);

      // Gửi kèm lượt gần nhất đúng với ngữ cảnh backend sử dụng. Cắt bớt ký
      // tự phòng khi lịch sử cũ chứa câu trả lời rất dài.
      // Gửi lên AI ĐÚNG NỘI DUNG HỘI THOẠI — không chèn bản kê tính năng,
      // không chèn chỉ dẫn nội bộ vào câu hỏi. Mọi hướng dẫn cho AI nằm
      // trong system prompt của máy chủ (featuresPrompt), để câu trả lời về
      // Phật học luôn sạch, không bị lẫn chỉ dẫn kỹ thuật.
      const payloadMessages = [
        ...base,
        { role: "user" as const, content: question },
      ]
        .slice(-CONTEXT_MESSAGES)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 7500),
        }));

      const askOnce = async (): Promise<AskResult> => {
        /* ---------- TỆP: nhánh đọc dữ liệu trong tệp ---------- */
        if (attachedFiles.length > 0) {
          setAnalyzingImage(true);
          try {
            const res = await callConvexAction<AskResult>(
              "fileChat:analyzeFiles",
              {
                messages: payloadMessages,
                files: attachedFiles.map((f) => ({
                  name: f.name,
                  mime: f.mime,
                  base64: f.base64,
                })),
                ...getDeviceMeta(),
              },
              50_000,
            );
            // Lỗi nghiệp vụ (hết hạn mức, định dạng không hỗ trợ…) phải hiện
            // ra cho người dùng, tuyệt đối không lặng lẽ rơi xuống nhánh chat
            // vốn không đọc tệp.
            if (res.ok || res.message) return res;
          } catch {
            return {
              ok: false,
              code: "ai_unavailable",
              message: "Chưa gửi được tệp lên máy chủ. Bấm Gửi lại sau ít giây.",
            };
          } finally {
            setAnalyzingImage(false);
          }
        }
        /* ---------- ẢNH: nhánh thị giác (Gemini đọc ảnh) ---------- */
        if (attachedImages.length > 0) {
          setAnalyzingImage(true);
          try {
            // Gửi nhiều ảnh theo cấu trúc mới; nếu máy chủ chưa có bản mới thì
            // thử lại bằng cấu trúc một ảnh cũ.
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
            // Hết hạn mức ở gói miễn phí thường chỉ kéo dài vài giây, nên thử
            // lại một vòng sau 4 giây trước khi báo lỗi cho người dùng.
            let quotaBlocked = false;
            for (let round = 0; round < 2 && !quotaBlocked; round++) {
              if (round > 0) {
                await new Promise((r) => window.setTimeout(r, 4000));
              }
              for (const shape of shapes) {
                try {
                  const vision = await callConvexAction<AskResult>(
                    "visionChat:analyzeImage",
                    { ...shape, ...getDeviceMeta() },
                  );
                  if (vision.ok || vision.code === "rate_limited") return vision;
                  if (vision.message) {
                    if (vision.code === "ai_unavailable") {
                      quotaBlocked = true;
                      break;
                    }
                    return vision;
                  }
                } catch {
                  /* thử cấu trúc tiếp theo */
                }
              }
            }
            if (quotaBlocked) {
              return {
                ok: false,
                code: "ai_unavailable",
                message:
                  "Máy chủ đang bận (hết hạn mức phân tích ảnh của gói). Bấm Gửi lại sau 1–2 phút, hoặc mô tả bằng lời.",
              };
            }
            return {
              ok: false,
              code: "bad_image",
              message: "Không gửi được hình ảnh lên máy chủ. Hãy thử lại với ảnh khác.",
            };
          } finally {
            setAnalyzingImage(false);
          }
        }
        /* ---------- CHỮ ---------- */
        return ask({
          messages: payloadMessages,
          ...getDeviceMeta(),
        });
      };

      // Nhánh dự phòng: gọi trước, vì khi máy chủ chính đang lỗi thì chờ nó
      // trả về cũng chẳng có kết quả — cứ gọi song song cho chắc.
      const askResilient = async (): Promise<AskResult> => {
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
        // Có ảnh/tệp đính kèm: nhánh chat thường KHÔNG đọc được, nên gọi
        // nhánh đọc đính kèm trước thay vì hỏi nhánh chữ rồi nhận câu trả
        // lời vô nghĩa.
        if (attachedImages.length > 0 || attachedFiles.length > 0) {
          return askOnce();
        }
        try {
          const fb = await fallback();
          if (fb?.ok) return fb;
          // Nhánh dự phòng đã trả lời dứt khoát thì nhánh chính không thêm
          // được gì: nó dùng CHUNG hạn mức và còn gửi prompt dài hơn nhiều.
          if (fb) return fb;
        } catch {
          /* bỏ qua, thử nhánh chính */
        }
        try {
          const primary = await askOnce();
          if (primary.ok || primary.code !== "ai_unavailable") return primary;
        } catch (err) {
          const fb = await fallback();
          if (fb?.ok) return fb;
          throw err;
        }
        return {
          ok: false,
          code: "ai_unavailable",
          message: "Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút.",
        };
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
        const wantsArt =
          !attachedImage && attachedFiles.length === 0 && wantsImage(question);
        let generatedImageId: string | undefined;
        if (wantsArt) {
          startImageProgress();
          try {
            const res = await createImage({
              prompt: question,
              ...getDeviceMeta(),
            });
            if (res?.ok && res.storageId) {
              generatedImageId = res.storageId;
              finishImageProgress();
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
          // Người dùng hỏi về video (hoặc dán link) → sau khi trả lời xong,
          // tự tìm video và gắn thẻ xem vào đúng câu này.
          attachVideo(userMsg.content, replyMsg.ts, replyMsg.content);
          // Tải sẵn âm thanh câu trả lời này (chạy nền, không phát gì) để
          // khi người dùng bấm nút loa là có tiếng ngay, không phải chờ
          // máy chủ tổng hợp TTS.
          prefetchSpeechVI(plainText(replyMsg.content), {
            voice: voiceIdRef.current,
          });
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
          sendingRef.current = false;
          // Trong cuộc gọi: đọc to bằng giọng người dùng đã chọn, đọc xong tự
          // mở lại mic → đàm thoại hai chiều liền mạch.
          //
          // Mọi đường thoát sớm ở đây đều PHẢI trả lại mic. Trước đây nhánh
          // `!finishReply()` (tin vừa bị người dùng gỡ) return thẳng → micro
          // đóng luôn, người dùng nói tiếp không ai nghe, đúng triệu chứng
          // “không trả lời bằng giọng nói”.
          if (!finishReply()) {
            if (callActiveRef.current) {
              setCallStatus("listening");
              lastAssistantEventAtRef.current = Date.now();
              window.setTimeout(
                () => call.startListeningRef.current(),
                500,
              );
            }
            return;
          }
          if (!callActiveRef.current) return;
          lastAssistantEventAtRef.current = Date.now();
          setCallStatus("speaking");
          // Đọc to chỉ phần đầu: câu trả lời dài làm người dùng phải chờ
          // hàng phút mới nói được. Toàn văn vẫn hiện trong khung chat.
          speakThenListen(speakableSummary(reply).spoken || reply);
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
              callRetryPendingRef.current = 1;
              window.setTimeout(() => {
                if (callActiveRef.current) {
                  void sendRef.current(question, { fromCall: true });
                }
              }, 1200);
              return;
            }
            callRetryRef.current = 0;
            window.setTimeout(() => call.startListeningRef.current(), 800);
          }
        }
      } finally {
        finishImageProgress();
        busyRef.current = false;
        setBusy(false);
        // Sổ trạng thái: nếu một đường thoát nào đó (tin nhắn bị thu hồi,
        // người dùng ngắt cuộc gọi giữa chừng) quên mở lại cờ này thì
        // micro chết sau đúng một câu.
        if (!callRetryPendingRef.current) sendingRef.current = false;
        callRetryPendingRef.current = 0;
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
    [ask, call, createImage, extraImages, files, image, prefetchSpeechVI],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /* ----- Đọc lại một câu trả lời cũ (nút loa cạnh câu trả lời) -----
   *
   * CHỈ phát khi người dùng bấm: bấm lần đầu đọc, bấm lại câu đang đọc thì
   * dừng. Mỗi lần bấm câu khác sẽ cắt câu đang đọc trước, không để hai câu
   * chồng tiếng. Dùng đúng giọng người dùng đã chọn ở Cài đặt. */
  const speakMessage = useCallback(
    (m: Msg) => {
      // Bấm lại câu đang chờ → huỷ; lệnh tải đang chạy bị bỏ qua.
      if (loadingTsRef.current === m.ts) {
        stopSpeaking();
        markLoading(null);
        return;
      }
      if (readingTsRef.current === m.ts) {
        stopSpeaking();
        markReading(null);
        return;
      }
      const text = plainText(m.content);
      if (!text) return;
      // Câu đang đọc (nếu có) bị cắt trước rồi mới đọc câu mới.
      stopSpeaking();
      markLoading(m.ts);
      void speakVI(text, {
        voice: voiceIdRef.current,
        // Đã có tiếng: chuyển từ đang chờ sang đang đọc.
        onStart: () => {
          if (loadingTsRef.current !== m.ts) return;
          markLoading(null);
          markReading(m.ts);
        },
        // onDone của lớp đọc to luôn chạy đúng một lần → nút loa không bị
        // kẹt ở trạng thái "đang đọc" khi âm thanh đã tắt.
        onDone: () => {
          if (loadingTsRef.current === m.ts) markLoading(null);
          if (readingTsRef.current === m.ts) markReading(null);
        },
      });
    },
    [markLoading, markReading, speakVI, stopSpeaking],
  );

  /* ----- Góp ý / báo lỗi gửi thẳng từ khung chat -----
   *
   * Luồng: hiện tin người dùng → lưu phiếu (sinh mã) → gửi thư hỗ trợ →
   * Trợ lý đáp lại. KHÔNG thu thập, không lưu và không hiện email của
   * người dùng ở bất kỳ đâu trong cuộc hội thoại.
   */
  const sendChatFeedback = useCallback(
    async (
      feedback: { type: "bug" | "idea"; message: string },
      rawText: string,
    ) => {
      const userMsg: Msg = { role: "user", content: rawText, ts: Date.now() };
      pendingRef.current = [...pendingRef.current, userMsg];
      setPending(pendingRef.current);
      busyRef.current = true;
      setBusy(true);

      const answer = async (text: string) => {
        const replyMsg: Msg = {
          role: "assistant",
          content: text,
          ts: Date.now(),
        };
        pendingRef.current = pendingRef.current.filter(
          (m) => m !== userMsg,
        );
        setPending(pendingRef.current);
        const nextHistory = [...historyRef.current, userMsg, replyMsg];
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        void saveLocalChatSecure(nextHistory);
      };

      try {
        // Lưu phiếu trước để có mã định danh, kể cả khi gửi thư thất bại.
        const ticket = await submitFeedback({
          type: feedback.type,
          message: feedback.message,
          appVersion: APP_VERSION,
        });
        // `email` cố tình bỏ trống: thư chỉ nhận nội dung góp ý, không kèm
        // địa chỉ nào của người dùng.
        await sendFeedbackEmail({
          type: feedback.type,
          message: feedback.message,
          appVersion: APP_VERSION,
          ticketCode: ticket.ticketCode,
        });
        await answer(
          "🙏 Đã tiếp nhận góp ý của bạn. Bộ phận kỹ thuật sẽ sớm xem xét, xử lý và khắc phục. Cảm ơn bạn đã giúp Trợ lý Phật học hoàn thiện hơn!",
        );
      } catch {
        await answer(
          "🙏 Trợ lý đã nhận được góp ý của bạn, nhưng lưu phiếu gặp sự cố. Bạn thử gửi lại sau ít giây, hoặc ghi lại ở mục Góp ý trong Cài đặt để chắc chắn bộ phận kỹ thuật nhận được.",
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [sendFeedbackEmail, submitFeedback],
  );

  /* ----- Gửi lại câu vừa bị lỗi (nút "Gửi lại" trong hội thoại) ----- */
  const retryFailed = useCallback(() => {
    const failed = failedReply;
    if (!failed || busyRef.current) return;
    setFailedReply(null);
    // Gỡ bong bóng lỗi cũ khỏi hàng chờ để không hiện hai lần cùng một câu.
    pendingRef.current = pendingRef.current.filter((m) => m !== failed.msg);
    setPending(pendingRef.current);
    // Đang trong đàm thoại thì phải đọc to câu trả lời, nếu không người dùng
    // thấy câu trả lời hiện trong khung mà không nghe thấy gì.
    void sendRef.current(
      failed.question,
      callActiveRef.current ? { fromCall: true } : undefined,
    );
  }, [callActiveRef, failedReply]);

  const clearAll = useCallback(async () => {
    queueRef.current = [];
    pendingRef.current = [];
    historyRef.current = [];
    setPending([]);
    setHistory([]);
    setFailedReply(null);
    setFiles([]);
    clearLocalChat();
    toast.success("Đã xóa hội thoại.");
  }, []);

  useEffect(() => {
    clearAllRef.current = clearAll;
  }, [clearAll]);

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

  const onVoiceChat = useCallback((text: string) => {
    // Không gửi câu rỗng khi nghe ra toáng tiếng ồn — chỉ báo lại cho
    // người dùng biết để họ nói lại.
    if (!text.trim()) {
      toast("Mình chưa nghe rõ. Bạn nói lại giúp nhé.");
      return;
    }
    void sendRef.current(text);
  }, []);

  /* ----- Chọn ảnh ----- */
  const onPickImage = useCallback(
    async (file: File) => {
      const res = await readImageAttachment(file);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const picked = res.image;
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
    },
    [image],
  );

  /* ----- Chọn tệp ----- */
  const onPickFiles = useCallback(async (list: FileList | null) => {
    const { files: read, skipped } = await readFileAttachments(list);
    if (skipped.length > 0) {
      toast.error(
        `Không đọc được: ${skipped.join(", ")}. Hãy gửi dạng CSV, văn bản, JSON hoặc PDF.`,
        { duration: 5000 },
      );
    }
    if (read.length === 0) return;
    setFiles((prev) => {
      const next = [...prev, ...read];
      if (next.length > MAX_FILES_PER_MESSAGE) {
        toast(
          `Mỗi lượt gửi tối đa ${MAX_FILES_PER_MESSAGE} tệp — ${next.length - MAX_FILES_PER_MESSAGE} tệp chưa được gửi.`,
          { duration: 4000 },
        );
      }
      return next.slice(0, MAX_FILES_PER_MESSAGE);
    });
  }, []);

  const onRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ================================================================ */
  /* FULL MÀN HÌNH — cả viewport là Trợ lý Phật học Dharma AI            */
  /* ================================================================ */
  return (
    <div
      className="fb-bg flex h-[100dvh] flex-col overflow-hidden"
      // Khi bàn phím ảo bật, vùng nhìn thật ngắn lại — đặt chiều cao theo vùng
      // nhìn để khung hội thoại vừa khít phần còn thấy, không bị tràn xuống
      // dưới bàn phím.
      style={vv.height ? { height: `${vv.height}px` } : undefined}
    >
      {/* ---------- Header: gọi bên trái, tên ở giữa, điều khiển bên phải ---------- */}
      <header
        // Bàn phím bật làm trình duyệt đẩy layout viewport; dịch thanh tiêu
        // đề xuống đúng mép trên của vùng nhìn thật để nó CỐ ĐỊNH, không bị
        // đẩy lên hay bị che.
        style={vv.offsetTop ? { transform: `translateY(${vv.offsetTop}px)` } : undefined}
        className="fixed inset-x-0 top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-border/60 bg-background/95 px-2 backdrop-blur-md sm:px-4"
      >
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
          <button
            type="button"
            onClick={() => setVideoScreen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Tìm và xem video"
            title="Tìm và xem video"
          >
            <Video className="h-5 w-5 shrink-0" />
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
        {/* Hội thoại trống: chỉ logo robot + lời chào. Nội dung nâng lên
            theo bàn phím để không bị khung nhập che. */}
        {isEmpty && <HomeGreeting keyboardInset={vv.keyboardInset} />}
        <ChatThread
          messages={messages}
          isEmpty={isEmpty}
          streamingReply={streamingReply}
          failedReply={failedReply}
          onRetry={retryFailed}
          onDismissFailed={() => setFailedReply(null)}
          imageProgress={imageProgress}
          busy={busy}
          stalled={stalled}
          onRecallMessage={recallMessage}
          onRecallImage={recallImage}
          onSpeakMessage={speakMessage}
          readingTs={readingTs}
          loadingTs={loadingTs}
        />
      </div>

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSubmit={() => void send(input)}
        busy={busy}
        image={image}
        extraImageCount={extraImages.length}
        onPickImage={(f) => void onPickImage(f)}
        onClearImage={() => setImage(null)}
        files={files}
        onPickFiles={(l) => void onPickFiles(l)}
        onRemoveFile={onRemoveFile}
        micSupported={micSupported}
        listening={listening}
        micRefining={micRefining}
        micInterim={micInterim}
        onMicToggle={() => (listening ? stop() : start(onVoiceChat))}
        onClearAll={() => void clearAll()}
        liftUp={vv.keyboardInset}
      />

      {videoScreen && <VideoSearchScreen onClose={() => setVideoScreen(false)} />}

      {callOpen && (
        <CallOverlay
          callStatus={callStatus}
          interim={callInterim}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onInterrupt={interruptSpeaking}
        />
      )}
    </div>
  );
}
