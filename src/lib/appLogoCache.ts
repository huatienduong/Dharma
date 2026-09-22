/**
 * Cache logo ứng dụng phía CLIENT (không nằm trong src/convex — thư mục đó
 * chỉ được export các hàm Convex).
 * Ghi URL logo vào localStorage để:
 *   • màn boot tĩnh trong index.html hiển thị logo ngay từ lần mở sau,
 *   • favicon cập nhật logo chính thức,
 *   • fallback chuyển route hiển thị logo thay vì chữ loading.
 */
export function cacheLogoClientSide(url: string) {
  try {
    if (localStorage.getItem("dharma-logo-url") !== url) {
      localStorage.setItem("dharma-logo-url", url);
    }
    const fav = document.getElementById("app-favicon");
    if (fav) fav.setAttribute("href", url);
  } catch {
    /* môi trường không có localStorage — bỏ qua */
  }
}
