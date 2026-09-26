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

let recorder: MediaRecorder | null = null;
let chunks: BlobPart[] = [];
let stream: MediaStream | null = null;

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
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

/** Bắt đầu ghi âm. Trả false nếu trình duyệt không cho phép. */
export async function startMicRecording(): Promise<boolean> {
  if (!isMicRecordingSupported()) return false;
  // Dừng phiên trước nếu còn sót.
  void stopMicRecording();
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
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
    return true;
  } catch {
    // Không cấp quyền micro hoặc trình duyệt chặn → không ghi âm được.
    return false;
  }
}

/** Dừng ghi âm và trả về clip base64 (null nếu không có gì đáng dùng). */
export function stopMicRecording(): Promise<MicClip | null> {
  const rec = recorder;
  recorder = null;
  if (!rec) {
    releaseStream();
    return Promise.resolve(null);
  }
  return new Promise<MicClip | null>((resolve) => {
    rec.onstop = () => {
      releaseStream();
      const type = rec.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      chunks = [];
      if (!blob.size) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onloadend = () => {
        const result = String(reader.result ?? "");
        const base64 = result.includes(",") ? result.split(",")[1] : "";
        resolve(base64 ? { base64, mime: type } : null);
      };
      reader.readAsDataURL(blob);
    };
    try {
      rec.stop();
    } catch {
      releaseStream();
      resolve(null);
    }
  });
}
