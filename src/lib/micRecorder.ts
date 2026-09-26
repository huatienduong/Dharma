/**
 * GHI ÂM SONG SONG VỚI WEB SPEECH.
 *
 * Web Speech API của trình duyệt nghe tiếng Việt khá lệch (đặc biệt trên
 * Android và khi ồn), nên ta ghi âm luôn rồi gửi lên chép bằng Whisper.
 * Bản trình duyệt vẫn dùng làm phản hồi tức thì và làm dự phòng.
 *
 * Lớp này là DỰ PHÒNG CUỐI CÙNG của chế độ đàm thoại: nếu micro không bật
 * được thì không còn tín hiệu nào để chốt câu, cuộc gọi đứng im ở “Đang
 * nghe”. Vì vậy mọi đường thất bại ở đây đều thử lại thay vì bỏ cuộc.
 *
 * Chỉ dùng MediaRecorder — không cần thư viện, hoạt động trên Chrome/Safari
 * di động. Nếu trình duyệt không hỗ trợ thì hàm trả false và ứng dụng tiếp
 * tục dùng Web Speech như trước.
 */

export type MicClip = { base64: string; mime: string };

/** Mức âm lượng hiện tại (0–1) để phát hiện người dùng đã nói xong. */
export type MicLevelFn = (level: number) => void;

let recorder: MediaRecorder | null = null;
let chunks: BlobPart[] = [];
let stream: MediaStream | null = null;
let levelTimer = 0;
let levelResume: (() => void) | null = null;
let meterSource: MediaStreamAudioSourceNode | null = null;
/**
 * Người nghe mức âm hiện tại — tách khỏi hàm gọi để CÓ THỂ ĐỔI khi phiên ghi
 * âm vẫn đang chạy.
 *
 * VÌ SAO: chế độ đàm thoại gọi `startMicRecording()` ở đầu mỗi phiên nghe, mà
 * trước đây hàm này luôn dừng phiên cũ rồi xin micro mới. Trên điện thoại,
 * bật/tắt getUserMedia liên tục (nhiều lần/giây khi watchdog kích hoạt) là
 * nguyên nhân trực tiếp khiến micro “chập chờn”, mất đầu câu. Nay phiên đang
 * chạy được GIỮ NGUYÊN, chỉ thay người nghe mức.
 */
let levelListener: MicLevelFn | null = null;
/**
 * AudioContext DÙNG CHUNG cho bộ đo mức.
 *
 * Trước đây mỗi phiên nghe tạo một context riêng rồi đóng lại. Điện thoại
 * giới hạn số AudioContext đang sống (thường ~6) — vượt quá thì `new
 * AudioContext()` ném lỗi, bộ đo mức im lặng và câu nói không bao giờ được
 * chốt. Dùng chung một context để không bao giờ chạm trần này.
 */
let meterCtx: AudioContext | null = null;
/**
 * Số thứ tự phiên ghi âm. `getUserMedia` là bất đồng bộ, nên hai lần bật mic
 * liên tiếp (cuộc gọi vừa đọc xong lại mở phiên nghe mới) có thể hoàn tất
 * theo thứ tự ngược: phiên cũ ghi đè phiên mới và callback đo mức chạy hai
 * bản → cùng một câu nói bị chốt hai lần, mic "lặp lại" câu đó. Số thứ tự
 * giúp phiên cũ tự bỏ đi thay vì giành micro.
 */
let startToken = 0;
/** Lúc micro được nhả gần nhất — không xin lại quá sớm (lỗi Android). */
let lastStopAt = 0;
/** Lời gọi đang chờ cấp quyền micro — dùng chung cho mọi nơi gọi. */
let inflight: Promise<boolean> | null = null;

const sleep = (ms: number) =>
  new Promise<void>((r) => window.setTimeout(r, ms));

export function isMicRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Ưu tiên định dạng nhỏ gọn nhất để upload nhanh. */
function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder.isTypeSupported !== "function") return "";
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

/**
 * Xin micro, có thử lại.
 *
 * LÝ DO PHẢI THỬ LẠI: sau khi một phiên ghi âm kết thúc, thiết bị âm thanh
 * cần vài trăm mili giây mới “thả” micro. Android trả về `NotReadableError`
 * / `AbortError` nếu xin lại quá sớm — đúng tình huống của chế độ đàm thoại
 * (đọc xong lại mở mic ngay). Không có bước thử lại này, cuộc gọi chỉ chạy
 * được đúng một lượt rồi kẹt vĩnh viễn ở “Đang nghe”.
 *
 * `NotAllowedError` (người dùng từ chối) thì thử lại cũng vô ích → thoát.
 */
