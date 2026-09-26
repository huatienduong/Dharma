/**
 * CHẾ ĐỘ ĐÀM THOÁI — máy trạng thái rảnh tay (kiểu Gemini Live).
 *
 * Nói như gọi điện: AI nghe liên tục, tự gửi khi bạn ngừng câu, tự trả lời
 * bằng giọng nói rồi lại nghe tiếp — KHÔNG cần bấm mic.
 *
 * VÌ SAO TÁCH RA:
 *   Toàn bộ phần này gần 500 dòng và nằm giữa file trang, khiến file phình
 *   to và khó sửa. Tách ra thành hook riêng, mọi quy tắc ổn định được giữ
 *   nguyên vẹn.
 *
 * BA NGUYÊN TẮC ĐÃ ÁP DỤNG (vì sao cuộc gọi không bao giờ treo):
 *   1. Mọi promise (ghi âm, chép lại, đọc to) đều có chốt chặn thời gian.
 *   2. Trạng thái "đang nói" / "đang gửi" / "micro hỏng" đều có lớp giám sát
 *      cứu vãn nếu bị kẹt.
 *   3. Chỉ mở lại micro sau khi hết tiếng vọng của giọng trợ lý, và chặn câu
 *      nghe lại chính giọng loa để tránh hội thoại lặp.
 */

import {
  isClearHistoryCommand,
  looksLikeEcho,
  newRecognition,
  smallTalkReply,
  type RecLike,
} from "@/lib/chatHelpers";
import {
  startMicRecording,
  stopMicRecording,
  type MicClip,
} from "@/lib/micRecorder";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type CallStatus = "listening" | "thinking" | "speaking" | "muted";

export type CallDeps = {
  /** Trình duyệt có hỗ trợ micro hay không. */
  micSupported: boolean;
  /** Chép lại clip đã ghi (Whisper) — luôn trả về chuỗi dùng được. */
  transcribeClip: (clip: MicClip | null, browserText: string) => Promise<string>;
  /** Đọc to (server TTS trước, rồi tới giọng trình duyệt). */
  speak: (
    text: string,
    opts?: { voice?: string | null; onDone?: () => void },
  ) => Promise<void> | void;
  /** Dừng mọi âm thanh đang phát. */
  stopSpeaking: () => void;
  /** Mở khóa phát âm trong cú bấm đầu tiên của người dùng. */
  primeSpeechAudio: () => void;
  /** Gửi câu hỏi; luôn trỏ tới bản `send` mới nhất của trang. */
  sendRef: { current: (text: string, opts?: { fromCall?: boolean }) => Promise<void> };
  /** Lời chào/cảm ơn: trang ghi vào lịch sử rồi đọc to. */
  onSmallTalk: (userText: string, reply: string) => void;
  /** Lệnh "xoá hội thoại" trong đàm thoại. */
  onClearAll: () => void;
  /** Cờ đang bận của trang (dùng chung khi mở cuộc gọi). */
  busyRef: { current: boolean };
  /** Báo lỏi trạng thái "đang trả lời" cho thanh tiến trình của trang. */
  setBusy: (v: boolean) => void;
  /** Lấy giọng đọc người dùng đã chọn. */
  getVoiceId: () => string;
};

