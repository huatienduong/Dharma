/**
 * GHI ÂM SONG SONG VỚI WEB SPEECH.
 *
 * Web Speech API của trình duyệt nghe tiếng Việt khá lệch (đặc biệt trên
 * Android và khi ồn), nên ta ghi âm luôn rồi gửi lên chép bằng Whisper.
 * Bản trình duyệt vẫn dùng làm phản hồi tức thì và làm dự phòng.
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
let levelCtx: AudioContext | null = null;
let levelTimer = 0;
let levelResume: (() => void) | null = null;
/**
 * Số thứ tự phiên ghi âm. `getUserMedia` là bất đồng bộ, nên hai lần bật mic
 * liên tiếp (cuộc gọi vừa đọc xong lại mở phiên nghe mới) có thể hoàn tất
 * theo thứ tự ngược: phiên cũ ghi đè phiên mới và callback đo mức chạy hai
 * bản → cùng một câu nói bị chốt hai lần, mic "lặp lại" câu đó. Số thứ tự
 * giúp phiên cũ tự bỏ đi thay vì giành micro.
 */
let startToken = 0;

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

function releaseStream() {
  if (levelTimer) {
    window.clearInterval(levelTimer);
    levelTimer = 0;
  }
  if (levelResume) {
    window.removeEventListener("visibilitychange", levelResume);
    levelResume = null;
  }
  void levelCtx?.close().catch(() => {});
  levelCtx = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
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
function startLevelMeter(media: MediaStream, onLevel: MicLevelFn) {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    // iOS/Safari tạo AudioContext ở trạng thái suspended nếu không có cử chỉ
    // người dùng → AnalyserNode không chạy, đo mức luôn 0 và câu nói bị bỏ.
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(media);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    levelCtx = ctx;
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
      onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
    };
    // 80ms là đủ mịn để nhận ra im lặng, mà vẫn nhẹ cho máy.
    levelTimer = window.setInterval(tick, 80);
    tick();
  } catch {
    /* không đo được mức — vẫn ghi âm bình thường */
  }
}

/** Bắt đầu ghi âm. Trả false nếu trình duyệt không cho phép. */
export async function startMicRecording(
  onLevel?: MicLevelFn,
): Promise<boolean> {
  if (!isMicRecordingSupported()) return false;
  // Dừng phiên trước nếu còn sót.
  void stopMicRecording();
  const token = ++startToken;
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Whisper nhận âm mono nên bỏ kênh stereo thừa ngay từ đầu.
        channelCount: 1,
      },
    });
    // Đã có phiên mới hơn bắt đầu trong lúc chờ cấp quyền → nhả micro ngay,
    // không giành lại từ phiên đang chạy.
    if (token !== startToken) {
      media.getTracks().forEach((t) => t.stop());
      return false;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(
      media,
      mimeType ? { mimeType } : undefined,
    );
    chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onerror = () => {
      /* phiên ghi âm lỗi → bỏ qua, vẫn dùng được bản Web Speech */
    };
    rec.start(250);
    recorder = rec;
    stream = media;
    if (onLevel) startLevelMeter(media, onLevel);
    return true;
  } catch {
    // Không cấp quyền micro hoặc trình duyệt chặn → không ghi âm được.
    return false;
  }
}

/** Dừng ghi âm và trả về clip base64 (null nếu không có gì đáng dùng). */
export function stopMicRecording(): Promise<MicClip | null> {
  // Vô hiệu hoá phiên đang chờ cấp quyền: sau khi dừng thì micro phải đen,
  // không được bật lại vào lúc nào cũng.
  startToken++;
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
