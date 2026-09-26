/**
 * MÀN CHÀO TRANG CHỦ — chỉ hiện khi hội thoại còn trống.
 *
 * Chỉ còn MỘT hình ảnh Đức Phật Thích Ca Mâu Ni theo phong cách Phật giáo
 * Theravāda (tượng Lan Na, thếp bụi quán) và tên hiện bên dưới.
 *
 * Ảnh: "Seated Buddha from Lan-Na, Bangkok Museum" — Wikimedia Commons,
 * CC BY-SA 4.0 (hiện dòng ghi nguồn ở dưới ảnh).
 *
 * Vì ảnh tải từ Internet nên PHẢI có đường lui: nếu mạng chặn ảnh, hiện
 * avatar robot sẵn có thay vì để trống màn hình.
 *
 * RẤT QUAN TRỌNG: khối này nằm trong vùng `overflow-hidden` của trang chat
 * nên phải dùng `h-full` + `max-h` cho ảnh, tuyệt đối không sinh nội dung
 * dài hơn tầm nhìn (sẽ tạo thanh cuộn — đúng thứ cần tránh).
 */

import { BotAvatar } from "@/components/BotAvatar";
import { useState } from "react";

/** Ảnh tượng Phật Lan Na (thếp bụi quán) — bản 960px, ~115 KB. */
const BUDDHA_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Seated_Buddha_from_Lan-Na._Bangkok_Museum%2C_b118.jpg/960px-Seated_Buddha_from_Lan-Na._Bangkok_Museum%2C_b118.jpg";

export function HomeWelcome() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden sm:gap-4">
      {imgFailed ? (
        /* Mạng chặn ảnh: vẫn có hình đại diện Trợ lý, không để trống màn hình. */
        <BotAvatar size="lg" glow className="size-28 shadow-lg sm:size-36" />
      ) : (
        <img
          src={BUDDHA_IMG}
          alt="Tượng Đức Phật Thích Ca Mâu Ni, phong cách Phật giáo Theravāda"
          onError={() => setImgFailed(true)}
          referrerPolicy="no-referrer"
          draggable={false}
          className="max-h-[min(46vh,320px)] w-auto max-w-[70vw] rounded-3xl object-contain opacity-95 shadow-[0_18px_50px_-24px_rgba(111,66,38,0.75)] sm:max-h-[min(52vh,420px)]"
        />
      )}

      <div className="shrink-0 text-center">
        <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">
          Đức Phật Thích Ca Mâu Ni
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-[13px]">
          Giáo lý Theravāda — Thế Tôn từ bi
        </p>
        <p className="mt-2 text-[9px] leading-tight text-muted-foreground/60">
          Ảnh: Wikimedia Commons — “Seated Buddha from Lan-Na, Bangkok Museum”, CC BY-SA 4.0
        </p>
      </div>
    </div>
  );
}
