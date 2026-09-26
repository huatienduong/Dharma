/**
 * LẤY NGUỒN PHÁT TRỰC TIẾP CHO VIDEO — không nhúng YouTube.
 *
 * YouTube không cho phát trực tiếp bằng thẻ <video> (chỉ nhúng iframe), nên
 * ứng dụng dùng các **máy chủ proxy công khai** (Piped / Invidious) để lấy
 * đường dẫn tệp mp4 rồi phát bằng trình phát của chính ứng dụng — không
 * cần YouTube, không có logo YouTube, không nhúng trang web lạ.
 *
 * Nếu không máy chủ nào trả về nguồn phát, hàm trả null và giao diện báo
 * rõ cho người dùng thay vì im lặng.
 */

/** Các máy chủ proxy, thử theo thứ tự. */
const STREAM_SERVICES = [
  "https://pipedapi.adminforge.de",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
];

/** Các bản Invidious (trả file mp4 trực tiếp). */
const INVIDIOUS_SERVICES = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.f5.si",
];

/** Chỉ nhận URL là tệp video, không nhận trang HTML hay link lạ. */
function isVideoUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  if (!/^https:\/\//i.test(url)) return false;
  if (/\.html?($|\?)/i.test(url)) return false;
  return true;
}

/** Chọn luồng mp4 hợp lý nhất trong danh sách của Piped/Invidious. */
function pickStream(
  streams: {
    url?: string;
    quality?: string;
    videoOnly?: boolean;
    mimeType?: string;
  }[],
): string | null {
  const usable = streams.filter(
    (s) => isVideoUrl(s.url) && !/audio\//i.test(s.mimeType ?? ""),
  );
  if (!usable.length) return null;
  // Ưu tiên có cả hình và tiếng; sau đó là chất lượng cao nhất dưới 1080p.
  const score = (s: { quality?: string; videoOnly?: boolean }) => {
    const q = Number((s.quality ?? "").replace("p", "")) || 0;
    const cap = q > 1080 ? 1080 : q;
    return cap + (s.videoOnly ? -4000 : 0);
  };
  return [...usable].sort((a, b) => score(b) - score(a))[0].url ?? null;
}

/**
 * Trả về URL tệp video phát trực tiếp, hoặc null nếu không lấy được.
 * `signal` cho phép huỷ khi người dùng đóng màn hình.
 */
export async function resolveDirectStream(
  videoId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const jsonUrl = (base: string) => `${base}/streams/${videoId}`;
  const invUrl = (base: string) =>
    `${base}/api/v1/videos/${videoId}`;

  // 1) Piped: JSON có sẵn các luồng mp4.
  for (const base of STREAM_SERVICES) {
    try {
      const res = await fetch(jsonUrl(base), {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        videoStreams?: {
          url?: string;
          quality?: string;
          videoOnly?: boolean;
          mimeType?: string;
        }[];
      };
      const url = pickStream(data.videoStreams ?? []);
      if (url) return url;
    } catch {
      /* thử máy chủ tiếp theo */
    }
  }

  // 2) Invidious: JSON có formatStreams (chỉ "adaptive" + "dash").
  for (const base of INVIDIOUS_SERVICES) {
    try {
      const res = await fetch(invUrl(base), {
        signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        formatStreams?: {
          url?: string;
          qualityLabel?: string;
          mimeType?: string;
        }[];
        adaptiveFormats?: {
          url?: string;
          qualityLabel?: string;
          mimeType?: string;
        }[];
      };
      const url =
        pickStream(
          (data.formatStreams ?? []).map((f) => ({
            url: f.url,
            quality: f.qualityLabel,
            mimeType: f.mimeType,
          })),
        ) ??
        pickStream(
          (data.adaptiveFormats ?? []).map((f) => ({
            url: f.url,
            quality: f.qualityLabel,
            mimeType: f.mimeType,
          })),
        );
      if (url) return url;
    } catch {
      /* thử máy chủ tiếp theo */
    }
  }

  return null;
}

/** "125" → "2:05"; "3725" → "1:02:05". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
