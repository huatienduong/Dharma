/**
 * Service worker của Trợ lý Phật học.
 *
 * MỤC TIÊU: mở app phải ra ngay, không chờ mạng.
 *  • Tài nguyên build có tên có HASH (/assets/xxx-[hash].js|.css) → bất biến
 *    theo phiên bản, nên CACHE-FIRST: lần mở thứ hai trở đi không tải lại.
 *    Đây là phần nặng nhất của app (~700KB) nên đây là thay đổi lớn nhất.
 *  • HTML điều hướng → STALE-WHILE-REVALIDATE: hiện bản đang cache ngay,
 *    tải bản mới ở nền cho lần sau. Nhờ vậy bản cũ vẫn mở được khi mạng yếu.
 *  • Mọi thứ khác cùng origin → network-first như trước, có cache dự phòng.
 */
const CACHE_NAME = "tro-ly-phat-hoc-v6-fast";
const APP_SHELL = ["./", "./manifest.webmanifest", "./app-icon.svg"];

/** Tài nguyên do Vite build, tên có hash → không bao giờ đổi trong phiên bản. */
function isImmutableAsset(url) {
  return (
    url.pathname.includes("/assets/") &&
    /\.(js|css|woff2?|ttf|png|jpe?g|svg|webp|avif)$/i.test(url.pathname)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll hỏng cả nhóm nếu một mục lỗi → tải từng mục cho chắc.
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1) Asset có hash → cache-first, mạng chỉ để dự phòng.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          throw new Error("Không có bản sao lưu cục bộ");
        }
      }),
    );
    return;
  }

  // 2) HTML điều hướng → stale-while-revalidate: hiện ngay bản đang có.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request, { ignoreSearch: true });
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        if (cached) return cached;
        const fresh = await network;
        if (fresh) return fresh;
        const shell = await cache.match("./");
        if (shell) return shell;
        throw new Error("Không có bản sao lưu cục bộ");
      })(),
    );
    return;
  }

  // 3) Còn lại (asset chưa hash hóa, biểu tượng…) → network-first, có dự phòng.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Không có bản sao lưu cục bộ");
      }),
  );
});
