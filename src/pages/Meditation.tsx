import { AppShell } from "@/components/AppShell";
import {
  getMeditation,
  MEDITATIONS,
  MEDITATION_QUOTE,
} from "@/data/meditation";
import { cn } from "@/lib/utils";
import { loadLocalMeditation, saveLocalMeditation } from "@/lib/localProgress";
import {
  ChevronLeft,
  Flower2,
  Footprints,
  HeartHandshake,
  Hourglass,
  MoonStar,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TECH_ICONS: Record<string, React.ReactNode> = {
  anapanasati: <Wind className="h-5 w-5" />,
  metta: <HeartHandshake className="h-5 w-5" />,
  maranasati: <MoonStar className="h-5 w-5" />,
  walking: <Footprints className="h-5 w-5" />,
};

function Wind({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

function fmt(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}g ${m}p`;
  return `${m} phút`;
}

export default function Meditation() {
  return (
    <AppShell
      title="Thiền định"
      subtitle="Hướng dẫn chi tiết và thực hành ngay — theo truyền thống Theravāda"
    >
      <MeditationInner />
    </AppShell>
  );
}

function MeditationInner() {
  const navigate = useNavigate();
  // Thống kê + lịch sử phiên thiền đọc từ dữ liệu CỤC BỘ trên thiết bị
  const stats = useLocalMeditationStats();
  const sessions = useMemo(() =>
    loadLocalMeditation().sort((a, b) => b.completedAt - a.completedAt),
  [],
  );

  return (
    <div className="space-y-8">
      {/* Trích dẫn */}
      <blockquote className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 text-sm italic leading-relaxed text-foreground/85">
        {MEDITATION_QUOTE}
      </blockquote>

      {/* Thống kê */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Hôm nay"
          value={stats ? fmtDur(stats.todaySec) : "…"}
        />
        <StatCard
          label="Tổng thời gian"
          value={stats ? fmtDur(stats.totalSec) : "…"}
        />
        <StatCard
          label="Số phiên"
          value={stats ? String(stats.totalSessions) : "…"}
        />
      </div>

      {/* Danh sách kỹ thuật */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-gold" />
          Các kỹ thuật thiền
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MEDITATIONS.map((m) => {
            const Icon = TECH_ICONS[m.id] ?? <Flower2 className="h-5 w-5" />;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/meditation/${m.id}`)}
                className="group flex h-full flex-col rounded-xl border border-border/60 bg-card/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    {Icon}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {m.difficulty}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold group-hover:text-primary">
                  {m.name}
                </h3>
                <p className="text-[11px] italic text-gold">{m.pali}</p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {m.tagline}
                </p>
                <p className="mt-3 flex items-center gap-1 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                  <Hourglass className="h-3 w-3" /> Gợi ý {m.suggestedMin} phút ·{" "}
                  {m.steps.length} bước
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lịch sử phiên — dữ liệu cục bộ trên thiết bị */}
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Phiên gần đây
          </h2>
          <ul className="space-y-2">
            {sessions.slice(0, 6).map((s) => (
              <li
                key={`${s.completedAt}-${s.technique}`}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3.5 py-2.5 text-xs"
              >
                <span className="font-medium">
                  {getMeditation(s.technique)?.name ?? s.technique}
                </span>
                <span className="text-muted-foreground">
                  {fmtDur(s.durationSec)} ·{" "}
                  {new Date(s.completedAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3.5 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trang chi tiết kỹ thuật + timer                                     */
/* ------------------------------------------------------------------ */

export function MeditationDetail() {
  const { id } = useParams();
  const tech = id ? getMeditation(id) : undefined;
  const navigate = useNavigate();


  const [plannedMin, setPlannedMin] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Chế độ chuông báo khi kết thúc phiên — lưu trên thiết bị
  const [bellMode, setBellMode] = useState<"off" | "chime" | "bell">(() => {
    try {
      const v = localStorage.getItem("ds-meditation-bell");
      return v === "off" || v === "bell" ? v : "chime";
    } catch {
      return "chime";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("ds-meditation-bell", bellMode);
    } catch {
      /* bỏ qua */
    }
  }, [bellMode]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tech) setPlannedMin(tech.suggestedMin);
  }, [tech]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Kết thúc tự động khi đủ thời gian
  const done = plannedMin !== null && elapsed >= plannedMin * 60;
  useEffect(() => {
    if (done && running) {
      setRunning(false);
      if (bellMode !== "off") chime(bellMode);
      toast.success("Hoàn thành phiên thiền — hiện đầy đủ bình an.");
      if (plannedMin) {
        // Lưu CỤC BỘ trên thiết bị — không cần đăng nhập
        saveLocalMeditation(tech?.id ?? "custom", elapsed);
      }
    }
  }, [done, running, elapsed, plannedMin, tech, bellMode]);

  if (!tech) {
    return (
      <AppShell title="Thiền">
        <p className="text-sm text-muted-foreground">Không tìm thấy kỹ thuật.</p>
      </AppShell>
    );
  }

  const progress =
    plannedMin !== null ? Math.min(1, elapsed / (plannedMin * 60)) : 0;

  return (
    <AppShell
      title={tech.name}
      subtitle={`${tech.pali} · ${tech.source}`}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/meditation")}>
          <ChevronLeft className="h-4 w-4" /> Tất cả
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        {/* Hướng dẫn */}
        <div className="space-y-4">
          <p className="rounded-xl border border-border/60 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
            {tech.tagline}. Gợi ý thời gian: {tech.suggestedMin} phút. Ưu điểm:{" "}
            {tech.benefits.join("; ")}.
          </p>

          {tech.steps.map((s, i) => (
            <section
              key={i}
              className="rounded-xl border border-border/60 bg-card/60 p-4 sm:p-5"
            >
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-[1.85] text-foreground/85">
                {s.text}
              </p>
            </section>
          ))}

          <section className="rounded-xl border border-gold/30 bg-gold/5 p-4 sm:p-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
              Lời khuyên thực hành
            </h3>
            <ul className="space-y-1.5">
              {tech.tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Timer */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 text-center shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Bộ đếm thiền
            </p>

            {/* Chọn thời gian */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {[5, 10, 15, 20, 30, 45].map((min) => (
                <button
                  key={min}
                  type="button"
                  disabled={running}
                  onClick={() => {
                    setPlannedMin(min);
                    setElapsed(0);
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-50",
                    plannedMin === min
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-accent",
                  )}
                >
                  {min}′
                </button>
              ))}
            </div>

            {/* Đồng hồ */}
            <div className="relative mx-auto mt-5 h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  className="text-border"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  className="text-gold transition-all duration-500"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">
                  {fmt(elapsed)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  / {plannedMin ?? "—"} phút
                </span>
              </div>
            </div>

            {/* Chọn chuông báo kết thúc */}
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Chuông báo khi thiền xong
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { key: "off", label: "Tắt" },
                    { key: "chime", label: "Chuông nhẹ" },
                    { key: "bell", label: "Ngân vang" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setBellMode(opt.key)}
                    aria-pressed={bellMode === opt.key}
                    className={cn(
                      "rounded-full border px-2 py-1.5 text-[11px] font-medium transition",
                      bellMode === opt.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút điều khiển */}
            <div className="mt-5 flex justify-center gap-2">
              <Button
                onClick={() => setRunning((r) => !r)}
                className="gap-2"
                disabled={done}
              >
                {running ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "Tạm dừng" : elapsed > 0 ? "Tiếp tục" : "Bắt đầu"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={elapsed === 0}
                onClick={() => {
                  setRunning(false);
                  setElapsed(0);
                }}
                aria-label="Đặt lại"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-4 border-t border-border/50 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Âm chuông sẽ báo hiệu kết thúc phiên thiền.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

// Chuông kết thúc bằng Web Audio (không cần file) — 2 chế độ
function chime(mode: "chime" | "bell") {
  try {
    const ctx = new AudioContext();
    if (mode === "chime") {
      // Chuông nhẹ: 3 nốt ngân lẫn nhau
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 1.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 1.3);
      });
    } else {
      // Chuông ngân vang: âm chuông chùa trầm, dư âm dài ~6 giây
      const t0 = ctx.currentTime;
      const parts = [
        { freq: 196, gain: 0.32, decay: 6 },
        { freq: 294, gain: 0.18, decay: 5 },
        { freq: 392, gain: 0.12, decay: 4 },
        { freq: 588, gain: 0.06, decay: 3 },
      ];
      parts.forEach(({ freq, gain: g, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(g, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + decay + 0.2);
      });
    }
  } catch {
    /* không làm sao */
  }
}

/* ------------------------------------------------------------------ */
/* Thống kê thiền từ dữ liệu CỤC BỘ (localStorage)                     */
/* ------------------------------------------------------------------ */

function useLocalMeditationStats() {
  return useMemo(() => {
    const rows = loadLocalMeditation();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayStart = startOfDay.getTime();
    let todaySec = 0;
    let totalSec = 0;
    for (const r of rows) {
      totalSec += r.durationSec;
      if (r.completedAt >= todayStart) todaySec += r.durationSec;
    }
    return { todaySec, totalSec, totalSessions: rows.length };
  }, []);
}
