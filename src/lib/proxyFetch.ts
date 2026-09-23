/* ------------------------------------------------------------------ */
/* FETCH QUA PROXY CORS CÔNG CỘNG — dùng chung (tin tức, hình Wikipedia) */
/* TỐC ĐỘ: gọi tất cả proxy ĐỒNG THỜI (race), lấy phản hồi đầu tiên.   */
/* Với fetch thẳng bị CORS-block thì chrome văng lỗi ngay lập tức nên   */
/* race không tốn thêm băng thông đáng kể nhưng rút ngắn từ ~30s → <2s. */
/* ------------------------------------------------------------------ */

const PROXIES: Array<(url: string) => string> = [
  (url) => url, // thử thẳng trước — nếu môi trường CORS mở thì nhanh nhất
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url) => `https://proxy.cors.sh/${url}`,
  (url) => `https://test.cors.workers.dev/?${url}`,
];

const TIMEOUT_MS = 9_000;

function fetchOne(url: string, ms: number, asJson: boolean): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal, headers: asJson ? { Accept: "application/json" } : undefined })
    .finally(() => clearTimeout(timer));
}

/** GET trả về TEXT qua chuỗi proxy — RACE tất cả proxy cùng lúc. */
export async function fetchTextViaProxies(url: string, timeoutMs = TIMEOUT_MS): Promise<string> {
  const attempts = PROXIES.map(async (wrap) => {
    const res = await fetchOne(wrap(url), timeoutMs, false);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text) throw new Error("Phản hồi rỗng");
    return text;
  });
  try {
    return await Promise.any(attempts);
  } catch {
    throw new Error("Không tải được dữ liệu từ mọi nguồn.");
  }
}

/** GET trả về JSON qua chuỗi proxy — RACE tất cả proxy cùng lúc. */
export async function fetchJsonViaProxies<T = unknown>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  const text = await fetchTextViaProxies(url, timeoutMs);
  try {
    return JSON.parse(text) as T;
  } catch {
    // một số proxy trả JSON bọc HTML — cố gỡ chuỗi đầu tiên
    const start = text.indexOf("{");
    const arr = text.indexOf("[");
    const cut = arr >= 0 && (arr < start || start < 0) ? arr : start;
    if (cut >= 0) return JSON.parse(text.slice(cut)) as T;
    throw new Error("Dữ liệu JSON không hợp lệ.");
  }
}