export function useCallSession(deps: CallDeps) {
  const {
    micSupported,
    transcribeClip,
    speak,
    stopSpeaking,
    primeSpeechAudio,
    sendRef,
    onSmallTalk,
    onClearAll,
    busyRef,
    setBusy,
    getVoiceId,
  } = deps;

  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("listening");
  const [interim, setInterim] = useState("");

  /** Im lặng bao lâu thì coi là nói xong (ms) — chống cắt cụt "Xin chào". */
  const CALL_SILENCE_MS = 1400;
  /** Trần chờ cho một lượt nói (ms) — câu dài không bị treo. */
  const CALL_MAX_UTTERANCE_MS = 12000;
  /** Ngưỡng coi là "đang nói" khi đo âm lượng (RMS 0–1). */
  const CALL_VOICE_ON = 0.055;
  /**
   * Khoảng lặng tối thiểu sau khi trợ lý đọc xong mới mở lại mic (ms).
   *
   * 900ms là quá ngắn với điện thoại để loa ngoài: âm thanh cuối còn vọng vào
   * micro, phiên nghe mới mở ra đúng lúc loa còn rung → câu đầu tiên người
   * dùng nói bị nuốt và nghe như “không nghe”.
   */
  const CALL_ECHO_GUARD_MS = 1500;

  const callActiveRef = useRef(false);
  const aiSpeakingRef = useRef(false);
  const sendingRef = useRef(false);
  const mutedRef = useRef(false);
  const micDeniedRef = useRef(false);
  /** Số lần thử lại khi trợ lý còn đang bận (để không bỏ rơi câu nói). */
  const busyWaitsRef = useRef(0);
  /** Số lần tự gửi lại trong đàm thoại khi request lỗi (1 lần cho đủ). */
  const callRetryRef = useRef(0);
  /** 1 = đang tự gửi lại câu hỏi (giữ mic đóng trong lúc đó). */
  const callRetryPendingRef = useRef(0);
  /**
   * Đồng hồ canh giọng nói: nếu trợ lý đã đọc xong mà `onDone` không chạy
   * (lỗi hiếm gặp ở Web Speech/máy chủ TTS) thì mic phải được mở lại bằng
   * cách cưỡng bức — nếu không, cuộc gọi đứng im ở “đang nói” vĩnh viễn.
   */
  const speakGuardRef = useRef(0);
  /** Mốc bắt đầu lượt đọc to / lượt gửi — giám sát dùng để cứu vòng lặp. */
  const speakSinceRef = useRef(0);
  const sendSinceRef = useRef(0);
  /** Theo dõi lúc micro bị đánh dấu hỏng để tự thử mở lại. */
  const micDeniedSinceRef = useRef(0);
  const micDeniedRetryRef = useRef(0);
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
  const lastAiWordAtRef = useRef(0);
  const lastAssistantEventAtRef = useRef(0);
  const recRef = useRef<RecLike | null>(null);
  /**
   * Phiên nghe hiện tại còn sống không.
   *
   * QUAN TRỌNG: trước đây mọi lớp giám sát (3s, 5s, 12s) đều gọi thẳng vào
   * `startListening()`, hàm này lại luôn hủy phiên cũ rồi dựng phiên mới —
   * kể cả khi phiên cũ vẫn chạy tốt. Kết quả: micro bật/tắt liên tục, mất
   * đầu câu, điện thoại báo micro bận. Nay chỉ dựng lại khi phiên cũ THỰC SỰ
   * chết, còn phiên sống thì giữ nguyên.
   */
  const sessionLiveRef = useRef(false);
  /** Hẹn giờ mở lại mic đang chờ — dùng để gộp/cancel lệnh dựng lại. */
  const reopenTimerRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => {});
  /** Gọi kết thúc cuộc gọi từ trong `handleUtterance` (định nghĩa sau đó). */
  const endCallRef = useRef<() => void>(() => {});

  /** Gọi xong lượt đọc: trả trạng thái về "đang nghe" và mở lại mic. */
  const finishSpeaking = useCallback((spoken: string) => {
    // onDone CÓ THỂ chạy hai lần: một lần từ chính lớp đọc to, một lần từ
    // `.then()` bên dưới hoặc từ đồng hồ canh. Lần thứ hai sẽ hủy phiên nghe
    // vừa mới mở và bật lại micro → “chập chờn” đúng lúc người dùng đang
    // nói. Vì vậy chốt bằng cờ trạng thái: đang nói thì mới xử lý.
    if (!aiSpeakingRef.current) return;
    if (speakGuardRef.current) {
      window.clearTimeout(speakGuardRef.current);
      speakGuardRef.current = 0;
    }
    aiSpeakingRef.current = false;
    lastAiWordAtRef.current = Date.now();
    lastAssistantEventAtRef.current = Date.now();
    if (!callActiveRef.current) return;
    lastSpokenRef.current = spoken;
    // Đợi hết vọng cuối rồi mới mở lại mic.
    aiFinishedAtRef.current = Date.now();
    aiQuietUntilRef.current = Date.now() + CALL_ECHO_GUARD_MS;
    setCallStatus("listening");
    startListeningRef.current();
  }, []);

  /** Đọc to một câu rồi tự mở lại mic — dùng chung cho mọi lượt trả lời. */
  const speakThenListen = useCallback(
    (text: string) => {
      // Đang đọc dở câu trước mà câu mới đã đến: cắt câu cũ trước, nếu không
      // hai lượt đọc chồng tiếng — nghe như bị lặp, và onDone của lượt cũ đến
      // muộn sẽ giành mic của lượt mới.
      if (aiSpeakingRef.current) {
        stopSpeaking();
        aiSpeakingRef.current = false;
      }
      aiSpeakingRef.current = true;
      speakSinceRef.current = Date.now();
      sessionLiveRef.current = false;
      setInterim("");
      setCallStatus("speaking");
      lastAssistantEventAtRef.current = Date.now();
      // Đóng mic ngay khi bắt đầu đọc: không để trình duyệt nghe nhầm
      // giọng trợ lý thành câu hỏi của người dùng.
      aiQuietUntilRef.current = Date.now() + CALL_ECHO_GUARD_MS;
      const onDone = () => finishSpeaking(text);
      // ĐỒNG HỒ CANH: dù bất kỳ lý do nào (Web Speech nuốt lệnh đọc,
      // AudioContext bị khoá, máy chủ TTS im) khiến onDone không chạy thì vẫn
      // phải mở lại mic — nếu không, cuộc gọi đứng im ở “đang nói” vĩnh viễn.
      speakGuardRef.current = window.setTimeout(onDone, 60_000);
      // `speak` có thể trả về promise hoặc không; bọc qua Promise.resolve để
      // chờ được cả hai. Lời gọi kết thúc mà onDone không chạy thì vẫn phải
      // trả lại mic.
      void Promise.resolve(speak(text, { voice: getVoiceId(), onDone }))
        .catch(() => undefined)
        .then(() => {
          if (aiSpeakingRef.current) onDone();
        });
    },
    [finishSpeaking, getVoiceId, speak, stopSpeaking],
  );

  /** Đàm thoại: xử lý một câu người dùng vừa nói. */
  const handleUtterance = useCallback(
    (text: string) => {
      // "Xoá hội thoại" trong đàm thoại → xóa sạch và kết thúc cuộc gọi.
      if (isClearHistoryCommand(text)) {
        onClearAll();
        endCallRef.current?.();
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
      const local = smallTalkReply(text);
      if (local) {
        void stopMicRecording();
        onSmallTalk(text, local);
        return;
      }
      setCallStatus("thinking");
      sendingRef.current = true;
      sendSinceRef.current = Date.now();
      void sendRef.current(text, { fromCall: true });
    },
    [busyRef, onClearAll, onSmallTalk, sendRef],
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
    // Phiên nghe hiện tại vẫn sống → KHÔNG dựng lại. Đây là chốt chặn quan
    // trọng nhất chống micro chập chờn: dựng lại phiên sống sẽ cắt ngang câu
    // người dùng đang nói và làm micro nhấp nháy bật/tắt.
    if (sessionLiveRef.current) return;
    // Vừa đọc xong: chờ hết tiếng vọng rồi mới mở mic, nếu không trợ lý
    // nghe lại chính câu mình vừa đọc và tự hỏi lại nhau.
    const quiet = aiQuietUntilRef.current - Date.now();
    if (quiet > 0) {
      if (reopenTimerRef.current) window.clearTimeout(reopenTimerRef.current);
      reopenTimerRef.current = window.setTimeout(() => {
        reopenTimerRef.current = 0;
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
          // Có tiếng → phiên nghe còn sống: chặn lớp giám sát dựng lại.
          lastAssistantEventAtRef.current = now;
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
      sessionLiveRef.current = false;
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.abort();
      } catch {
        /* noop */
      }
      recRef.current = null;
      if (reopenTimerRef.current) window.clearTimeout(reopenTimerRef.current);
      reopenTimerRef.current = window.setTimeout(() => {
        reopenTimerRef.current = 0;
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
      sessionLiveRef.current = false;
      stopWatchdog();
      try {
        rec.onend = null;
        rec.stop();
      } catch {
        /* noop */
      }
      setInterim(heard);
      setCallStatus("thinking");
      // Lời chào/cảm ơn thuần: đáp ngay, khỏi chờ chép lại (tiết kiệm 1–2 giây).
      if (smallTalkReply(heard)) {
        void stopMicRecording();
        handleUtterance(heard);
        return;
      }
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
      sessionLiveRef.current = true;
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
      // Cập nhật mốc "sự kiện" ở MỌI kết quả (kể cả rỗng). Trước đây mốc này
      // chỉ đổi lúc mở phiên nghe và lúc trợ lý đọc xong, nên lớp giám sát 3
      // giây tưởng phiên nghe chết sau 8 giây im lặng và dựng lại — cắt ngang
      // câu người dùng đang nói. Đây là một nguyên nhân chính của “mic
      // chập chờn”.
      lastAssistantEventAtRef.current = now;
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
      sessionLiveRef.current = false;
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
    sessionLiveRef.current = true;
    sessionStartedAt = Date.now();
    lastEventAt = sessionStartedAt;
    // Bảo vệ: Chrome/Safari đôi khi treo phiên nghe mà không báo lỗi. Không có
    // gì trong 12 giây → tự dựng lại phiên nghe để không "chết âm thầm".
    stopWatchdog();
    watchdog = window.setInterval(() => {
      if (committed || !callActiveRef.current) return;
      // Đang có tiếng (đo được) → để đo mức lo, không dựng lại phiên nghe.
      if (loudSince) return;
      // 25 giây không có sự kiện nào mới coi như phiên nghe chết âm thầm
      // (Chrome/Safari dừng phiên sau một khoảng im lặng dài).
      if (Date.now() - lastEventAt < 25_000) return;
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
          // Có tiếng → phiên nghe còn sống: chặn lớp giám sát dựng lại.
          lastAssistantEventAtRef.current = now;
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
  }, [handleUtterance, micSupported, transcribeClip]);

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
    micDeniedSinceRef.current = 0;
    mutedRef.current = false;
    sendingRef.current = false;
    aiSpeakingRef.current = false;
    setInterim("");
    setCallStatus("listening");
    setCallOpen(true);
    callActiveRef.current = true;
    lastAssistantEventAtRef.current = Date.now();
    window.setTimeout(() => startListeningRef.current(), 400);
  }, [busyRef, micSupported, primeSpeechAudio, stopSpeaking]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    sessionLiveRef.current = false;
    if (reopenTimerRef.current) {
      window.clearTimeout(reopenTimerRef.current);
      reopenTimerRef.current = 0;
    }
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
    if (speakGuardRef.current) {
      window.clearTimeout(speakGuardRef.current);
      speakGuardRef.current = 0;
    }
    setInterim("");
    setCallOpen(false);
    setCallStatus("listening");
  }, [stopSpeaking]);

  // Nối `endCall` cho `handleUtterance` dùng khi nghe lệnh xoá hội thoại.
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    if (mutedRef.current) {
      sessionLiveRef.current = false;
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

  /** Người dùng bấm "Ngừng đọc" → dừng giọng và mở lại mic ngay. */
  const interruptSpeaking = useCallback(() => {
    stopSpeaking();
    aiSpeakingRef.current = false;
    sendingRef.current = false;
    if (speakGuardRef.current) {
      window.clearTimeout(speakGuardRef.current);
      speakGuardRef.current = 0;
    }
    lastAssistantEventAtRef.current = Date.now();
    setCallStatus("listening");
    startListeningRef.current();
  }, [stopSpeaking]);

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
        // Chỉ canh khi phiên nghe đang CHẾT, không canh khi nó còn sống.
        !sessionLiveRef.current
      ) {
        lastAssistantEventAtRef.current = Date.now();
        startListeningRef.current();
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  /* ----- GIÁM SÁT AN TOÀN cho vòng đàm thoại -----
   *
   * Mọi lớp bên dưới (ghi âm, chép lại, giọng đọc) đều đã có chốt chặn, nhưng
   * chỉ cần MỘT chỗ kẹt là micro đóng vĩnh viễn và người dùng thấy “không
   * phản hồi”. Vì vậy có thêm lớp giám sát độc lập: cứ 3 giây kiểm tra
   * trạng thái, thấy kẹt thì cưỡng bức trả lại micro cho người dùng. ----- */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!callActiveRef.current || mutedRef.current) {
        return;
      }
      const now = Date.now();
      // 0) Micro bị đánh dấu “không dùng được” — nhưng nhiều khi đó chỉ là
      //    lỗi tạm của trình duyệt (đặc biệt lúc vừa bật phiên nghe, hoặc
      //    micro vừa được nhả). Nếu không tự thử lại, cuộc gọi kẹt vĩnh viễn
      //    ở “Đang nghe”: nói gì cũng không ai nghe. Thử lại sau 20s, rồi
      //    sau 60s nếu vẫn hỏng.
      if (micDeniedRef.current) {
        if (!micDeniedSinceRef.current) {
          micDeniedSinceRef.current = now;
        } else if (
          now - micDeniedSinceRef.current >
          (micDeniedRetryRef.current ? 60_000 : 20_000)
        ) {
          micDeniedRetryRef.current = 1;
          micDeniedRef.current = false;
          micDeniedSinceRef.current = 0;
          lastAssistantEventAtRef.current = now;
          setCallStatus("listening");
          startListeningRef.current();
        }
        return;
      }
      micDeniedSinceRef.current = 0;
      // 1) Kẹt ở “đang trả lời” quá 25s → cưỡng bức kết thúc lượt đọc.
      if (aiSpeakingRef.current) {
        if (speakSinceRef.current > 0 && now - speakSinceRef.current > 25_000) {
          interruptSpeaking();
        }
        return;
      }
      // Không còn đọc → xoá mốc để lượt sau tính lại từ đầu.
      speakSinceRef.current = 0;
      // 2) Kẹt ở “đang gửi” quá 40s (máy chủ treo) → nhả trạng thái.
      if (sendingRef.current && now - sendSinceRef.current > 40_000) {
        sendingRef.current = false;
        busyRef.current = false;
        setBusy(false);
        setCallStatus("listening");
        lastAssistantEventAtRef.current = now;
        startListeningRef.current();
        return;
      }
      // 3) Đang nghe nhưng phiên nghe chết âm thầm → dựng lại (nhanh hơn
      //    đồng hồ 25 giây bên trong để người dùng ít phải chờ). CHỈ dựng
      //    lại khi phiên hiện tại thực sự chết — nếu không, mỗi lần im lặng
      //    dài sẽ hủy phiên đang chạy tốt và người dùng mất đầu câu.
      if (!sendingRef.current && !sessionLiveRef.current) {
        lastAssistantEventAtRef.current = now;
        startListeningRef.current();
      }
    }, 3_000);
    return () => window.clearInterval(id);
  }, [busyRef, interruptSpeaking, setBusy]);

  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      sessionLiveRef.current = false;
      if (reopenTimerRef.current) {
        window.clearTimeout(reopenTimerRef.current);
        reopenTimerRef.current = 0;
      }
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  return {
    callOpen,
    callStatus,
    interim,
    openCall,
    endCall,
    toggleMute,
    interruptSpeaking,
    /** Dùng bởi trang khi nhận câu trả lời để đọc to rồi mở lại mic. */
    speakThenListen,
    handleUtterance,
    // Ref dùng chung với phần gửi tin của trang.
    callActiveRef,
    aiSpeakingRef,
    sendingRef,
    lastAssistantEventAtRef,
    lastSpokenRef,
    aiFinishedAtRef,
    aiQuietUntilRef,
    speakGuardRef,
    speakSinceRef,
    sendSinceRef,
    callRetryRef,
    callRetryPendingRef,
    startListeningRef,
    setInterim,
    setCallStatus,
  };
}
