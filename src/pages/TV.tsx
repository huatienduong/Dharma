import { AppShell } from "@/components/AppShell";
import { TV_CHANNELS, type TvChannel } from "@/data/tv";
import { cn } from "@/lib/utils";
import { loadUiState, saveUiState } from "@/lib/uiState";
import { Loader2, Radio, Tv, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* TRUYỀN HÌNH PHẬT GIÁO — xem TV trực tiếp ngay trong ứng dụng.        */
/* • HTV5: livestream YouTube chính thức của kênh HTV                   */
/* • An Viên: livestream YouTube chính thức của kênh AVG                */
/* Giao diện riêng kiểu TV: ống kính lớn ở giữa, bộ chọn kênh phía dưới. */
/* ------------------------------------------------------------------ */

const LAST_CHANNEL_KEY = "tv-last-channel";

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[0_0_10px_rgba(220,38,38,0.6)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      Trực tiếp
    </span>
  );
}

export default function TV() {
  const [channel, setChannel] = useState<TvChannel>(() => {
    const saved = loadUiState<string>(LAST_CHANNEL_KEY, "");
    return TV_CHANNELS.find((c) => c.id === saved) ?? TV_CHANNELS[0];
  });
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Ghi nhớ kênh đang xem — quay lại là đúng kênh cũ
  useEffect(() => {
    saveUiState(LAST_CHANNEL_KEY, channel.id);
  }, [channel.id]);

  // Chuyển kênh → hiện lại khung nạp
  useEffect(() => {
    setLoading(true);
    setFailed(false);
    const t = window.setTimeout(() => {
      // Nếu sau 7s iframe chưa báo onload thì cho phép thử lại
      setLoading((prev) => (prev ? prev : prev));
    }, 0);
    return () => window.clearTimeout(t);
  }, [channel.id]);

  const switchChannel = (next: TvChannel) => {
    if (next.id === channel.id) return;
    setChannel(next);
    setLoading(true);
    setFailed(false);
  };

  return (
    <AppShell title="Truyền hình Phật giáo" hideTitle>
      {/* -------- Đầu trang -------- */}
      <div className="mb-4 flex items-center gap-3">
        <span className="ds-tile h-12 w-12 shrink-0">
          <Tv className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight">
            Truyền hình Phật giáo
          </h1>
          <p className="text-xs text-muted-foreground">
            Xem TV trực tiếp 24/7 ngay trong ứng dụng
          </p>
        </div>
      </div>

      {/* -------- Ống kính TV -------- */}
      <section className="ds-card overflow-hidden p-2 sm:p-3">
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-[0_10px_36px_rgba(0,0,0,0.4)]">
          <div className="relative aspect-video w-full">
            <iframe
              key={channel.id}
              src={`${channel.embedUrl}&autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
              title={channel.name}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
            />
            {loading && !failed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
                <p className="text-xs text-white/80">
                  Đang kết nối {channel.name}…
                </p>
              </div>
            )}
            {failed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center">
                <Radio className="h-8 w-8 text-gold" />
                <p className="text-sm font-semibold text-white">
                  Không phát được {channel.name}
                </p>
                <p className="text-xs text-white/70">
                  Kênh có thể đang nghỉ phát trực tiếp. Thử chuyển sang kênh
                  khác hoặc xem lại sau.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Thanh thông tin kênh dưới ống kính */}
        <div className="flex items-center gap-3 px-2 pb-1 pt-3 sm:px-3">
          <span
            className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm"
            style={{ backgroundColor: channel.color }}
          >
            {channel.short}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{channel.name}</p>
              <LiveBadge />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {channel.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-gold transition hover:bg-accent active:scale-95"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </section>

      {/* -------- Bộ chọn kênh -------- */}
      <section className="mb-4 mt-4">
        <h2 className="mb-2.5 px-1 text-[15px] font-bold tracking-tight">
          Chọn kênh
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {TV_CHANNELS.map((c) => {
            const active = c.id === channel.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchChannel(c)}
                aria-pressed={active}
                className={cn(
                  "ds-card flex items-center gap-3 px-3 py-3 text-left transition active:scale-[0.98]",
                  active &&
                    "ring-2 ring-primary/70",
                )}
              >
                <span
                  className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold uppercase text-white shadow-sm"
                  style={{ backgroundColor: c.color }}
                >
                  {c.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">
                    {c.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">
                      Trực tiếp
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
        Nguồn phát trực tiếp: livestream chính thức trên YouTube của các kênh
        HTV và An Viên — nhúng trực tiếp vào ứng dụng, xem liên tục 24/7.
      </p>
    </AppShell>
  );
}
