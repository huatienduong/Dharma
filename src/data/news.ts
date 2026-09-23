import { fetchTextViaProxies } from "@/lib/proxyFetch";

/* ------------------------------------------------------------------ */
/* TIN TỨC PHẬT GIÁO — tổng hợp RSS từ báo/chuyên trang Phật giáo VN    */
/* Chỉ đọc (GET công khai), không cần khóa.                             */
/* Chiến lược chống trống dữ liệu:                                      */
/*  1. Nguồn RSS chuyên trang Phật giáo (ưu tiên).                      */
/*  2. Google News RSS truy vấn "Phật giáo" — luôn có tin mới, CORS     */
/*     friendly qua proxy.                                              */
/*  3. Cache localStorage 15 phút + fallback cache CŨ khi mọi nguồn lỗi */
/*     → trang tin KHÔNG BAO GIỜ trống nếu từng nạp thành công.         */
/* ------------------------------------------------------------------ */

export type NewsItem = {
  id: string; // hash duy nhất từ link
  title: string;
  link: string;
  source: string; // tên báo
  publishedAt: number; // epoch ms
  summary: string; // đoạn mô tả ngắn
  image?: string; // ảnh minh họa (nếu RSS cung cấp)
};

/* Nguồn RSS công khai — chuyên Phật giáo trước, Google News dự phòng */
const FEEDS: Array<{ name: string; url: string }> = [
  { name: "Google News — Phật giáo", url: "https://news.google.com/rss/search?q=Ph%E1%BA%ADt+gi%C3%A1o&hl=vi&gl=VN&ceid=VN:vi" },
  { name: "Google News — Theravada", url: "https://news.google.com/rss/search?q=theravada+OR+%22ph%C3%A1p+tho%E1%BA%A1i%22+OR+vesak&hl=vi&gl=VN&ceid=VN:vi" },
  { name: "Thư viện Hoa Sen", url: "https://thuvienhoasen.org/rss/all" },
  { name: "Báo Phật giáo Việt Nam", url: "https://baoangiang.com/rss/home.rss" },
  { name: "RFA Tiếng Việt — Phật giáo", url: "https://www.rfa.org/vietnamese/rss.html" },
];

/* Từ khóa lọc: chỉ giữ bài thuộc Phật giáo */
const MUST_HINTS = [
  "phật", "phap", "pháp", "dhamma", "dharma", "theravada", "theravāda", "nguyên thủy",
  "kinh", "chùa", "tăng", "ni", "giáo hội", "giao hoi", "vesak", "phật đản",
  "uposatha", "bổn sư", "bon su", "tịnh xá", "tinh xa", "thiền", "niết bàn", "bát quan trai",
  "buddha", "buddhist", "sangha", "tăng đoàn", "hòa thượng", "đại đức", "sư",
];

const BLOCKED = [
  "bóng đá", "bong da", "champions league", "premier league", "world cup", "olympic",
  "chứng khoán", "chung khoan", "bitcoin", "crypto", "lottery", "xổ số", "xo so",
  "nấu ăn", "nau an", "makeup", "giá vàng", "gia vang", "tỷ giá", "ty gia",
];

function toAsciiLower(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
}

function isBuddhistNews(title: string, summary: string): boolean {
  const hay = toAsciiLower(`${title} ${summary}`);
  if (BLOCKED.some((k) => hay.includes(toAsciiLower(k)))) return false;
  return MUST_HINTS.some((k) => hay.includes(toAsciiLower(k)));
}

/* hash đơn giản cho id — tránh ký tự lạ trong key React */
function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `n${(h >>> 0).toString(36)}`;
}

/* ------------------------- RSS parsing ------------------------- */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function pickTag(block: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  if (!m) return "";
  let txt = m[1];
  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(txt);
  if (cdata) txt = cdata[1];
  return decodeEntities(
    txt
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function pickAttr(block: string, tag: string, attr: string): string {
  // Ảnh: <enclosure url="..."> hoặc <media:content url="...">
  const m = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i").exec(block);
  return m ? decodeEntities(m[1]) : "";
}

function parseDate(s: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function parseFeed(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const block of blocks) {
    const title = pickTag(block, "title");
    let link = pickTag(block, "link");
    if (!link) {
      // Atom: <link href="...">
      link = pickAttr(block, "link", "href");
    }
    if (!title || !link) continue;
    const summary =
      pickTag(block, "description") ||
      pickTag(block, "summary") ||
      pickTag(block, "content:encoded") ||
      pickTag(block, "content");
    const pub =
      parseDate(pickTag(block, "pubDate")) ||
      parseDate(pickTag(block, "published")) ||
      parseDate(pickTag(block, "updated")) ||
      parseDate(pickTag(block, "dc:date"));
    const image =
      pickAttr(block, "enclosure", "url") ||
      pickAttr(block, "media:content", "url") ||
      pickAttr(block, "media:thumbnail", "url") ||
      (/<img[^>]*\ssrc="([^"]+)"/i.exec(block)?.[1] ?? "");

    items.push({
      id: hashId(link),
      title,
      link,
      source: sourceName,
      publishedAt: pub,
      summary: summary.slice(0, 220),
      image: image && /^https?:\/\//i.test(image) ? image : undefined,
    });
  }
  return items;
}

/* Nạp song song tất cả nguồn — nguồn nào thành công dùng nguồn đó. */
/* Mọi nguồn RSS từ Google News đã lọc sẵn theo từ khóa Phật giáo;   */
/* nguồn khác áp thêm bộ lọc isBuddhistNews. */
export async function fetchBuddhistNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const xml = await fetchTextViaProxies(f.url);
      const parsed = parseFeed(xml, f.name);
      // Google News truy vấn đã lọc sẵn — giữ nguyên; nguồn khác lọc chặt
      const isCurated = f.name.startsWith("Google News");
      return isCurated ? parsed : parsed.filter((it) => isBuddhistNews(it.title, it.summary));
    }),
  );

  const merged: NewsItem[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const it of r.value) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      merged.push(it);
    }
  }
  merged.sort((a, b) => b.publishedAt - a.publishedAt);
  return merged;
}

/* Cache localStorage 15 phút + KHÔNG BAO GIỜ xóa cache cũ khi nạp lỗi */
const CACHE_KEY = "dharma-news-cache";
const CACHE_TTL = 15 * 60 * 1000; // 15 phút

export function loadNewsCache(): NewsItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { at: number; items: NewsItem[] };
    if (Date.now() - parsed.at > CACHE_TTL) return [];
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

/** Cache cũ (không giới hạn TTL) — dùng khi mọi nguồn đều lỗi. */
export function loadStaleNewsCache(): NewsItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: NewsItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveNewsCache(items: NewsItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: items.slice(0, 150) }));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}
