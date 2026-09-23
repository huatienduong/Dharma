/* ------------------------------------------------------------------ */
/* FETCH QUA PROXY CORS CÔNG CỘNG — dùng chung (tin tức, hình Wikipedia) */
/* Cùng cơ chế fallback đã dùng cho YouTube trực tiếp: thử lần lượt    */
/* proxy công cộng rồi gọi thẳng (một số môi trường CORS mở sẵn).      */
/* ------------------------------------------------------------------ */

const PROXIES: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => url, // gọi thẳng cuối cùng
];

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET trả về TEXT qua chuỗi proxy — dùng cho RSS/XML. */
export async function fetchTextViaProxies(url: string, timeoutMs = 12_000): Promise<string> {
  let lastErr: unknown = null;
  for (const wrap of PROXIES) {
    try {
      const res = await fetchWithTimeout(wrap(url), timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Không tải được dữ liệu.");
}

/** GET trả về JSON qua chuỗi proxy — dùng cho REST API. */
export async function fetchJsonViaProxies<T = unknown>(url: string, timeoutMs = 12_000): Promise<T> {
  const text = await fetchTextViaProxies(url, timeoutMs);
  return JSON.parse(text) as T;
}
