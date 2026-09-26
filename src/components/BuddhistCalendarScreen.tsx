/**
 * MÀN PHẬT LỊCH — ngày âm lịch Phật giáo, trạng thái trăng, ngày lễ và gợi ý
 * thực tập. Mở từ nút lịch ở góc trên phải.
 *
 * Cách đọc: thẻ đầu là ngày đang chọn (mặc định hôm nay) với ngày âm viết lớn,
 * bên dưới là lễ trong ngày, gợi ý thực tập, lễ sắp tới và lịch tháng — trong
 * lịch tháng thì số lớn là ngày DƯƠNG, số nhỏ bên dưới là ngày ÂM.
 */

import {
  BUDDHIST_YEAR_OFFSET,
  LUNAR_MONTHS,
  eventsFor,
  isVegetarianDay,
  moonPhase,
  practiceFor,
  toLunar,
  upcomingEvents,
  type LunarDate,
} from "@/lib/buddhistCalendar";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sprout,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

/** Cột lịch: thứ Hai → Chủ Nhật. */
const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEK_NAMES = [
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
  "Chủ Nhật",
];

function dayKey(l: LunarDate): string {
  return `${l.solarYear}-${l.solarMonth}-${l.solarDay}`;
}

function dateOf(l: LunarDate): Date {
  return new Date(l.solarYear, l.solarMonth - 1, l.solarDay);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Các ô của một tháng dương lịch, ô trống cho những ngày trước ngày 1. */
function monthCells(year: number, month: number): (LunarDate | null)[] {
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells: (LunarDate | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push(toLunar(new Date(year, month - 1, d)));
  }
  return cells;
}

/** Vòng trăng vẽ bằng CSS theo trạng thái trăng trong tháng âm. */
function MoonGlyph({ phase }: { phase: ReturnType<typeof moonPhase> }) {
  if (phase === "trăng non") {
    return (
      <span
        aria-hidden
        className="block h-9 w-9 rounded-full border border-border/80 bg-primary/20"
      />
    );
  }
  if (phase === "trung nguyên") {
    return (
      <span
        aria-hidden
        className="block h-9 w-9 rounded-full border border-primary/40 bg-primary/25 shadow-[0_0_16px_rgba(180,140,80,0.35)]"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative block h-9 w-9 rounded-full border border-border/80",
        phase === "trăng khuyết" ? "bg-muted/60" : "bg-primary/15",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 w-1/2",
          phase === "trăng khuyết"
            ? "right-0 rounded-r-full bg-background"
            : "left-0 rounded-l-full bg-primary/30",
        )}
      />
    </span>
  );
}

