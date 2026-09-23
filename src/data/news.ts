import { fetchTextViaProxies } from "@/lib/proxyFetch";

/* ------------------------------------------------------------------ */
/* TIN TỨC PHẬT GIÁO — tổng hợp RSS từ báo/chuyên trang Phật giáo VN    */
/* Chỉ đọc (GET công khai), không cần khóa; lọc chặt chủ đề Phật giáo.  */
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

/* Nguồn RSS công khai của các báo/chuyên trang Phật giáo tiếng Việt */
const FEEDS: Array<{ name: string; url: string }> = [
  { name: "Giáo hội Phật giáo Việt Nam", url: "https://giadinh.net.vn/rss/giao-duc.rss" },
  { name: "Báo Phật giáo Việt Nam", url: "https://baoangiang.com/rss/home.rss" },
  { name: "Thư viện Hoa Sen", url: "https://thuvienhoasen.org/rss/all" },
  { name: "Báo An Ninh Thủ Đô — Đạo Phật", url: "https://anninhthudo.vn/rss/374.antv" },
];

/* Từ khóa lọc: chỉ giữ bài thuộc Phật giáo */
const MUST_HINTS = [
  "phật", "phap", "pháp", "dhamma", "dharma", "theravada", "theravāda", "nguyên thủy",
  "kinh", "chùa", "tăng", "ni", "tăng ni", "giáo hội", "giao hoi", "vesak", "phật đản",
  "uposatha", "bổn sư", "bon su", "tịnh xá", "tinh xa", "thiền", "niết bàn", "bát quan trai",
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

function pickTag(block: string, tag: string): string {
  // Lấy nội dung của tag đầu tiên trong block (hỗ trợ CDATA)
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  if (!m) return "";
  let txt = m[1];
  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(txt);
  if (cdata) txt = cdata[1];
  return txt
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function pickAttr(block: string, tag: string, attr: string): string {
  // Ảnh: <enclosure url="..."> hoặc <media:content url="...">
  const m = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i").exec(block);
  return m ? m[1] : "";
}

function parseDate(s: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function parseFeed(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  // RSS <item> hoặc Atom <entry>
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const block of blocks) {
    const title = pickTag(block, "title");
    let link = pickTag(block, "link");
    if (!link) {
      // Atom: <link href="...">
      link = pickAttr(block, "link", "href");
    }
    if (!title || !link) continue;
    // Bỏ qua link có anchor chỉ dẫn thẻ (Atom style có thể trả rỗng)
    const summary = pickTag(block, "description") || pickTag(block, "summary") || pickTag(block, "content:encoded") || pickTag(block, "content");
    const pub =
      parseDate(pickTag(block, "pubDate")) ||
      parseDate(pickTag(block, "published")) ||
      parseDate(pickTag(block, "updated")) ||
      parseDate(pickTag(block, "dc:date"));
    const image =
      pickAttr(block, "enclosure", "url") ||
      pickAttr(block, "media:content", "url") ||
      pickAttr(block, "media:thumbnail", "url") ||
      // rơi về ảnh đầu tiên trong HTML description
      (/<img[^>]*\ssrc="([^"]+)"/i.exec(block)?.[1] ?? "");

    if (!isBuddhistNews(title, summary)) continue;

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

/* Nạp song song tất cả nguồn, gộp + sắp mới nhất trước */
export async function fetchBuddhistNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const xml = await fetchTextViaProxies(f.url);
      return parseFeed(xml, f.name);
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

/* Cache phiên (sessionStorage) để quay lại trang không phải nạp lại */
const CACHE_KEY = "dharma-news-cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

export function loadNewsCache(): NewsItem[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { at: number; items: NewsItem[] };
    if (Date.now() - parsed.at > CACHE_TTL) return [];
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveNewsCache(items: NewsItem[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: items.slice(0, 120) }));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}
