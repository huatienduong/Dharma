/**
 * THEO DÕI BÀN PHÍM ẢO — sửa lỗi bàn phím che/đẩy giao diện.
 *
 * VÌ SAO CẦN:
 * Thanh tiêu đề và khung nhập đều dùng `position: fixed`, tức chúng bám
 * theo LAYOUT viewport. Khi bàn phím ảo bật, trình duyệt thu nhỏ VISUAL
 * viewport và (trên iOS) đẩy cả layout viewport lên trên:
 *   • thanh tiêu đề trượt lên sát mép trên / bị che bởi mép màn hình;
 *   • khung nhập chui xuống dưới bàn phím, không thấy ô gõ nữa.
 *
 * `window.visualViewport` cho biết chính xác vùng nhìn được, nên chỉ cần
 * dịch hai khối fixed theo:
 *   • thanh tiêu đề: +`offsetTop`  → bám đỉnh vùng nhìn thật;
 *   • khung nhập: −`keyboardInset` → nằm ngay trên bàn phím.
 *
 * Trả về `height = 0` khi trình duyệt không hỗ trợ `visualViewport` (khi đó
 * giữ nguyên bố cục cũ, không áp gì).
 */

import { useEffect, useState } from "react";

export type VisualViewportState = {
  /** Khoảng cách từ đỉnh layout viewport xuống đỉnh vùng nhìn thật. */
  offsetTop: number;
  /** Chiều cao vùng nhìn thật KHI BÀN PHÍM ĐANG MỞ; 0 = không có bàn phím. */
  height: number;
  /** Chiều cao bàn phím ảo đang chiếm, đã tính cả phần bị cuộn. */
  keyboardInset: number;
};

/**
 * Ngưỡng nhận là “có bàn phím ảo”.
 *
 * BẮT BUỘC có ngưỡng này: `innerHeight` và `visualViewport.height` cũng lệch
 * nhau vài chục pixel khi thanh địa chỉ trình duyệt tự ẩn/hiện — không có
 * ngưỡng thì khung nhập bị nhảy lên từng lần cuộn trang. Bàn phím thật thì
 * chiếm hơn 120px, nên ngưỡng này loại được cả hai trường hợp.
 */
const KEYBOARD_MIN_PX = 120;

function readViewport(): VisualViewportState {
  const none = { offsetTop: 0, height: 0, keyboardInset: 0 };
  if (typeof window === "undefined") return none;
  const vv = window.visualViewport;
  if (!vv) return none;
  const rawInset = Math.round(
    window.innerHeight - vv.height - vv.offsetTop,
  );
  // Bàn phím chưa mở → trả về số 0 hết, bố cục giữ nguyên như cũ.
  if (rawInset < KEYBOARD_MIN_PX) {
    return { offsetTop: Math.round(vv.offsetTop), height: 0, keyboardInset: 0 };
  }
  return {
    offsetTop: Math.round(vv.offsetTop),
    height: Math.round(vv.height),
    keyboardInset: rawInset,
  };
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(readViewport);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setState(readViewport());
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
