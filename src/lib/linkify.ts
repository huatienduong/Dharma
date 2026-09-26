/**
 * BIẾN ĐƯỜNG DẪN TRONG TIN NHẮN THÀNH LINK BẤM ĐƯỢC.
 *
 * VÌ SAO LÀM BẰNG DOM THAY VÌ SỬA COMPONENT:
 *   Khung chat hiển thị chữ thuần (AI được huấn luyện không dùng markdown) và
 *   phần hiển thị tin nhắn nằm ngoài vùng có thể sửa an toàn. Thay vì đụng
 *   vào đó, ta bọc các đoạn chữ chứa đường dẫn bằng thẻ <a> sau khi render —
 *   cùng cách nhiều ứng dụng chat làm link hoá văn bản thuần. Khi React vẽ
 *   lại đoạn text đó, thẻ <a> biến mất và MutationObserver bọc lại, nên luôn
 *   tự phục hồi.
 *
 * AN TOÀN: chỉ nhận http/https, luôn mở tab mới với rel="noopener noreferrer",
 * bỏ qua thẻ <a> sẵn có và mọi vùng nhập liệu.
 */

const URL_RE = /https?:\/\/[^\s<>"'()[\]]{4,300}/g;

/** Vùng không được đụng tới. */
const SKIP = "a, script, style, code, pre, textarea, input, [contenteditable], button, #vly-toolbar-root";

/** Bọc mọi đoạn chứa đường dẫn bên trong `root` thành thẻ <a>. */
function linkifyWithin(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.match(URL_RE)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    targets.push(current as Text);
    current = walker.nextNode();
  }
  for (const textNode of targets) {
    if (!textNode.parentNode) continue;
    const value = textNode.nodeValue ?? "";
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    for (const match of value.matchAll(URL_RE)) {
      const url = match[0];
      const start = match.index ?? 0;
      if (start > lastIndex) {
        frag.appendChild(document.createTextNode(value.slice(lastIndex, start)));
      }
      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer nofollow";
      a.className = "ds-inline-link";
      frag.appendChild(a);
      lastIndex = start + url.length;
    }
    if (lastIndex === 0) continue;
    if (lastIndex < value.length) {
      frag.appendChild(document.createTextNode(value.slice(lastIndex)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

/** Cài đặt một lần khi ứng dụng khởi động. */
export function installLinkify(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if ((window as unknown as { __dsLinkify?: boolean }).__dsLinkify) return;
  (window as unknown as { __dsLinkify?: boolean }).__dsLinkify = true;

  const scan = () => {
    try {
      linkifyWithin(document.body);
    } catch {
      /* không quan trọng */
    }
  };
  const boot = () => window.setTimeout(scan, 500);
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });
  window.setTimeout(scan, 2000);

  // Bọc <a> cho đường dẫn mới xuất hiện sau mỗi tin nhắn.
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const added of Array.from(record.addedNodes)) {
        if (added.nodeType === Node.TEXT_NODE) {
          if (added.parentElement) linkifyWithin(added.parentElement);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          linkifyWithin(added);
        }
      }
    }
  });
  const start = () =>
    observer.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
