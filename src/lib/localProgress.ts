/* ------------------------------------------------------------------ */
/* Tiến trình CỤC BỘ cho khách chưa đăng nhập (localStorage)           */
/* — đảm bảo "dừng ở đâu quay lại xem đúng đoạn đó" cho MỌI người dùng, */
/*   kể cả khi chưa đăng nhập. Khi đăng nhập, dữ liệu server ưu tiên.  */
/* ------------------------------------------------------------------ */

const WATCH_KEY = "ds-progress-watch";
const READING_KEY = "ds-progress-reading";
const SUTTA_KEY = "ds-progress-sutta";
const MEDIT_KEY = "ds-progress-meditation";
const SESSION_KEY = "ds-player-session";

/* ------------------------------------------------------------------ */
/* GHI NGAY KHI RỜI ỨNG DỤNG                                            */
/* Trình duyệt không đảm bảo chạy hết debounce khi người dùng đóng tab/ */
/* tắt màn hình → đăng ký sẵn hai sự kiện "sắp rời" để ghi tiến trình  */
/* ngay lập tức. Gọi một lần trong effect của trang đọc/trình phát.     */
/* ------------------------------------------------------------------ */
export function onAppHide(flush: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const handler = () => flush();
  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
  window.addEventListener("blur", handler);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("pagehide", handler);
    window.removeEventListener("beforeunload", handler);
    window.removeEventListener("blur", handler);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

function readJSON<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJSON<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows.slice(-300)));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

/* ----------------------- Xem video ----------------------- */

export type LocalWatchRow = {
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt: number;
};

export function loadLocalWatch(): LocalWatchRow[] {
  return readJSON<LocalWatchRow>(WATCH_KEY);
}

export function saveLocalWatch(row: {
  youtubeId: string;
  title?: string;
  teacher?: string;
  channelName?: string;
  publishedAt?: string;
  positionSec: number;
  durationSec: number;
  completed?: boolean;
}) {
  if (!row.youtubeId) return;
  const rows = loadLocalWatch();
  const existing = rows.find((r) => r.youtubeId === row.youtubeId);
  const updatedAt = Date.now();
  const duration =
    row.durationSec > 0 ? row.durationSec : (existing?.durationSec ?? 0);
  const completed =
    row.completed ??
    (duration > 0 &&
      (row.positionSec / duration >= 0.95 || duration - row.positionSec < 45));
  const next: LocalWatchRow = {
    youtubeId: row.youtubeId,
    title: row.title ?? existing?.title ?? "",
    teacher: row.teacher ?? existing?.teacher ?? "",
    channelName: row.channelName ?? existing?.channelName ?? "",
    publishedAt: row.publishedAt ?? existing?.publishedAt ?? "",
    positionSec: Math.max(0, Math.floor(row.positionSec)),
    durationSec: Math.max(0, Math.floor(duration)),
    completed,
    updatedAt,
  };
  const others = rows.filter((r) => r.youtubeId !== row.youtubeId);
  others.push(next);
  others.sort((a, b) => b.updatedAt - a.updatedAt);
  writeJSON(WATCH_KEY, others);
}

export function loadLocalWatchPos(youtubeId: string): number {
  const row = loadLocalWatch().find((r) => r.youtubeId === youtubeId);
  return row && !row.completed ? row.positionSec : 0;
}

/* ----------------------- Đọc Kinh/Luật ----------------------- */

export type LocalReadingRow = { docId: string; percent: number; updatedAt: number };

export function loadLocalReading(): LocalReadingRow[] {
  return readJSON<LocalReadingRow>(READING_KEY);
}

export function saveLocalReading(docId: string, percent: number) {
  const rows = loadLocalReading().filter((r) => r.docId !== docId);
  rows.push({ docId, percent: Math.max(0, Math.min(100, Math.round(percent))), updatedAt: Date.now() });
  writeJSON(READING_KEY, rows);
}

export function loadLocalReadingPercent(docId: string): number {
  const row = loadLocalReading().find((r) => r.docId === docId);
  return row?.percent ?? 0;
}

/* ----------------------- Đọc Kinh (cục bộ) ----------------------- */

export type LocalSuttaRow = { docId: string; percent: number; updatedAt: number };

export function loadLocalSuttaProgress(): LocalSuttaRow[] {
  return readJSON<LocalSuttaRow>(SUTTA_KEY);
}

export function saveLocalSuttaProgress(docId: string, percent: number) {
  const rows = loadLocalSuttaProgress().filter((r) => r.docId !== docId);
  rows.push({
    docId,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    updatedAt: Date.now(),
  });
  writeJSON(SUTTA_KEY, rows);
}

export function loadLocalSuttaPercent(docId: string): number {
  const row = loadLocalSuttaProgress().find((r) => r.docId === docId);
  return row?.percent ?? 0;
}

/* ----------------------- Phiên thiền ----------------------- */

export type LocalMeditationRow = {
  technique: string;
  durationSec: number;
  completedAt: number;
};

export function loadLocalMeditation(): LocalMeditationRow[] {
  return readJSON<LocalMeditationRow>(MEDIT_KEY);
}

export function saveLocalMeditation(technique: string, durationSec: number) {
  const rows = loadLocalMeditation();
  rows.push({ technique, durationSec, completedAt: Date.now() });
  writeJSON(MEDIT_KEY, rows);
}

/* ------------- Phiên xem dở — mở lại app vào đúng nội dung ------------- */

export type LocalSession = {
  youtubeId: string;
  title: string;
  teacher: string;
  channelName: string;
  publishedAt: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
};

/** Lưu video đang xem dở + vị trí, để lần sau mở app là vào đúng đoạn đó. */
export function saveLocalSession(row: Omit<LocalSession, "updatedAt">) {
  if (!row.youtubeId) return;
  try {
    const next: LocalSession = { ...row, updatedAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

/** Đọc phiên xem dở gần nhất (null nếu chưa có). */
export function loadLocalSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSession;
    if (!parsed?.youtubeId) return null;
    // Phiên quá cũ (hơn 30 ngày) coi như không còn
    if (Date.now() - (parsed.updatedAt ?? 0) > 30 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

export function clearLocalWatch() {
  try {
    localStorage.removeItem(WATCH_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

export function clearAllLocalProgress() {
  try {
    localStorage.removeItem(WATCH_KEY);
    localStorage.removeItem(READING_KEY);
    localStorage.removeItem(SUTTA_KEY);
    localStorage.removeItem(MEDIT_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}
