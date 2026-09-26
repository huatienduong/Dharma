/**
 * Service worker của Trợ lý Phật học.
 *
 * SỬA LỖI "TOÀN APP KHÔNG HOẠT ĐỘNG":
 *   Trước đây HTML điều hướng dùng stale-while-revalidate — trình duyệt nhận
 *   bản HTML ĐÃ CACHE (bản cũ, trỏ tới tên chunk của bản build cũ). Sau một
 *   lần deploy, bản HTML cũ đó trỏ tới các file đã bị xoá → trình duyệt báo
 *   "Failed to fetch dynamically imported module" và app không khởi động được.
 *   Tệ hơn: mỗi lần tải lại vẫn nhận đúng bản HTML hỏng đó, nên app chết hẳn
 *   dù máy chủ vẫn bình thường.
 *
 *   Nay: HTML luôn lấy từ MẠNG trước (network-first), cache chỉ dùng khi thật
 *   sự mất mạng. Nhờ vậy sau mỗi lần deploy, người dùng luôn chạy đúng bản
 *   mới, và bản cache cũ tự được dọn khi service worker kích hoạt.
 *
 *   Tài nguyên có tên HASH (/assets/xxx-[hash].js) vẫn CACHE-FIRST: chúng bất
 *   biến theo phiên bản nên tải lại là vô ích — giữ nguyên để app mở nhanh.
 */
const CACHE_NAME = "tro-ly-phat-hoc-v7-networkfirst";
const OFFLINE_FALLBACK = [
  "./",
  "./manifest.webmanifest",
  "./app-icon.svg",
];

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
      // Chỉ cache bản phục vụ được. Nếu lúc cài đặt mà trang chủ đang lỗi
      // (404/500) thì KHÔNG lưu bản lỗi vào cache — nếu lưu, khi mất mạng
      // người dùng sẽ thấy trang lỗi thay vì ứng dụng.
      .then(async (cache) => {
        await Promise.all(
          OFFLINE_FALLBACK.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "reload" });
              if (res.ok) await cache.put(url, res);
            } catch {
              /* mục này tạm không lấy được, bỏ qua */
            }
          }),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Dọn toàn bộ cache cũ (kể cả bản HTML hỏng) ngay khi phiên bản này chạy.
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

  // 2) HTML điều hướng → NETWORK-FIRST: luôn lấy bản mới khi có mạng.
  //    Chỉ dùng bản cache khi thật sự mất kết nối, để không bao giờ dính
  //    một bản HTML cũ làm app không khởi động được.
  //
  //    Khi máy chủ trả về trang lỗi (404/500 — ví dụ lúc nền tảng đang đẩy
  //    bản mới) thì TRẢ NGUYÊN trang lỗi, tuyệt đối không lấy HTML cũ trong
  //    cache: bản cũ đó khiến người dùng chạy code cũ mà tưởng đã được sửa,
  //    và mọi lỗi đã khắc phục đều "biến mất" mà không có manh mối.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            return response;
          }
          return response;
        } catch {
          const cached = await cache.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const shell = await cache.match("./");
          if (shell) return shell;
          throw new Error("Không có bản sao lưu cục bộ");
        }
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
