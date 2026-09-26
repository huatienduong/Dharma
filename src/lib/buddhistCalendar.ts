/**
 * PHẬT LỊCH — chuyển lịch dương sang âm lịch Phật giáo, tính trăng tròn /
 * trăng khuyết và gom các ngày lễ Phật giáo.
 *
 * Thuật toán âm lịch dùng bảng ngày tháng âm của các năm 1900–2100 (cùng
 * bảng chuẩn với lịch âm dùng phổ biến), nên độ chính xác tốt trong khoảng
 * đó. Năm hiển thị là năm Bảo Tháp (dương lịch + 543).
 */

/** Ngày/tháng âm của từng năm, 4 chữ số hex mỗi năm, 1900 → 2100. */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0,
  0x09ad0, 0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540,
  0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50,
  0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0,
  0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2,
  0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573,
  0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4,
  0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
  0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
  0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58,
  0x05ac0, 0x0ab60, 0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50,
  0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, 0x0a950, 0x0b4a0,
  0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260,
  0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0,
  0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
  0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370,
  0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0,
  0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50,
  0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0,
  0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520,
  0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
];

/** Tên 12 chi (tháng âm lịch), theo thứ tự mùa. */
export const LUNAR_MONTHS = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];

/** Năm Bảo Tháp = năm dương lịch + 543. */
export const BUDDHIST_YEAR_OFFSET = 543;

function lunarYearDays(y: number): number {
  const v = LUNAR_INFO[y - 1900] ?? 0x10000;
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += v & i ? 1 : 0;
  return sum + leapDays(y);
}

function leapDays(y: number): number {
  if (!leapMonth(y)) return 0;
  return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
}

/** Tháng nhuận của năm (0 = không nhuận, 1–12 = tháng nhuận). */
function leapMonth(y: number): number {
  return (LUNAR_INFO[y - 1900] ?? 0) & 0xf;
}

function monthDays(y: number, m: number): number {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}

export type LunarDate = {
  /** Ngày dương lịch (1–31). */
  solarDay: number;
  /** Tháng dương lịch (1–12). */
  solarMonth: number;
  /** Năm dương lịch. */
  solarYear: number;
  /** Ngày âm lịch (1–30). */
  day: number;
  /** Tháng âm lịch (1–12). */
  month: number;
  /** Tháng âm lịch này có phải tháng nhuận hay không. */
  isLeap: boolean;
  /** Năm âm lịch (dùng để so sánh). */
  lunarYear: number;
};

/** Đổi ngày dương (theo giờ 12:00 để tránh lệch ngày) sang ngày âm lịch. */
export function toLunar(date: Date): LunarDate {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const solarYear = d.getFullYear();
  const solarMonth = d.getMonth() + 1;
  const solarDay = d.getDate();

  if (solarYear < 1900 || solarYear > 2100) {
    // Ngoài phạm vi bảng âm lịch → vẫn trả ngày dương, tháng âm tạm 0.
    return {
      solarDay,
      solarMonth,
      solarYear,
      day: solarDay,
      month: 0,
      isLeap: false,
      lunarYear: solarYear,
    };
  }

  let offset =
    Math.floor(
      (Date.UTC(solarYear, solarMonth - 1, solarDay) -
        Date.UTC(1900, 0, 31)) /
        86400000,
    );
  let lunarYear = 1900;
  for (; lunarYear < 2101 && offset > 0; lunarYear++) {
    offset -= lunarYearDays(lunarYear);
  }
  if (offset < 0) {
    offset += lunarYearDays(--lunarYear);
  }

  const leap = leapMonth(lunarYear);
  let isLeap = false;
  let month = 1;
  for (; month < 13 && offset > 0; month++) {
    if (leap > 0 && month === leap + 1 && !isLeap) {
      month--;
      isLeap = true;
      offset -= leapDays(lunarYear);
    } else {
      offset -= monthDays(lunarYear, month);
    }
    if (isLeap && month === leap + 1) isLeap = false;
  }
  if (offset === 0 && leap > 0 && month === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      month--;
    }
  }
  if (offset < 0) {
    offset += monthDays(lunarYear, month);
  }

  return {
    solarDay,
    solarMonth,
    solarYear,
    day: offset + 1,
    month,
    isLeap,
    lunarYear,
  };
}

export type MoonPhase = "trăng khuyết" | "thượng nguyên" | "trung nguyên" | "trăng non";

/** Trạng thái trăng theo ngày âm lịch. */
export function moonPhase(l: LunarDate): MoonPhase {
  if (l.month === 0) return "trăng khuyết";
  if (l.day === 1) return "trăng non";
  if (l.day === 15) return "trung nguyên";
  if (l.day >= 25) return "trăng khuyết";
  return "thượng nguyên";
}

