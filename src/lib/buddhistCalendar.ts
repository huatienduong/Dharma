/**
 * PHẬT LỊCH — âm lịch Phật giáo theo cách tính của lịch Việt Nam.
 *
 * Ngày âm được tính bằng thiên văn thật, không dùng bảng tra cứu dự đoán:
 *   • Tháng âm bắt đầu từ ngày (giờ VN, UTC+7) có thời điểm TRĂNG NON.
 *   • Tháng 11 là tháng âm chứa ngày BẢn nguyên đông (mặt trời đi qua 270°).
 *   • Nếu giữa hai tháng 11 có 13 tháng, tháng ĐẦU TIÊN không chứa múi giối
 *     chí (mặt trời đi qua bội số 30°) là tháng nhuận.
 * Thời gian trăng non theo Meeus (Astronomical Algorithms, ch. 49), mặt trời
 * theo ch. 25, hiệu chỉnh ΔT theo Espenak–Meeus. Vì vậy ngày âm chính xác
 * tới từng ngày trong khoảng 1900–2100, kể cả các tháng nhuận.
 *
 * Năm hiển thị là năm Bảo Tháp (năm dương lịch + 543).
 *
 * Lưu ý: ngày đầu tháng (ngày trăng non) luôn chính xác. Phần đánh số tháng dùng
 * đúng quy tắc của lịch Việt Nam nên khớp với lịch in ấn trong những năm gần
 * đây; ở vài năm lịch sử xa (ví dụ 1975, 1984–1985) các múi giối chí rơi sát
 * ranh giới ngày nên số tháng có thể lệch so với lịch in.
 */

/** Múi giờ Việt Nam: UTC+7. */
const TZ = 7 / 24;
const RAD = Math.PI / 180;

/** Năm Bảo Tháp = năm dương lịch + 543. */
export const BUDDHIST_YEAR_OFFSET = 543;

/** Tên 12 chi, theo thứ tự tháng âm lịch. */
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

function norm360(d: number): number {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

function sin(deg: number): number {
  return Math.sin(deg * RAD);
}

/** Hiệu chỉnh ΔT (giây) theo bộ đa thức Espenak & Meeus. */
function deltaTSeconds(year: number): number {
  let t: number;
  let u: number;
  if (year < 1900) {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (year < 1920) {
    t = year - 1900;
    return (
      -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4
    );
  }
  if (year < 1941) {
    t = year - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3;
  }
  if (year < 1961) {
    t = year - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + t ** 3 / 2547;
  }
  if (year < 1986) {
    t = year - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - t ** 3 / 718;
  }
  if (year < 2005) {
    t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year < 2050) {
    t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (year < 2150) {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - year);
  }
  u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

/** Julian Day (theo giờ UT) của thời điểm trăng non thứ k tính từ trăng non 2000-01-06. */
function newMoonJD(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  let jde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T2 -
    0.00000015 * T3 +
    0.00000000073 * T4;

  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = norm360(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3);
  const Mp = norm360(
    201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4,
  );
  const F = norm360(
    160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4,
  );
  const O = norm360(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3);

  jde +=
    -0.4072 * sin(Mp) +
    0.17241 * E * sin(M) +
    0.01608 * sin(2 * Mp) +
    0.01039 * sin(2 * F) +
    0.00739 * E * sin(Mp - M) -
    0.00514 * E * sin(Mp + M) +
    0.00208 * E * E * sin(2 * M) -
    0.00111 * sin(Mp - 2 * F) -
    0.00057 * sin(Mp + 2 * F) +
    0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) +
    0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) -
    0.00024 * E * sin(2 * Mp - M) -
    0.00017 * sin(O) -
    0.00007 * sin(Mp + 2 * M) +
    0.00004 * sin(2 * Mp - 2 * F) +
    0.00004 * sin(3 * M) +
    0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) -
    0.00003 * sin(Mp + M + 2 * F) +
    0.00003 * sin(Mp - M + 2 * F) -
    0.00002 * sin(Mp - M - 2 * F) -
    0.00002 * sin(3 * Mp + M) +
    0.00002 * sin(4 * Mp);

  jde +=
    0.000325 * sin(299.77 + 0.107408 * k - 0.009173 * T2) +
    0.000165 * sin(251.88 + 0.016321 * k) +
    0.000164 * sin(251.83 + 26.651886 * k) +
    0.000126 * sin(349.42 + 36.412478 * k) +
    0.00011 * sin(84.66 + 18.206239 * k) +
    0.000062 * sin(141.74 + 53.303771 * k) +
    0.00006 * sin(207.14 + 2.453732 * k) +
    0.000056 * sin(154.84 + 7.30686 * k) +
    0.000047 * sin(34.52 + 27.261239 * k) +
    0.000042 * sin(207.19 + 0.121824 * k) +
    0.00004 * sin(291.34 + 1.844379 * k) +
    0.000037 * sin(161.72 + 24.198154 * k) +
    0.000035 * sin(239.56 + 25.513099 * k) +
    0.000023 * sin(331.55 + 3.592518 * k);

  // JDE đang tính theo giờ động (TD), chuyển sang giờ quốc tế (UT).
  const year = 2000 + k / 12.3685;
  return jde - deltaTSeconds(year) / 86400;
}

