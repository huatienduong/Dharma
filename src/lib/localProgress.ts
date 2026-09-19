/* ------------------------------------------------------------------ */
/* Tiến trình CỤC BỘ cho khách chưa đăng nhập (localStorage)           */
/* — đảm bảo "dừng ở đâu quay lại xem đúng đoạn đó" cho MỌI người dùng, */
/*   kể cả khi chưa đăng nhập. Khi đăng nhập, dữ liệu server ưu tiên.  */
/* ------------------------------------------------------------------ */

const WATCH_KEY = "ds-progress-watch";
const READING_KEY = "ds-progress-reading";
const MEDIT_KEY = "ds-progress-meditation";

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

export function clearAllLocalProgress() {
  try {
    localStorage.removeItem(WATCH_KEY);
    localStorage.removeItem(READING_KEY);
    localStorage.removeItem(MEDIT_KEY);
  } catch {
    /* bỏ qua */
  }
}
