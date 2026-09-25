/**
 * Bảo vệ thiết bị — Trợ lý Phật học
 * ----------------------------------
 * Mục tiêu: chặn các môi trường TỰ ĐỘNG HÓA / BỊ CAN THIỆP (bot, headless
 * browser, trình điều khiển từ xa, DevTools mở thường xuyên) khỏi việc lạm
 * dụng ứng dụng — đặc biệt là đốt hạn mức AI phía máy chủ.
 *
 * Cơ chế 2 tầng:
 *  1. Client: quét tín hiệu môi trường → điểm số rủi ro.
 *     - "blocked": chặn ngay, khóa màn hình, và mọi lệnh gọi AI bị từ chối.
 *     - "suspicious": vẫn dùng được nhưng bị giới hạn tốc độ nghiêm ngặt hơn
 *       ở máy chủ.
 *  2. Server (convex/aiChat.ts): mỗi lệnh ask/speak gửi kèm dấu vân tay thiết
 *     bị + trạng thái; máy chủ tự áp giới hạn tốc độ theo từng thiết bị/người
 *     dùng — đây là tầng khó vượt qua nhất kể cả client bị giả mạo.
 *
 * Lưu ý trung thực: mọi cơ chế phía client đều có thể bị kẻ có chủ đích vượt
 * qua (mã nguồn chạy trong trình duyệt). Tầng máy chủ mới là rào cản thực sự.
 */

const DEVICE_ID_KEY = "ds-device-id";

export type DeviceIntegrity = "ok" | "suspicious" | "blocked";

/** Ngưỡng điểm rủi ro */
const BLOCK_SCORE = 60;
const SUSPICIOUS_SCORE = 35;

/** Khoảng trống kích thước của sổ gợi ý DevTools đang mở */
const DEVTOOLS_GAP = 200;
const SCAN_INTERVAL_MS = 5_000;

/* ------------------------------------------------------------------ */
/* Dấu vân tay thiết bị (không phải PII — chỉ là chuỗi ngẫu nhiên)     */
/* ------------------------------------------------------------------ */

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ID ổn định của thiết bị/ngữ trình duyệt — sinh một lần, tái sử dụng. */
export function deviceFingerprint(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "no-storage";
  }
}

/* ------------------------------------------------------------------ */
/* Quét tín hiệu môi trường                                            */
/* ------------------------------------------------------------------ */

type ScanResult = { score: number; reasons: string[] };

/** DevTools đang mở? (khoảng trống giữa cửa sổ và khung nhìn) */
function devToolsGapOpen(): boolean {
  try {
    const gap = Math.max(
      window.outerWidth - window.innerWidth,
      window.outerHeight - window.innerHeight,
    );
    return gap > DEVTOOLS_GAP;
  } catch {
    return false;
  }
}

function scanOnce(): ScanResult {
  const res: ScanResult = { score: 0, reasons: [] };
  if (typeof navigator === "undefined") return res;

  const nav = navigator as Navigator & {
    webdriver?: boolean;
    plugins?: { length: number };
    languages?: readonly string[];
  };
  const ua = nav.userAgent ?? "";

  // 1. Cờ tự động hóa của trình điều khiển (Puppeteer/Playwright/Selenium)
  if (nav.webdriver === true) {
    res.score += 70;
    res.reasons.push("webdriver");
  }

  // 2. UA headless công khai
  if (/HeadlessChrome/i.test(ua)) {
    res.score += 80;
    res.reasons.push("headless-ua");
  }

  // 3. Mất nhất quán UA ↔ nền tảng (giả mạo / trình giả lập)
  const platform = nav.platform ?? "";
  if (/Android/i.test(ua) && /^(Win|Mac)/i.test(platform)) {
    res.score += 35;
    res.reasons.push("ua-platform-mismatch");
  }

  // 4. Thiếu đặc tính trình duyệt Chrome "thật" (headless đã vá UA)
  const desktopChrome = /Chrome\//.test(ua) && !/Mobile|Android|Edg|OPR|iPhone/i.test(ua);
  if (desktopChrome) {
    if (!nav.languages || nav.languages.length === 0) {
      res.score += 25;
      res.reasons.push("no-languages");
    }
    if (nav.plugins && nav.plugins.length === 0) {
      res.score += 25;
      res.reasons.push("no-plugins");
    }
  }

  // 5. GPU phần mềm (máy ảo / bot chay)
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer =
      dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "") : "";
    if (!renderer || /SwiftShader|llvmpipe|Software/i.test(renderer)) {
      res.score += 20;
      res.reasons.push("software-gl");
    }
  } catch {
    /* bỏ qua — không đọc được GPU không phải tín hiệu chặn */
  }

  // 6. DevTools đang mở khi quét
  if (devToolsGapOpen()) {
    res.score += 50;
    res.reasons.push("devtools-open");
  }

  return res;
}

function classify(score: number): DeviceIntegrity {
  if (score >= BLOCK_SCORE) return "blocked";
  if (score >= SUSPICIOUS_SCORE) return "suspicious";
  return "ok";
}

/* ------------------------------------------------------------------ */
/* Trạng thái hiện tại + vòng quét định kỳ                             */
/* ------------------------------------------------------------------ */

let currentIntegrity: DeviceIntegrity = "ok";
let scanning = false;

/** Trạng thái bảo mật hiện tại của thiết bị — gửi kèm lệnh gọi AI. */
export function getDeviceMeta(): { deviceId: string; integrity: DeviceIntegrity } {
  return { deviceId: deviceFingerprint(), integrity: currentIntegrity };
}

/**
 * Khởi động vòng quét bảo vệ. Trả về hàm dọn dẹp (dùng trong useEffect).
 * `onChange` được gọi mỗi khi trạng thái thay đổi.
 */
export function startDeviceGuard(
  onChange?: (integrity: DeviceIntegrity) => void,
): () => void {
  if (scanning) return () => {};
  scanning = true;

  const apply = () => {
    const next = classify(scanOnce().score);
    if (next !== currentIntegrity) {
      currentIntegrity = next;
      onChange?.(next);
    }
  };

  apply(); // quét ngay khi khởi động
  const timer = window.setInterval(apply, SCAN_INTERVAL_MS);

  return () => {
    window.clearInterval(timer);
    scanning = false;
  };
}
