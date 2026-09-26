/**
 * MÀN PHẬT LỊCH — xem ngày âm lịch Phật giáo, trạng thái trăng, ngày lễ và
 * gợi ý thực tập. Mở từ nút lịch ở góc trên phải.
 *
 * Năm hiển thị là năm Bảo Tháp (dương lịch + 543). Lịch tháng bám theo dương
 * lịch để dễ đối chiếu, mỗi ô ghi ngày âm lịch và tô đậm ngày có lễ.
 */

import {
  BUDDHIST_YEAR_OFFSET,
  LUNAR_MONTHS,
  eventsFor,
  isVegetarianDay,
  lunarDateText,
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
import { useMemo, useState } from "react";

/** Thứ tự cột: thứ Hai → Chủ Nhật. */
const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(l: LunarDate): string {
  return `${l.solarYear}-${l.solarMonth}-${l.solarDay}`;
}

/** Các ô của tháng dương lịch, có ô trống cho ngày trước ngày 1. */
function monthCells(year: number, month: number): (LunarDate | null)[] {
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells: (LunarDate | null)[] = Array.from(
    { length: lead },
    () => null,
  );
  for (let d = 1; d <= days; d++) {
    cells.push(toLunar(new Date(year, month - 1, d)));
  }
  return cells;
}

/** Vòng trăng vẽ bằng CSS, tùy trạng thái trăng trong tháng âm. */
function MoonGlyph({ phase }: { phase: ReturnType<typeof moonPhase> }) {
  if (phase === "trăng non") {
    return (
      <span
        aria-hidden
        className="block h-8 w-8 rounded-full border border-border/80 bg-primary/20"
      />
    );
  }
  if (phase === "trung nguyên") {
    return (
      <span
        aria-hidden
        className="block h-8 w-8 rounded-full border border-primary/40 bg-primary/25 shadow-[0_0_16px_rgba(180,140,80,0.35)]"
      />
    );
  }
  if (phase === "trăng khuyết") {
    return (
      <span
        aria-hidden
        className="relative block h-8 w-8 rounded-full border border-border/80 bg-muted/60"
      >
        <span className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-background" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="relative block h-8 w-8 rounded-full border border-border/80 bg-primary/15"
    >
      <span className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-primary/30" />
    </span>
  );
}

export function BuddhistCalendarScreen({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => new Date(), []);
  const todayLunar = useMemo(() => toLunar(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState(today);

  const selectedLunar = useMemo(() => toLunar(selected), [selected]);
  const selectedEvents = useMemo(() => eventsFor(selectedLunar), [selectedLunar]);
  const selectedPractice = useMemo(
    () => practiceFor(selectedLunar),
    [selectedLunar],
  );
  const isSelectedToday = sameDay(selected, today);
  const isViewThisMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  const cells = useMemo(() => monthCells(viewYear, viewMonth), [
    viewYear,
    viewMonth,
  ]);

  /** Ba ngày lễ Phật giáo sắp tới kể từ hôm nay. */
  const nextFeasts = useMemo(() => upcomingEvents(todayLunar, 3), [todayLunar]);

  /** Lùi hoặc tiến một tháng dương lịch. */
  const moveMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
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
        <span className="shrink-0 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[12px] text-muted-foreground">
          Năm Bảo Tháp {todayLunar.lunarYear + BUDDHIST_YEAR_OFFSET}
        </span>
      </div>

      {/* ---------- Nội dung ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3 sm:px-4">
        {/* Hôm nay: ngày âm + trạng thái trăng */}
        <section className="rounded-3xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                Hôm nay
              </p>
              <p className="mt-1 text-[20px] font-bold leading-tight">
                {todayLunar.day}/{todayLunar.month}
                {todayLunar.isLeap ? " nhuận" : ""}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {lunarDateText(todayLunar)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <MoonGlyph phase={moonPhase(todayLunar)} />
              <span className="text-[12px] text-muted-foreground">
                {moonPhase(todayLunar)}
              </span>
            </div>
          </div>
          {isVegetarianDay(todayLunar) && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[12px] text-foreground">
              <Sprout className="h-3.5 w-3.5 text-primary" />
              Hôm nay là ngày ăn chay
            </p>
          )}
        </section>

        {/* Ngày đang chọn: lễ + gợi ý thực tập */}
        <section className="mt-3 rounded-3xl border border-border/60 bg-card/60 p-4">
          <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            {isSelectedToday ? "Hôm nay" : `Ngày ${selected.getDate()}`}
          </p>
          <p className="mt-1 text-[15px] font-semibold">
            {lunarDateText(selectedLunar)}
          </p>

          {selectedEvents.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((e) => (
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
            <p className="mt-2 text-[13px] text-muted-foreground">
              Ngày thường, không có ngày lễ Phật giáo.
            </p>
          )}

          {selectedPractice.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {selectedPractice.map((p) => (
                <p
                  key={p}
                  className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/90"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{p}</span>
                </p>
              ))}
            </div>
          )}
        </section>

        {/* Lễ Phật giáo sắp tới */}
        {nextFeasts.length > 0 && (
          <section className="mt-3 rounded-3xl border border-border/60 bg-card/60 p-4">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Lễ sắp tới
            </p>
            <ul className="mt-2 space-y-1.5">
              {nextFeasts.map((e) => (
                <li key={`${e.lunar}-${e.name}`} className="flex items-baseline gap-2">
                  <span className="w-[74px] shrink-0 text-[12px] text-muted-foreground">
                    {e.date.getDate()}/{e.date.getMonth() + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-foreground">
                    {e.name}
                    <span className="text-muted-foreground"> ({e.lunar})</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
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

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((l, i) => {
              if (!l) return <span key={`blank-${i}`} />;
              const events = eventsFor(l);
              const isMajor = events.some((e) => e.major);
              const isToday = dayKey(l) === dayKey(todayLunar);
              const isSelected = dayKey(l) === dayKey(selectedLunar);
              return (
                <button
                  key={dayKey(l)}
                  type="button"
                  onClick={() => setSelected(new Date(l.solarYear, l.solarMonth - 1, l.solarDay))}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-2xl border text-[13px] transition",
                    isMajor
                      ? "border-primary/50 bg-primary/15 font-bold text-foreground"
                      : events.length > 0
                        ? "border-primary/40 bg-primary/10 font-semibold text-foreground"
                        : "border-transparent text-foreground/85 hover:bg-accent",
                    isSelected && "border-primary/70 bg-primary/20",
                    isToday && "ring-1 ring-primary/60",
                  )}
                >
                  <span className="leading-none">{l.day}</span>
                  <span
                    className={cn(
                      "mt-0.5 text-[10px] leading-none",
                      events.length > 0
                        ? "text-primary"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {l.day === 1
                      ? `${LUNAR_MONTHS[l.month - 1] ?? ""}${l.isLeap ? " nhuận" : ""}`
                      : isMajor
                        ? "★"
                        : events.length > 0
                          ? "•"
                          : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-[12px] text-muted-foreground">
              Chữ nhỏ dưới ngày 1 là tên tháng âm; ★ là ngày lễ lớn, • là ngày
              có lễ.
            </span>
            {!isViewThisMonth && (
              <button
                type="button"
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth() + 1);
                  setSelected(today);
                }}
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