/** Kinh độ mặt trời thấy (độ) tại một thời điểm UT, theo Meeus ch. 25. */
function sunLongitude(jdUT: number): number {
  const T = (jdUT - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const omega = 125.04 - 1934.136 * T;
  return norm360(L0 + C - 0.00569 - 0.00478 * sin(omega));
}

/** Số ngày lịch (kiểu JDN) của thời điểm có Julian Day cho trước, theo giờ VN. */
function dayNumberOf(jdUT: number): number {
  return Math.floor(jdUT + TZ + 0.5);
}

/** Julian Day tại 0 giờ (theo giờ VN) của ngày có số thứ tự `n`. */
function localMidnightJD(n: number): number {
  return n - 0.5 - TZ;
}

const newMoonDayCache = new Map<number, number>();

/** Số ngày (giờ VN) bắt đầu của tháng âm thứ k. */
function newMoonDay(k: number): number {
  const hit = newMoonDayCache.get(k);
  if (hit !== undefined) return hit;
  const value = dayNumberOf(newMoonJD(k));
  newMoonDayCache.set(k, value);
  return value;
}

/** Số k gần nhất có ngày trăng non <= dayNumber. */
function lunationAtOrBefore(dayNumber: number): number {
  let lo = -1400;
  let hi = 1600;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (newMoonDay(mid) <= dayNumber) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const solsticeDayCache = new Map<number, number>();

/** Ngày (giờ VN) chứa bản nguyên đông (mặt trời đạt 270°) của năm dương `y`. */
function winterSolsticeDay(y: number): number {
  const hit = solsticeDayCache.get(y);
  if (hit !== undefined) return hit;
  // Bản nguyên đông luôn rơi vào khoảng 21–23 tháng 12.
  let jd = Date.UTC(y, 11, 21.5) / 86400000 + 2440587.5;
  for (let i = 0; i < 12; i++) {
    const diff = ((sunLongitude(jd) - 270 + 540) % 360) - 180;
    jd += (-diff / 0.9856) * 0.5;
  }
  const value = dayNumberOf(jd);
  solsticeDayCache.set(y, value);
  return value;
}

/** Tháng âm có chứa múi giối chí (mặt trời đi qua bội số của 30°) hay không. */
function hasMajorTerm(startDay: number, endDay: number): boolean {
  const from = sunLongitude(localMidnightJD(startDay));
  let to = sunLongitude(localMidnightJD(endDay));
  if (to < from) to += 360;
  // Trong tháng âm mặt trời đi được chưa tới 30°, nên chỉ có tối đa một lần
  // đi qua bội số của 30°; so sánh số nguyên để biết có đi qua hay không.
  return Math.floor(to / 30) > Math.floor(from / 30);
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

type LunarMonth = {
  /** Số ngày (giờ VN) của ngày 1 tháng âm. */
  start: number;
  /** Số ngày dài của tháng (29 hoặc 30). */
  length: number;
  month: number;
  isLeap: boolean;
  lunarYear: number;
};

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

let monthIndex: LunarMonth[] | null = null;
let monthLookup: Map<number, { month: LunarMonth; day: number }> | null = null;

/** Dựng bảng các tháng âm từ năm 1900 đến năm 2100 (chỉ tính một lần). */
function buildIndex(): void {
  const months: LunarMonth[] = [];

  for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
    const kStart = lunationAtOrBefore(winterSolsticeDay(y));
    // Số tháng âm nằm giữa hai tháng 11 liên tiếp: 12 năm thường, 13 năm nhuận.
    const count = lunationAtOrBefore(winterSolsticeDay(y + 1)) - kStart;

    // Năm nhuận: tháng ĐẦU TIÊN trong chu kỳ không chứa múi giối chí là tháng
    // nhuận; nếu mọi tháng đều có múi chí thì tháng nhuận là tháng cuối cùng.
    let leapAt = -1;
    if (count === 13) {
      leapAt = count - 1;
      for (let i = 1; i < count; i++) {
        if (!hasMajorTerm(newMoonDay(kStart + i), newMoonDay(kStart + i + 1))) {
          leapAt = i;
          break;
        }
      }
    }

    let monthNum = 11;
    // Tháng 11 và tháng 12 mở đầu chu kỳ, thuộc năm âm lịch bắt đầu trong năm
    // dương y; từ tháng 1 trở đi là năm âm lịch kế tiếp.
    let lunarYear = y;
    for (let i = 0; i < count; i++) {
      const s = newMoonDay(kStart + i);
      const e = newMoonDay(kStart + i + 1);
      const isLeap = i === leapAt;
      // Tháng nhuận mang số của tháng ngay trước nó.
      const num = isLeap ? ((monthNum + 10) % 12) + 1 : monthNum;
      months.push({ start: s, length: e - s, month: num, isLeap, lunarYear });
      // Tháng kế tiếp; tháng 1 mở đầu một năm âm lịch mới.
      if (!isLeap) {
        monthNum = (monthNum % 12) + 1;
        if (monthNum === 1) lunarYear += 1;
      }
    }
  }

  const lookup = new Map<number, { month: LunarMonth; day: number }>();
  for (const m of months) {
    for (let d = 0; d < m.length; d++) {
      lookup.set(m.start + d, { month: m, day: d + 1 });
    }
  }

  monthIndex = months;
  monthLookup = lookup;
}

/** Đổi ngày dương (đọc theo giờ VN) sang ngày âm lịch. */
export function toLunar(date: Date): LunarDate {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const base: LunarDate = {
    solarDay: day,
    solarMonth: month,
    solarYear: year,
    day,
    month: 0,
    isLeap: false,
    lunarYear: year,
  };

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return base;
  }
  if (!monthLookup) buildIndex();

  // Số ngày lịch (JDN) của ngày dương đang xét.
  const jdn = Math.floor(Date.UTC(year, month - 1, day) / 86400000) + 2440588;
  const found = monthLookup?.get(jdn);
  if (!found) return base;

  return {
    solarDay: day,
    solarMonth: month,
    solarYear: year,
    day: found.day,
    month: found.month.month,
    isLeap: found.month.isLeap,
    lunarYear: found.month.lunarYear,
  };
}

/** Một ngày lệ sắp tới, kèm ngày dương lịch tương ứng. */
export type UpcomingEvent = CalendarEvent & {
  /** Ngày dương lịch (đọc theo giờ Việt Nam). */
  date: Date;
  /** Ngày âm lịch, ví dụ "15/4". */
  lunar: string;
};

/** Các ngày lệ Phật giáo sắp tới, tính từ ngày đưa vào. */
export function upcomingEvents(l: LunarDate, count = 3): UpcomingEvent[] {
  if (l.month === 0 || !monthIndex) return [];
  const jdn = Math.floor(Date.UTC(l.solarYear, l.solarMonth - 1, l.solarDay) / 86400000) + 2440588;
  const months = monthIndex;
  let idx = months.findIndex((m) => m.start <= jdn && jdn < m.start + m.length);
  if (idx < 0) return [];

  const out: UpcomingEvent[] = [];
  for (let i = idx; i < months.length && out.length < count; i++) {
    const m = months[i];
    for (const e of LUNAR_EVENTS) {
      if (e.day > m.length) continue;
      if (e.month !== m.month) continue;
      const start = m.start + e.day - 1;
      if (start < jdn) continue;
      const d = new Date((start - 2440588) * 86400000);
      out.push({
        name: e.name,
        note: e.note,
        major: e.major,
        date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        lunar: `${e.day}/${e.month}`,
      });
      if (out.length >= count) break;
    }
  }
  return out;
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
export type CalendarEvent = {
  name: string;
  note: string;
  /** Lễ trọng trong Phật giáo (được tô đậm hơn, gợi ý dự lễ). */
  major?: boolean;
};

/** Lễ theo âm lịch (tháng, ngày). */
const LUNAR_EVENTS: (CalendarEvent & { month: number; day: number })[] = [
  {
    month: 1,
    day: 1,
    name: "Tết Phật — Vía Đức Thập Nhị Đại Tôn Phật",
    note: "Mừng ngày Đức Thích Ca từ động tâm, thành tôn đạo. Cúng dường, thắp hương, ăn chay và ngồi thiền đầu năm.",
    major: true,
  },
  {
    month: 1,
    day: 15,
    name: "Rằm tháng Giêng",
    note: "Đêm rằm thượng nguyên đầu năm, hội đăng tụng của bảo tàng Phật giáo.",
  },
  {
    month: 2,
    day: 15,
    name: "Rằm tháng Hai",
    note: "Ngày rằm thượng nguyên, thời khóa tụng kinh thật viên mãn.",
  },
  {
    month: 3,
    day: 15,
    name: "Rằm tháng Ba",
    note: "Ngày rằm thượng nguyên, tụng kinh và sám hối.",
  },
  {
    month: 4,
    day: 8,
    name: "Khánh thành Đức Thập Nhị Đại Tôn Phật",
    note: "Mừng ngày Đức Thích Ca thành tôn đạo, hành lễ khoản đài và phổ biến giáo pháp.",
    major: true,
  },
  {
    month: 4,
    day: 15,
    name: "Đại lễ Phật Đản (Vesak)",
    note: "Ngày trọn đỉnh Tam hợp: Đức Phật đản, thành đạo và nhập diệt. Cúng dường, hoằng pháp, bố thí, trì kinh, thọ Phật.",
    major: true,
  },
  {
    month: 5,
    day: 15,
    name: "Rằm tháng Năm",
    note: "Ngày rằm thượng nguyên.",
  },
  {
    month: 6,
    day: 15,
    name: "Rằm tháng Sáu",
    note: "Ngày rằm thượng nguyên, tụng kinh hằng ngày trong tháng.",
  },
  {
    month: 7,
    day: 15,
    name: "Đại lễ Vu Lan",
    note: "Mùng rằm tháng Bảy: ngày lễ Vu Lan báo hiếu, làm đoan quý, dâng hoa, thỉnh an cư và hồi hướng cho người đã mất.",
    major: true,
  },
  {
    month: 8,
    day: 15,
    name: "Lễ Hạ chân đoan (Trung thu)",
    note: "Rằm tháng Tám: ngày trăng tròn đẹp nhất trong năm, dâng bánh và tắc thuốc cho người bệnh, kể chuyện chăn tay chăn quạt.",
  },
  {
    month: 9,
    day: 15,
    name: "Rằm tháng Chín",
    note: "Ngày rằm thượng nguyên.",
  },
  {
    month: 10,
    day: 15,
    name: "Rằm tháng Mười",
    note: "Ngày rằm thượng nguyên.",
  },
  {
    month: 11,
    day: 15,
    name: "Rằm tháng Một",
    note: "Ngày rằm thượng nguyên, tụng kinh và hồi hướng cho vong linh.",
  },
  {
    month: 12,
    day: 15,
    name: "Rằm tháng Chạp",
    note: "Ngày rằm thượng nguyên cuối năm âm lịch.",
  },
];

/** Lễ theo dương lịch (tháng, ngày). */
const SOLAR_EVENTS: (CalendarEvent & { month: number; day: number })[] = [
  {
    month: 1,
    day: 1,
    name: "Tết Nguyên Đán",
    note: "Năm mới dương lịch. Chư Tăng trong nhiều nơi dùng ngày này làm ngày Tết Phật theo lịch quốc tế.",
  },
  {
    month: 3,
    day: 10,
    name: "Lễ hội Bảo Đại",
    note: "Ngày hội tưởng nhớ các bậc Đại tướng quân.",
  },
  {
    month: 4,
    day: 30,
    name: "Ngày Thống nhất",
    note: "Kỷ niệm việc tổng hợp miền Nam trong một nước.",
  },
  {
    month: 5,
    day: 1,
    name: "Ngày Quốc tế Lao động",
    note: "Nhớ ơn người lao động.",
  },
  {
    month: 5,
    day: 5,
    name: "Tết Đoan Ngọ",
    note: "Lễ tế thần nông.",
  },
  {
    month: 9,
    day: 2,
    name: "Quốc khánh",
    note: "Ngày Quốc tịch.",
  },
];

/** Các sự kiện của một ngày âm lịch. */
export function eventsFor(l: LunarDate): CalendarEvent[] {
  if (l.month === 0) return [];
  const out: CalendarEvent[] = [];
  if (!l.isLeap) {
    for (const e of LUNAR_EVENTS) {
      if (e.month === l.month && e.day === l.day) {
        out.push({ name: e.name, note: e.note, major: e.major });
      }
    }
  }
  for (const e of SOLAR_EVENTS) {
    if (e.month === l.solarMonth && e.day === l.solarDay) {
      out.push({ name: e.name, note: e.note, major: e.major });
    }
  }
  return out;
}

/** Ngày ăn chay theo tục lệ: mùng 1, 15 và ngày cuối tháng. */
export function isVegetarianDay(l: LunarDate): boolean {
  if (l.month === 0) return false;
  if (l.day === 4 || l.day === 8 || l.day === 15) return true;
  if (l.day === 1) return true;
  return l.day === 29 || l.day === 30;
}

/** Gợi ý thực tập theo ngày âm lịch (trai đàn, thập trai, tụng kinh). */
export function practiceFor(l: LunarDate): string[] {
  if (l.month === 0) return [];
  const out: string[] = [];

  if (l.day === 4 || l.day === 8 || l.day === 15) {
    out.push("Ngày chay trai: giữ giới luật thật trọn vẹn theo ngày Bố Tát.");
  }
  if (l.day === 8 || l.day === 15) {
    out.push("Ngày trai đàn: Phật tử tụng kinh, ngồi thiền và làm việc bồ thê trong tinh thần từ bi.");
  }
  if (l.day === 1 || l.day === 29 || l.day === 30) {
    out.push("Ngày Vô Lượng: tụng kinh, sám hối và hồi hướng cho vong linh.");
  }
  if (l.day === 15) {
    out.push("Rằm thượng nguyên: thời khóa tụng kinh, tọa thiền và phát tâm hồi hướng.");
  }
  if (!isVegetarianDay(l)) {
    out.push("Ngày thường: giữ năm giới, tỉnh thức trong ăn mặc và lời nói.");
  }

  return out;
}
