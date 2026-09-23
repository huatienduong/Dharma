// Lịch Phật giáo — thuật toán âm lịch Việt Nam (chuẩn Surya Siddhanta, múi giờ +7)
// dựa trên thuật toán tính âm lịch của Hồ Ngọc Đức, kèm Can Chi, Phật lịch,
// các ngày lễ hội Phật giáo và ngày Uposatha (truyền thống Theravāda).

const TIMEZONE = 7; // Việt Nam

function INT(d: number): number {
  return Math.floor(d);
}

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    INT((153 * m + 2) / 5) +
    365 * y +
    INT(y / 4) -
    INT(y / 100) +
    INT(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number): { d: number; m: number; y: number } {
  let a, b, c, d, e, m, day, month, year;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  d = INT((4 * c + 3) / 1461);
  e = c - INT((1461 * d) / 4);
  m = INT((5 * e + 2) / 153);
  day = e - INT((153 * m + 2) / 5) + 1;
  month = m + 3 - 12 * INT(m / 10);
  year = b * 100 + d - 4800 + INT(m / 10);
  return { d: day, m: month, y: year };
}

function NewMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 =
    C1 -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M));
  C1 =
    C1 -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 =
    C1 +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat;
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  return Jd1 + C1 - deltat;
}

function SunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.4665 + 36000.7698 * T + 0.0003032 * T2 + 0.00000048 * T * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * INT(L / (Math.PI * 2));
  return L;
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  return INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return INT(NewMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc != last && i < 14);
  return i - 1;
}

export type LunarDate = {
  day: number;
  month: number; // 1..12, 13 nếu tháng nhuận
  year: number; // năm âm lịch
  isLeapMonth: boolean;
  jd: number;
};

function solarToLunar(dd: number, mm: number, yy: number): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, TIMEZONE);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, TIMEZONE);
  }
  let a11 = getLunarMonth11(yy - 1, TIMEZONE);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy - 1;
    a11 = getLunarMonth11(yy - 2, TIMEZONE);
    b11 = getLunarMonth11(yy - 1, TIMEZONE);
  } else {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, TIMEZONE);
    b11 = getLunarMonth11(yy, TIMEZONE);
  }
  let lunarMonth = 1;
  let diff = INT((monthStart - a11) / 29);
  let lunarLeap = 0;
  if (diff >= 12) {
    diff = diff - 1;
  }
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, TIMEZONE);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff - leapMonthDiff + 1;
      if (diff == leapMonthDiff) {
        lunarLeap = 1;
      }
    } else {
      lunarMonth = diff + 1;
    }
  } else {
    lunarMonth = diff + 1;
  }
  return {
    day: dayNumber - monthStart + 1,
    month: lunarMonth,
    year: lunarYear,
    isLeapMonth: lunarLeap === 1,
    jd: dayNumber,
  };
}

/* ------------------------------------------------------------------ */
/* Can Chi                                                             */
/* ------------------------------------------------------------------ */

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CHI_CON = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];

