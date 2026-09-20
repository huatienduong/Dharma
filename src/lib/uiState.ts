/* ------------------------------------------------------------------ */
/* Trạng thái giao diện theo phiên (sessionStorage)                     */
/* — giữ thao tác của người dùng khi rời trang rồi quay lại:            */
/*   từ khóa tìm kiếm, vị trí cuộn, tab đang chọn… không bị reset.      */
/* ------------------------------------------------------------------ */

const PREFIX = "dharma-ui:";

export function loadUiState<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveUiState(key: string, value: unknown) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

/** Gắn listener lưu vị trí cuộn theo key (dọn dẹp khi unmount). */
export function trackScroll(key: string): () => void {
  const onScroll = () => {
    saveUiState(`scroll:${key}`, window.scrollY);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}

/** Khôi phục vị trí cuộn đã lưu (gọi 1 lần sau khi dữ liệu render). */
export function restoreScroll(key: string, attempts = 8) {
  const saved = loadUiState<number>(`scroll:${key}`, 0);
  if (saved <= 0) return;
  let left = attempts;
  const tryRestore = () => {
    window.scrollTo(0, saved);
    // Thử lại vài frame vì danh sách có thể chưa render đủ
    if (
      left-- > 0 &&
      document.documentElement.scrollHeight - window.innerHeight < saved
    ) {
      requestAnimationFrame(tryRestore);
    }
  };
  requestAnimationFrame(tryRestore);
}