/** Một sự kiện trong ngày (lễ Phật giáo hoặc ngày lễ dương lịch). */
export type CalendarEvent = { name: string; note: string };

/** Lễ theo âm lịch (tháng, ngày). */
const LUNAR_EVENTS: { month: number; day: number; name: string; note: string }[] = [
  { month: 1, day: 1, name: "Tết Phật", note: "Lễ Vía Đức Thích Ca từ động tâm — mùng 1 tháng Giêng." },
  { month: 1, day: 15, name: "Rằm tháng Giêng", note: "Đêm rằm thượng nguyên, ngày hội đăng tụng của bảo tàng." },
  { month: 2, day: 15, name: "Rằm tháng Hai", note: "Ngày rằm thượng nguyên." },
  { month: 4, day: 8, name: "Khánh thành Đức Thập Nhị Đại Tôn Phật", note: "Mừng ngày Đức Thích Ca thành tôn đạo." },
  { month: 4, day: 15, name: "Đại lễ Phật Đản (Vesak)", note: "Ngày trọn đỉnh Tam hợp — Đức Phật đản, thành đạo, nhập diệt." },
  { month: 4, day: 15, name: "Đại lễ Phật", note: "Cúng dường, hoằng pháp, bố thí, trì kinh." },
  { month: 7, day: 15, name: "Đại lễ Vu Lan", note: "Mùng rằm tháng Bảy — ngày lễ Vu Lan." },
  { month: 7, day: 30, name: "Vu Lan hậu ngày", note: "Lễ cầu siêu cho cha mẹ và người đã mất." },
  { month: 8, day: 15, name: "Rằm tháng Tám", note: "Ngày rằm trung nguyên." },
  { month: 10, day: 15, name: "Rằm tháng Mười", note: "Ngày rằm trung nguyên." },
];

/** Lễ theo dương lịch (tháng, ngày). */
const SOLAR_EVENTS: { month: number; day: number; name: string; note: string }[] = [
  { month: 1, day: 1, name: "Tết Nguyên Đán", note: "Năm mới dương lịch." },
  { month: 3, day: 10, name: "Lễ hội Bảo Đại", note: "Ngày hội tưởng nhớ các bậc Đại tướng quân." },
  { month: 4, day: 30, name: "Ngày Thống nhất", note: "Kỷ niệm việc tổng hợp miền Nam trong một nước." },
  { month: 5, day: 1, name: "Ngày Quốc tế Lao động", note: "Nhớ ơn người lao động." },
  { month: 5, day: 5, name: "Tết Đoan Ngọ", note: "Lễ tế thần nông." },
  { month: 9, day: 2, name: "Quốc tịch", note: "Ngày Quốc khánh." },
];

/** Các sự kiện của một ngày âm lịch. */
export function eventsFor(l: LunarDate): CalendarEvent[] {
  if (l.month === 0) return [];
  const out: CalendarEvent[] = [];
  if (!l.isLeap) {
    for (const e of LUNAR_EVENTS) {
      if (e.month === l.month && e.day === l.day) {
        out.push({ name: e.name, note: e.note });
      }
    }
  }
  for (const e of SOLAR_EVENTS) {
    if (e.month === l.solarMonth && e.day === l.solarDay) {
      out.push({ name: e.name, note: e.note });
    }
  }
  return out;
}

/** Gợi ý thực tập theo ngày âm lịch (trai đàn, giới luật). */
export function practiceFor(l: LunarDate): string[] {
  if (l.month === 0) return [];
  const out: string[] = [];
  if ([4, 8, 15].includes(l.day)) {
    out.push("Ngày chay trai: giới luật thật trọn vẹn theo ngày Bố Tát.");
  }
  if (l.day === 1 || l.day === 30) {
    out.push("Ngày Vô Lượng: tụng kinh, sám hối, hồi hướng cho vong linh.");
  }
  if (l.day === 15 && out.length === 0) {
    out.push("Trăng tròn đầy: thời khóa tụng kinh thật viên mãn.");
  }
  return out;
}

/** "15 tháng 4 âm lịch" → chuỗi đọc gọn. */
export function lunarDateText(l: LunarDate): string {
  if (l.month === 0) return "Ngoài phạm vi lịch âm 1900–2100";
  const name = LUNAR_MONTHS[l.month - 1] ?? "";
  return `Ngày ${l.day} tháng ${l.month}${l.isLeap ? " nhuận" : ""} (${name}) năm Bảo Tháp ${
    l.lunarYear + BUDDHIST_YEAR_OFFSET
  }`;
}
