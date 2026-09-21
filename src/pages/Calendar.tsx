import { AppShell } from "@/components/AppShell";
import {
  dayNote,
  FESTIVALS,
  isUposatha,
  nextUposatha,
} from "@/data/pcalendar";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
  "Tháng Một",
  "Tháng Hai",
  "Tháng Ba",
  "Tháng Tư",
  "Tháng Năm",
  "Tháng Sáu",
  "Tháng Bảy",
  "Tháng Tám",
  "Tháng Chín",
  "Tháng Mười",
  "Tháng Mười Một",
  "Tháng Mười Hai",
];

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=CN
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [selected, setSelected] = useState<Date>(today);

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);

  const selectedNote = useMemo(() => {
    const d = selected.getDate();
    const m = selected.getMonth() + 1;
    const y = selected.getFullYear();
    return dayNote(d, m, y);
  }, [selected]);

  const nextUpo = useMemo(
    () => nextUposatha(today.getDate(), today.getMonth() + 1, today.getFullYear()),
    [today],
  );

  const upcoming = useMemo(() => {
    return FESTIVALS.filter((f) => f.major).slice(0, 4);
  }, []);

  const beYear = view.m >= 4 ? view.y - 543 : view.y - 544;

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setSelected(today);
  };

  const selectedWeekday = selected.toLocaleDateString("vi-VN", {
    weekday: "long",
  });

  return (
    <AppShell
      title="Lịch Phật giáo"
      subtitle="Âm lịch · Can Chi · Phật lịch · lễ hội · ngày Uposatha"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_19rem]">
        {/* ---------- Lưới lịch ---------- */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
          {/* Header tháng */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-r from-gold/10 via-transparent to-transparent px-4 py-4">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="rounded-full border border-border/60 bg-background/60 p-2 transition hover:bg-accent"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold tracking-tight sm:text-lg">
                {MONTH_NAMES[view.m]}{" "}
                <span className="text-muted-foreground">{view.y}</span>
              </h2>
              <span className="mt-0.5 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                Phật lịch B.E. {beYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => shift(1)}
              className="rounded-full border border-border/60 bg-background/60 p-2 transition hover:bg-accent"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3 sm:p-4">
            {/* Nút hôm nay */}
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={goToday}
                className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
              >
                <CalendarDays className="h-3 w-3" /> Hôm nay
              </button>
            </div>

            {/* Tiêu đề thứ */}
            <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                    i === 0 ? "text-red-500/90" : "text-muted-foreground",
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Lưới ngày */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={i} />;
                const note = dayNote(
                  date.getDate(),
                  date.getMonth() + 1,
                  date.getFullYear(),
                );
                const isToday = sameDay(date, today);
                const isSel = sameDay(date, selected);
                const isSunday = date.getDay() === 0;
                const upo = isUposatha(note.lunar);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(date)}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-center transition",
                      isSel
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-transparent hover:bg-accent",
                      !isSel && isToday && "border-gold/70 bg-gold/10",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[13px] font-semibold leading-none sm:text-sm",
                        isSel
                          ? "text-primary-foreground"
                          : isSunday
                            ? "text-red-500/90"
                            : "text-foreground/90",
                      )}
                    >
                      {date.getDate()}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[9px] leading-none",
                        note.festival
                          ? "font-semibold text-red-500 dark:text-red-400"
                          : isSel
                            ? "text-primary-foreground/75"
                            : "text-muted-foreground/70",
                      )}
                    >
                      {note.lunar.day === 1
                        ? `${note.lunar.month}`
                        : note.lunar.day}
                    </span>
                    {note.festival?.major && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm" />
                    )}
                    {upo && (
                      <span
                        className={cn(
                          "absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                          isSel ? "bg-primary-foreground" : "bg-gold",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chú giải */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gold" /> Ngày Uposatha
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Đại lễ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-gold bg-gold/20" />{" "}
                Hôm nay
              </span>
            </div>
          </div>
        </div>

        {/* ---------- Cột phải ---------- */}
        <aside className="space-y-4">
          {/* Chi tiết ngày được chọn */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm">
            <div className="border-b border-border/60 bg-gradient-to-br from-gold/12 to-transparent px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Ngày được chọn
              </p>
              <p className="mt-1 text-2xl font-bold leading-tight">
                {selected.getDate()}
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                  /{selected.getMonth() + 1}/{selected.getFullYear()}
                </span>
              </p>
              <p className="text-[11px] capitalize text-muted-foreground">
                {selectedWeekday}
              </p>
            </div>
            <div className="space-y-2.5 px-4 py-3.5">
              <Row
                icon={<Moon className="h-3.5 w-3.5 text-gold" />}
                label="Âm lịch"
                value={`${selectedNote.lunar.day}/${selectedNote.lunar.month}${
                  selectedNote.lunar.isLeapMonth ? " (nhuận)" : ""
                }`}
              />
              <Row
                icon={<Sun className="h-3.5 w-3.5 text-gold" />}
                label="Can Chi (ngày)"
                value={selectedNote.canChi}
              />
              <Row
                icon={<Info className="h-3.5 w-3.5 text-gold" />}
                label="Phật lịch"
                value={`B.E. ${selectedNote.phatLich}`}
              />
            </div>
            {selectedNote.festival && (
              <div className="mx-4 mb-4 rounded-xl border border-gold/40 bg-gold/10 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  {selectedNote.festival.name}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                  {selectedNote.festival.note}
                </p>
              </div>
            )}
            {selectedNote.uposatha && (
              <div className="mx-4 mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-xs font-semibold">{selectedNote.uposatha}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">
                  Hàng tại gia giữ tám giới: không sát sinh, không trộm cắp,
                  không tà dâm, không nói dối, không uống rượu, không ăn phi
                  thời, không hát nhảy trang điểm, không nằm giường cao rộng.
                </p>
              </div>
            )}
          </div>

          {/* Uposatha kế tiếp */}
          {nextUpo && (
            <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent p-4 shadow-sm">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold/15 blur-xl" />
              <p className="relative text-[10px] font-semibold uppercase tracking-widest text-gold">
                Uposatha kế tiếp
              </p>
              <p className="relative mt-1 text-lg font-bold">
                {nextUpo.solar.d}/{nextUpo.solar.m}/{nextUpo.solar.y}
              </p>
              <p className="relative mt-0.5 text-[11px] text-muted-foreground">
                {nextUpo.label} · âm lịch {nextUpo.lunar.day}/
                {nextUpo.lunar.month}
              </p>
            </div>
          )}

          {/* Đại lễ sắp tới */}
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Đại lễ trọng đại
            </p>
            <ul className="space-y-3">
              {upcoming.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{f.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {f.lunarDay}/{f.lunarMonth} âm lịch
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                    {f.lunarDay}/{f.lunarMonth}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