async function acquireMic(): Promise<MediaStream | null> {
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      // Whisper nhận âm mono nên bỏ kênh stereo thừa ngay từ đầu.
      channelCount: 1,
    },
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(250 * attempt);
    try {
      // getUserMedia trên một số WebView treo mãi không trả lời → chốt 6s.
      return await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise<null>((r) => window.setTimeout(() => r(null), 6_000)),
      ]);
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") return null;
    }
  }
  return null;
}

function releaseStream() {
  if (levelTimer) {
    window.clearInterval(levelTimer);
    levelTimer = 0;
  }
  if (levelResume) {
    window.removeEventListener("visibilitychange", levelResume);
    levelResume = null;
  }
  // Chỉ ngắt kết nối, KHÔNG đóng context dùng chung (đóng mỗi lượt sẽ chạm
  // trần số AudioContext của trình duyệt).
  try {
    meterSource?.disconnect();
  } catch {
    /* noop */
  }
  meterSource = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

/** AudioContext dùng chung cho bộ đo mức (tạo một lần, dùng lại mãi). */
function getMeterCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!meterCtx) {
    try {
      meterCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (meterCtx.state === "suspended") void meterCtx.resume().catch(() => {});
  return meterCtx;
}

/**
 * Bật đo mức âm lượng. Nhờ đó biết khi nào người dùng im lặng để tự chốt
 * câu nói — cần thiết khi trình duyệt không có Web Speech (chỉ ghi âm).
 *
 * VÌ SAO KHÔNG DÙNG requestAnimationFrame:
 *   rAF bị hệ thống dừng hoàn toàn khi trang bị đưa ra sau (điện thoại bị
 *   gọi điện, mở ứng dụng khác, tắt màn hình). Lúc đó đo mức im lặng và
 *   người dùng nói xong nhưng ứng dụng không bao giờ biết → câu nói bị bỏ,
 *   không tự gửi. setInterval vẫn chạy nền nên giữ được nhịp đo.
 */
function startLevelMeter(media: MediaStream) {
  // Đang đo rồi → không tạo chồng (hai vòng đo trên một stream sinh ra
  // callback đo trùng, tự chốt câu hai lần).
  if (meterSource || levelTimer) return;
  const ctx = getMeterCtx();
  if (!ctx) return;
  try {
    const source = ctx.createMediaStreamSource(media);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    meterSource = source;
    const resumeTick = () => {
      // Rời bàn phím / quay lại tab: AudioContext hay bị treo theo.
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    };
    levelResume = resumeTick;
    window.addEventListener("visibilitychange", resumeTick);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      // Gọi qua biến levelListener để lượt gọi mới có thể thay người nghe mà
      // vẫn giữ nguyên phiên ghi âm (xem ghi chú khai báo levelListener).
      levelListener?.(Math.min(1, Math.sqrt(sum / data.length) * 4));
    };
    // 80ms là đủ mịn để nhận ra im lặng, mà vẫn nhẹ cho máy.
    levelTimer = window.setInterval(tick, 80);
    tick();
  } catch {
    /* không đo được mức — vẫn ghi âm bình thường */
  }
}

/** Một lần bật ghi âm thật sự (sau khi đã chờ micro được thả). */
async function doStart(onLevel?: MicLevelFn): Promise<boolean> {
  // Dừng phiên trước nếu còn sót.
  void stopMicRecording();
  // `stopMicRecording` xoá luôn levelListener (đúng ý: micro đã đen thì
  // không ai đo nữa), nên phải gắn lại người nghe của lượt bật này sau đó.
  levelListener = onLevel ?? null;
  const token = ++startToken;
  // Chờ micro được “thả” sau lượt ghi âm trước.
  const since = Date.now() - lastStopAt;
  if (lastStopAt && since < 300) await sleep(300 - since);
  if (token !== startToken) return false;

  const media = await acquireMic();
  // Đã có phiên mới hơn bắt đầu trong lúc chờ cấp quyền → nhả micro ngay,
  // không giành lại từ phiên đang chạy.
  if (!media || token !== startToken) {
    media?.getTracks().forEach((t) => t.stop());
    return false;
  }

  const mimeType = pickMimeType();
  // MediaRecorder cũng có lúc ném lỗi (đặc biệt khi phiên trước chưa đóng
  // hẳn) → thử lại thay vì mất luôn micro.
  let rec: MediaRecorder | null = null;
  for (let attempt = 0; attempt < 3 && !rec; attempt++) {
    if (attempt) await sleep(220 * attempt);
    if (token !== startToken) {
      media.getTracks().forEach((t) => t.stop());
      return false;
    }
    try {
      rec = new MediaRecorder(
        media,
        mimeType ? { mimeType } : undefined,
      );
    } catch {
      rec = null;
    }
  }
  if (!rec) {
    media.getTracks().forEach((t) => t.stop());
    return false;
  }

  chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  rec.onerror = () => {
    /* phiên ghi âm lỗi → bỏ qua, vẫn dùng được bản Web Speech */
  };
  try {
    rec.start(250);
  } catch {
    try {
      rec.start(250);
    } catch {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      media.getTracks().forEach((t) => t.stop());
      return false;
    }
  }
  recorder = rec;
  stream = media;
  if (onLevel) startLevelMeter(media);
  return true;
}

