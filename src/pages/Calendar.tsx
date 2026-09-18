import { AppShell } from "@/components/AppShell";
import {
  dayNote,
  FESTIVALS,
  isUposatha,
  nextUposatha,
  uposathaLabel,
  canChiYear,
  type LunarDate,
} from "@/data/pcalendar";
import { ChevronLeft, ChevronRight, Info, Moon, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const T2 = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=CN
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
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
    // Tìm các lễ hội sắp tới trong 3 tháng âm lịch quanh hiện tại
    return FESTIVALS.filter((f) => f.major).slice(0, 3);
  }, []);

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <AppShell
      title="Lịch Phật giáo"
      subtitle="Âm lịch · Can Chi · Phật lịch · lễ hội · ngày Uposatha"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        {/* ---------- Lưới lịch ---------- */}
        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="rounded-lg border border-border/60 p-2 transition hover:bg-accent"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                Tháng {view.m + 1}/{view.y}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Phật lịch {canChiYear(view.y - 544 + (view.m >= 4 ? 0 : -1))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => shift(1)}
              className="rounded-lg border border-border/60 p-2 transition hover:bg-accent"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
            {T2.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const note = dayNote(
                date.getDate(),
                date.getMonth() + 1,
                date.getFullYear(),
              );
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
              const isSel =
                date.getDate() === selected.getDate() &&
                date.getMonth() === selected.getMonth() &&
                date.getFullYear() === selected.getFullYear();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-transparent hover:bg-accent",
                    !isSel && isToday && "border-gold/60 bg-gold/10",
                  )}
                >
                  <span
                    className={cn(
                      "text-[13px] font-medium leading-none",
                      isSel ? "text-primary-foreground" : "text-foreground/90",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] leading-none",
                      note.festival
                        ? "font-semibold text-red-500 dark:text-red-400"
                        : isSel
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/80",
                    )}
                  >
                    {note.lunar.day === 1
                      ? `${note.lunar.month}`
                      : note.lunar.day}
                  </span>
                  {note.festival?.major && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                  {isUposatha(note.lunar) && (
                    <span
                      className={cn(
                        "absolute left-1 top-1 h-1.5 w-1.5 rounded-full",
                        isSel ? "bg-primary-foreground" : "bg-gold",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/50 pt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" /> Ngày Uposatha
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Đại lễ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Hôm nay
            </span>
          </div>
        </div>

        {/* ---------- Cột phải ---------- */}
        <aside className="space-y-4">
          {/* Chi tiết ngày được chọn */}
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Ngày được chọn
            </p>
            <p className="mt-1 text-lg font-bold">
              {selected.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            <div className="mt-3 space-y-2 text-xs">
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
              <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-2.5">
                <p className="text-xs font-semibold text-gold">
                  {selectedNote.festival.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                  {selectedNote.festival.note}
                </p>
              </div>
            )}
            {selectedNote.uposatha && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/10 p-2.5">
                <p className="text-xs font-semibold">{selectedNote.uposatha}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
                  Hàng tại gia giữ tám giới: không sát sinh, không trộm cắp,
                  không tà dâm, không nói dối, không uống rượu, không ăn phi
                  thời, không hát nhảy trang điểm, không nằm giường cao rộng.
                </p>
              </div>
            )}
          </div>

          {/* Uposatha tiếp theo */}
          {nextUpo && (
            <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-gold">
                Uposatha kế tiếp
              </p>
              <p className="mt-1 text-sm font-bold">
                {nextUpo.solar.d}/{nextUpo.solar.m}/{nextUpo.solar.y}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {nextUpo.label} · âm lịch{" "}
                {nextUpo.lunar.day}/{nextUpo.lunar.month}
              </p>
            </div>
          )}

          {/* Đại lễ sắp tới */}
          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Đại lễ trọng đại
            </p>
            <ul className="space-y-2.5">
              {upcoming.map((f) => (
                <li key={f.name} className="text-xs">
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.lunarDay}/{f.lunarMonth} âm lịch
                  </p>
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
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