/** Một khối nhỏ: tiêu đề + nội dung, dùng chung cho các mục của màn hình. */
function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-3 rounded-3xl border border-border/60 bg-card/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function BuddhistCalendarScreen({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => new Date(), []);

  const [selected, setSelected] = useState(today);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const todayLunar = useMemo(() => toLunar(today), [today]);
  const pickedLunar = useMemo(() => toLunar(selected), [selected]);
  const pickedEvents = useMemo(() => eventsFor(pickedLunar), [pickedLunar]);
  const pickedPractice = useMemo(() => practiceFor(pickedLunar), [pickedLunar]);
  const nextFeasts = useMemo(() => upcomingEvents(todayLunar, 3), [todayLunar]);
  const cells = useMemo(() => monthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const isToday = sameDay(selected, today);
  const isThisMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  /** Chuyển tháng đang xem (lịch tháng bám theo dương lịch). */
  const moveMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  /** Bấm một ô ngày: chọn ngày đó và nhảy sang tháng đang chứa nó. */
  const pickDay = (l: LunarDate) => {
    setSelected(dateOf(l));
    setViewYear(l.solarYear);
    setViewMonth(l.solarMonth);
  };

  const goToday = () => {
    setSelected(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* ---------- Thanh trên ---------- */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent"
          aria-label="Quay lại khung chat"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          Phật lịch
        </p>
        <span className="shrink-0 text-[12px] text-muted-foreground">
          Bảo Tháp {pickedLunar.lunarYear + BUDDHIST_YEAR_OFFSET}
        </span>
      </div>

      {/* ---------- Nội dung ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3 sm:px-4">
        {/* Ngày đang chọn: ngày âm lớn + ngày dương + trạng thái trăng */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Âm lịch
              </p>
              <p className="mt-1 text-[28px] font-bold leading-none">
                {pickedLunar.day}/{pickedLunar.month}
                {pickedLunar.isLeap && (
                  <span className="text-[15px] font-semibold"> nhuận</span>
                )}
              </p>
              <p className="mt-1.5 text-[13px] text-foreground/90">
                Tháng {pickedLunar.month} {LUNAR_MONTHS[pickedLunar.month - 1]}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {WEEK_NAMES[selected.getDay()]} ·{" "}
                {pickedLunar.solarDay}/{pickedLunar.solarMonth}/
                {pickedLunar.solarYear} (dương)
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <MoonGlyph phase={moonPhase(pickedLunar)} />
              <span className="text-[12px] text-muted-foreground">
                {moonPhase(pickedLunar)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[12px]",
                isToday
                  ? "border-primary/50 bg-primary/15 font-medium text-foreground"
                  : "border-border/60 text-muted-foreground",
              )}
            >
              {isToday
                ? "Hôm nay"
                : `${pickedLunar.solarDay}/${pickedLunar.solarMonth}`}
            </span>
            {isVegetarianDay(pickedLunar) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/15 px-2.5 py-1 text-[12px] font-medium text-foreground">
                <Sprout className="h-3.5 w-3.5 text-primary" />
                Ngày ăn chay
              </span>
            )}
          </div>
        </section>

        {/* Lễ trong ngày */}
        <Section title="Lễ trong ngày">
          {pickedEvents.length > 0 ? (
            <ul className="space-y-2">
              {pickedEvents.map((e) => (
                <li
                  key={e.name}
                  className={cn(
                    "rounded-2xl border px-3 py-2",
                    e.major
                      ? "border-primary/50 bg-primary/15"
                      : "border-border/60 bg-background/40",
                  )}
                >
                  <p className="text-[14px] font-semibold text-foreground">
                    {e.name}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {e.note}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Ngày thường, không có ngày lễ.
            </p>
          )}
        </Section>

        {/* Gợi ý thực tập */}
        {pickedPractice.length > 0 && (
          <Section title="Gợi ý thực tập">
            <ul className="space-y-1.5">
              {pickedPractice.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/90"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Lễ sắp tới */}
        {nextFeasts.length > 0 && (
          <Section title="Lễ sắp tới">
            <ul className="space-y-1.5">
              {nextFeasts.map((e) => (
                <li
                  key={`${e.lunar}-${e.name}`}
                  className="flex items-baseline gap-2 text-[13px]"
                >
                  <span className="w-[62px] shrink-0 text-[12px] text-muted-foreground">
                    {e.date.getDate()}/{e.date.getMonth() + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-foreground">
                    {e.name}
                    <span className="text-muted-foreground"> · {e.lunar}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---------- Lịch tháng ---------- */}
        <section className="mt-3 rounded-3xl border border-border/60 bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-[15px] font-semibold">
              Tháng {viewMonth} năm {viewYear}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            {WEEK_LABELS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Số lớn là ngày dương, số nhỏ bên dưới là ngày âm */}
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((l, i) => {
              if (!l) return <span key={`blank-${i}`} />;
              const events = eventsFor(l);
              const isMajor = events.some((e) => e.major);
              const isCellToday = dayKey(l) === dayKey(todayLunar);
              const isCellPicked = dayKey(l) === dayKey(pickedLunar);
              return (
                <button
                  key={dayKey(l)}
                  type="button"
                  onClick={() => pickDay(l)}
                  aria-label={`Ngày ${l.solarDay}/${l.solarMonth}, âm lịch ${l.day}/${l.month}`}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-2xl border transition",
                    isCellPicked
                      ? "border-primary/70 bg-primary/20"
                      : isMajor
                        ? "border-primary/40 bg-primary/15"
                        : events.length > 0
                          ? "border-primary/25 bg-primary/10"
                          : "border-transparent hover:bg-accent",
                    isCellToday && !isCellPicked && "ring-1 ring-primary/60",
                  )}
                >
                  <span className="text-[14px] font-semibold leading-none text-foreground">
                    {l.solarDay}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-[10px] leading-none",
                      isMajor || events.length > 0
                        ? "text-primary"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {l.day === 1
                      ? `${LUNAR_MONTHS[l.month - 1] ?? ""}${l.isLeap ? " nh" : ""}`
                      : isMajor
                        ? `${l.day} ★`
                        : events.length > 0
                          ? `${l.day} •`
                          : l.day}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[12px] leading-snug text-muted-foreground">
              Số lớn: ngày dương · số nhỏ: ngày âm · ★ lễ lớn · • có lễ
            </p>
            {(!isThisMonth || !isToday) && (
              <button
                type="button"
                onClick={goToday}
                className="rounded-full border border-border/70 px-3 py-1 text-[12px] text-foreground transition hover:bg-accent"
              >
                Về hôm nay
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