/** Bật ghi âm. Trả false nếu trình duyệt không cho phép. */
export function startMicRecording(onLevel?: MicLevelFn): Promise<boolean> {
  // Cập nhật người nghe mức TRƯỚC mọi nhánh thoát sớm: nếu phiên đang chạy
  // thì lượt gọi mới (một phiên nghe mới) vẫn nhận được mức âm.
  levelListener = onLevel ?? null;
  if (!isMicRecordingSupported()) return Promise.resolve(false);
  // PHIÊN ĐANG CHẠY → chỉ đổi người nghe mức, GIỮ micro. Không dừng rồi bật
  // lại: đó chính là thứ làm micro chập chờn và nuốt đầu câu nói.
  if (recorder && stream && !inflight) {
    if (onLevel) startLevelMeter(stream);
    return Promise.resolve(true);
  }
  // Đang chờ cấp quyền micro: dùng chung kết quả để hai nơi gọi cùng lúc
  // không tạo hai phiên (phiên sau sẽ giành micro của phiên trước).
  if (inflight) return inflight;
  const p = doStart(onLevel);
  inflight = p;
  void p.then(
    () => {
      if (inflight === p) inflight = null;
    },
    () => {
      if (inflight === p) inflight = null;
    },
  );
  return p;
}

/** Dừng ghi âm và trả về clip base64 (null nếu không có gì đáng dùng). */
export function stopMicRecording(): Promise<MicClip | null> {
  // Vô hiệu hoá phiên đang chờ cấp quyền: sau khi dừng thì micro phải đen,
  // không được bật lại vào lúc nào cũng.
  startToken++;
  inflight = null;
  levelListener = null;
  lastStopAt = Date.now();
  const rec = recorder;
  recorder = null;
  if (!rec) {
    releaseStream();
    return Promise.resolve(null);
  }
  return new Promise<MicClip | null>((resolve) => {
    let settled = false;
    const done = (clip: MicClip | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      releaseStream();
      resolve(clip);
    };
    // Gom các đoạn đã gom được thành clip base64 (dùng chung cho onstop và
    // chốt chặn bên dưới).
    const buildClip = (): Promise<MicClip | null> => {
      const type = rec.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      chunks = [];
      // Đoạn cực ngắn (dưới ~0.4s) gần như chỉ là tiếng bật mic — bỏ qua
      // để không gửi câu rỗng lên máy chủ. Ngưỡng thấp vì lời chào ngắn
      // ("Xin chào") cũng phải chép được.
      if (!blob.size || blob.size < 700) return Promise.resolve(null);
      return new Promise<MicClip | null>((res) => {
        const reader = new FileReader();
        reader.onerror = () => res(null);
        reader.onloadend = () => {
          const result = String(reader.result ?? "");
          const base64 = result.includes(",") ? result.split(",")[1] : "";
          res(base64 ? { base64, mime: type } : null);
        };
        reader.readAsDataURL(blob);
      });
    };
    rec.onstop = () => {
      void buildClip().then(done);
    };
    // CHỐT CHẶN: một số WebView Android KHÔNG bắn `onstop` khi dừng ghi âm
    // (hay gặp khi tab vừa bị đưa ra sau, hoặc khi phiên nghe bị hủy giữa
    // chừng). Promise treo mãi ở đây khiến chế độ đàm thoại kẹt ở bước
    // "đang chép lại" — mic không bao giờ mở lại, cuộc gọi chết âm thầm.
    // Sau 1,2s không có gì thì tự dựng clip từ những đoạn đã gom được.
    const guard = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      void buildClip().then(done);
    }, 1200);
    try {
      rec.stop();
    } catch {
      void buildClip().then(done);
    }
  });
}