export function canChiDay(jd: number): string {
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

export function canChiMonth(lunarMonth: number, lunarYear: number): string {
  const canIdx = (lunarYear * 12 + lunarMonth + 3) % 10;
  const chiIdx = (lunarMonth + 1) % 12;
  return `${CAN[canIdx]} ${CHI[chiIdx]}`;
}

export function canChiYear(lunarYear: number): string {
  const canIdx = (lunarYear + 6) % 10;
  const chiIdx = (lunarYear + 8) % 12;
  return `${CAN[canIdx]} ${CHI[chiIdx]} (${CHI_CON[chiIdx]})`;
}

/* ------------------------------------------------------------------ */
/* Phật lịch (Buddhist Era)                                            */
/* ------------------------------------------------------------------ */

// Phật lịch (B.E.) theo truyền thống Việt Nam — do Hòa thượng Thích
// Thiện Siếu đề xuất và Đại hội Phật giáo Tịnh giới Trung Việt 1957 thông
// qua: Phật lịch = dương lịch + 544 cho TOÀN BỘ năm dương lịch (năm 0
// bắt đầu từ năm Phật nhập diệt −623). Năm 2026 dương lịch → B.E. 2570.
export function buddhistEra(lunar: LunarDate): number {
  return lunar.year + 544;
}

/* ------------------------------------------------------------------ */
/* Lễ hội Phật giáo theo âm lịch                                       */
/* ------------------------------------------------------------------ */

export type Festival = {
  lunarDay: number;
  lunarMonth: number;
  name: string;
  note: string;
  major?: boolean;
};

export const FESTIVALS: Festival[] = [
  {
    lunarDay: 1,
    lunarMonth: 1,
    name: "Tết Nguyên Đán",
    note: "Đầu năm mới âm lịch — lễ dâng sao, cầu an, hồi hướng phước lành.",
  },
  {
    lunarDay: 15,
    lunarMonth: 1,
    name: "Rằm tháng Giêng (Tết Nguyên Tiêu)",
    note: "«Lễ Phật cả năm không bằng Rằm tháng Giêng» — ngày chùa mở cửa đón khách lễ Phật dâng sao.",
  },
  {
    lunarDay: 19,
    lunarMonth: 2,
    name: "Lễ vía Quán Thế Âm",
    note: "Ngày kỷ niệm Đức Quán Thế Âm Bồ-tát (theo truyền thống Đại thừa tại Việt Nam).",
  },
  {
    lunarDay: 15,
    lunarMonth: 2,
    name: "Lễ Phật Nhiên Đăng",
    note: "Kỷ niệm Đức Phật Nhiên Đăng — vị Phật thọ ký cho Bồ-tát trong quá khứ.",
  },
  {
    lunarDay: 8,
    lunarMonth: 4,
    name: "Lễ Phật Đản",
    note: "Ngày Đức Phật đản sanh tại vườn Lâm-tì-ni — lễ hội trọng đại nhất của Phật giáo.",
    major: true,
  },
  {
    lunarDay: 15,
    lunarMonth: 4,
    name: "Đại lễ Vesak (Phật Đản Theravāda)",
    note: "Ngày Đức Phật đản sanh, thành đạo và nhập Niết-bàn (truyền thống Theravāda cùng kỷ niệm ba sự kiện trong một ngày rằm).",
    major: true,
  },
  {
    lunarDay: 15,
    lunarMonth: 7,
    name: "Lễ Vu Lan - Báo hiếu",
    note: "Ngày báo hiếu cha mẹ, cúng dường Tăng-già kết hạ (Pāvāraṇā) — «Ullambana».",
    major: true,
  },
  {
    lunarDay: 30,
    lunarMonth: 7,
    name: "Lễ vía Địa Tạng Bồ-tát",
    note: "Kỷ niệm Ngài Địa Tạng — «chơn dụng» hồi hướng cho chúng sanh trong cõi âm.",
  },
  {
    lunarDay: 15,
    lunarMonth: 8,
    name: "Tết Trung Thu",
    note: "Rằm tháng Tám — lễ về đoàn viên, trẻ em rước đèn.",
  },
  {
    lunarDay: 15,
    lunarMonth: 10,
    name: "Lễ Hạ Nguyên",
    note: "Ngày hồi hướng công đức, cầu an cho gia đạo (truyền thống Bắc tông).",
  },
  {
    lunarDay: 8,
    lunarMonth: 12,
    name: "Lễ Thành Đạo",
    note: "Ngày Đức Phật thành đạo dưới cội Bồ-đề (theo truyền thống Bắc tông; Theravāda kỷ niệm vào Vesak).",
  },
  {
    lunarDay: 23,
    lunarMonth: 12,
    name: "Lễ Táo Quân",
    note: "Ông Công ông Táo về trời — ngày tổng kết năm của dân gian.",
  },
];

/* ------------------------------------------------------------------ */
/* Uposatha — ngày trì giới Theravāda (theo pha trăng)                 */
/* ------------------------------------------------------------------ */

// Uposatha rơi vào: trăng non (ngày 1), trăng tròn (15), và hai ngày
// tứ phần (8 và 23). Truyền thống Theravāda giữ 4 ngày Uposatha/tháng.
export function isUposatha(lunar: LunarDate): boolean {
  return (
    lunar.day === 1 || lunar.day === 8 || lunar.day === 15 || lunar.day === 23
  );
}

export function uposathaLabel(lunar: LunarDate): string | null {
  switch (lunar.day) {
    case 1:
      return "Uposatha — Trăng non (trì tám giới)";
    case 8:
      return "Uposatha — Tứ phần trước (trì tám giới)";
    case 15:
      return "Uposatha — Trăng tròn (Pātimokkha)";
    case 23:
      return "Uposatha — Tứ phần sau (trì tám giới)";
    default:
      return null;
  }
}

// Tra ngày Uposatha kế tiếp từ một ngày dương lịch
export function nextUposatha(dd: number, mm: number, yy: number): {
  solar: { d: number; m: number; y: number };
  lunar: LunarDate;
  label: string;
} | null {
  let lunar = solarToLunar(dd, mm, yy);
  let jd = lunar.jd;
  let guard = 0;
  while (guard++ < 60) {
    if (isUposatha(lunar) && guard > 1) {
      const solar = jdToDate(jd);
      return {
        solar,
        lunar,
        label: uposathaLabel(lunar) ?? "Uposatha",
      };
    }
    if (isUposatha(lunar) && guard === 1) {
      // nếu hôm nay là uposatha thì vẫn trả về hôm nay
      const solar = jdToDate(jd);
      return {
        solar,
        lunar,
        label: uposathaLabel(lunar) ?? "Uposatha",
      };
    }
    jd++;
    lunar = lunarFromJd(jd);
  }
  return null;
}

// Chuyển jd sang LunarDate (hàm phụ nội bộ)
function lunarFromJd(jd: number): LunarDate {
  const solar = jdToDate(jd);
  return solarToLunar(solar.d, solar.m, solar.y);
}

/* ------------------------------------------------------------------ */
/* Ghi chú theo ngày                                                   */
/* ------------------------------------------------------------------ */

export type DayNote = {
  lunar: LunarDate;
  festival?: Festival;
  uposatha?: string;
  canChi: string;
  phatLich: number;
};

export function dayNote(dd: number, mm: number, yy: number): DayNote {
  const lunar = solarToLunar(dd, mm, yy);
  const festival = FESTIVALS.find(
    (f) => f.lunarDay === lunar.day && f.lunarMonth === lunar.month,
  );
  const uposatha = uposathaLabel(lunar) ?? undefined;
  return {
    lunar,
    festival,
    uposatha,
    canChi: canChiDay(lunar.jd),
    phatLich: buddhistEra(lunar),
  };
}

export type LunarMonthPreview = {
  solar: { d: number; m: number; y: number };
  lunarDay: number;
  isFestival: boolean;
  festivalName?: string;
  isUposatha: boolean;
  isToday: boolean;
};

// Tạo lưới tháng âm lịch: tất cả các ngày dương lịch thuộc về một tháng âm lịch
export function lunarMonthGrid(
  lunarMonth: number,
  lunarYear: number,
  today?: Date,
): LunarMonthPreview[] {
  // Tìm ngày dương lịch đầu tiên của tháng âm lịch
  // Ước lượng: ngày 15 tháng 4 âm lịch ≈ tháng 5 dương lịch
  const startJdApprox = jdFromDate(1, 6, lunarYear);
  // Tìm mốc: quét ngược tìm ngày mà lunar.month == lunarMonth
  let jd = startJdApprox;
  let guard = 0;
  let cur = lunarFromJd(jd);
  while ((cur.month !== lunarMonth || cur.isLeapMonth) && guard++ < 400) {
    jd -= 5;
    cur = lunarFromJd(jd);
  }
  // Quay lại đầu tháng
  while (cur.month === lunarMonth && cur.day > 1) {
    jd--;
    cur = lunarFromJd(jd);
  }
  // Tạo lưới
  const rows: LunarMonthPreview[] = [];
  guard = 0;
  while (guard++ < 40) {
    cur = lunarFromJd(jd);
    if (cur.month !== lunarMonth || cur.isLeapMonth) break;
    const solar = jdToDate(jd);
    const f = FESTIVALS.find(
      (x) => x.lunarDay === cur.day && x.lunarMonth === lunarMonth,
    );
    rows.push({
      solar,
      lunarDay: cur.day,
      isFestival: !!f,
      festivalName: f?.name,
      isUposatha: isUposatha(cur),
      isToday: today
        ? today.getDate() === solar.d &&
          today.getMonth() + 1 === solar.m &&
          today.getFullYear() === solar.y
        : false,
    });
    jd++;
  }
  return rows;
}

export function lunarToSolarText(lunar: LunarDate): string {
  return `${lunar.day}/${lunar.month}${lunar.isLeapMonth ? " (nhuận)" : ""} âm lịch`;
}
