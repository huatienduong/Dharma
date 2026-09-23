import { fetchTextViaProxies } from "@/lib/proxyFetch";

/* ------------------------------------------------------------------ */
/* TIN TỨC PHẬT GIÁO — tổng hợp RSS từ báo/chuyên trang Phật giáo       */
/* Chỉ đọc (GET công khai), không cần khóa.                             */
/* Chiến lược:                                                          */
/*  1. Báo Phật giáo có ẢNH sẵn trong RSS (Giác Ngộ, Phật giáo VN).     */
/*  2. Google News RSS — luôn có tin MỚI NHẤT (ảnh nạp bổ sung sau).    */
/*  3. Cache localStorage 10 phút + nạp nền làm mới (không bao giờ      */
/*     hiển thị dữ liệu cũ mà không tự cập nhật).                       */
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

/* Nguồn RSS công khai — báo Phật giáo trước (có ảnh), Google News bổ sung */
const FEEDS: Array<{ name: string; url: string; curated?: boolean }> = [
  { name: "Giác Ngộ Online", url: "https://giacngo.vn/rss/home.rss" },
  { name: "Phật giáo Việt Nam", url: "https://phatgiao.vn/feed" },
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=Ph%E1%BA%ADt+gi%C3%A1o&hl=vi&gl=VN&ceid=VN:vi",
    curated: true,
  },
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=Ph%E1%BA%ADt+gi%C3%A1o+Nguy%C3%AAn+th%E1%BB%A7y+OR+Theravada&hl=vi&gl=VN&ceid=VN:vi",
    curated: true,
  },
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=Gi%C3%A1o+h%E1%BB%99i+Ph%E1%BA%ADt+gi%C3%A1o&hl=vi&gl=VN&ceid=VN:vi",
    curated: true,
  },
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

function isBlocked(title: string, summary: string): boolean {
  const hay = toAsciiLower(`${title} ${summary}`);
  return BLOCKED.some((k) => hay.includes(toAsciiLower(k)));
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
  const m = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, "i").exec(block);
  return m ? decodeEntities(m[1]) : "";
}

/** Tên nguồn phát hành thật (Google News ghi trong <source>), có URL dự phòng. */
function pickSourceName(block: string, fallback: string): string {
  const name = pickTag(block, "source");
  if (name) return name;
  return fallback;
}

function parseDate(s: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

/** Tìm ảnh trong item: enclosure / media:* / thẻ <img> trong mô tả. */
function pickImage(block: string): string {
  const candidates = [
    pickAttr(block, "enclosure", "url"),
    pickAttr(block, "media:content", "url"),
    pickAttr(block, "media:thumbnail", "url"),
    pickAttr(block, "image", "href"),
    /<img[^>]*\ssrc="([^"]+)"/i.exec(block)?.[1] ?? "",
    /<img[^>]*\ssrc='([^']+)'/i.exec(block)?.[1] ?? "",
  ];
  for (const c of candidates) {
    const url = decodeEntities((c ?? "").trim());
    if (/^https?:\/\//i.test(url)) return url;
  }
  return "";
}

function parseFeed(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  for (const block of blocks) {
    const title = pickTag(block, "title");
    let link = pickTag(block, "link");
    if (!link) link = pickAttr(block, "link", "href");
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
    const image = pickImage(block);

    items.push({
      id: hashId(link),
      title,
      link,
      source: pickSourceName(block, sourceName),
      publishedAt: pub,
      summary: summary.slice(0, 220),
      image: image || undefined,
    });
  }
  return items;
}

/* Nạp song song tất cả nguồn — nguồn nào thành công dùng nguồn đó. */
export async function fetchBuddhistNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const xml = await fetchTextViaProxies(f.url);
      const parsed = parseFeed(xml, f.name);
      // Mọi nguồn đều lọc ngoài chủ đề; Google News đã truy vấn theo chủ đề
      // nên chỉ cần chặn từ khóa rõ ràng ngoài Phật giáo.
      return parsed.filter((it) =>
        f.curated
          ? !isBlocked(it.title, it.summary)
          : isBuddhistNews(it.title, it.summary),
      );
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

/* ------------------------- Ảnh minh họa ------------------------- */
/* RSS của một số nguồn (Google News) không kèm ảnh → nạp og:image      */
/* từ chính bài viết. Cache lại theo id để lần sau hiện tức thì.        */

const IMG_CACHE_KEY = "dharma-news-images";

function loadImgCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMG_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveImgCache(map: Record<string, string>) {
  try {
    const entries = Object.entries(map).slice(-300);
    localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* bộ nhớ đầy — bỏ qua */
  }
}

function extractOgImage(html: string): string {
  const m =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i.exec(
      html,
    ) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(
      html,
    );
  const url = decodeEntities((m?.[1] ?? "").trim());
  return /^https?:\/\//i.test(url) ? url : "";
}

/**
 * Nạp ảnh minh họa cho các tin chưa có ảnh (song song 4 luồng).
 * `onImage` được gọi mỗi khi tìm được ảnh → giao diện cập nhật dần.
 */
export async function enrichNewsImages(
  items: NewsItem[],
  onImage: (id: string, url: string) => void,
): Promise<void> {
  const cache = loadImgCache();
  const targets = items.filter((it) => !it.image).slice(0, 30);
  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const it = targets[cursor++];
      const cached = cache[it.id];
      if (cached) {
        onImage(it.id, cached);
        continue;
      }
      try {
        const html = await fetchTextViaProxies(it.link, 8_000);
        const url = extractOgImage(html);
        if (url) {
          cache[it.id] = url;
          onImage(it.id, url);
        }
      } catch {
        /* không có ảnh — dùng ảnh bìa theo chủ đề ở giao diện */
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  saveImgCache(cache);
}

/* Cache localStorage 10 phút + KHÔNG BAO GIỜ xóa cache cũ khi nạp lỗi */
const CACHE_KEY = "dharma-news-cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

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
