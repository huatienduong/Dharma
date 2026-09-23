import { AppShell } from "@/components/AppShell";
import {
  AUDIO_TRACKS,
  type AudioTrack,
} from "@/data/audio";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { cn } from "@/lib/utils";
import { Headphones, Loader2, Music, Pause, Play } from "lucide-react";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/* NGHE — nghe kinh Pāli & nhạc thiền phát trực tiếp trong ứng dụng.   */
/* Trình phát độc lập (audioPlayer.tsx) — không dính tới trình phát    */
/* video pháp thoại.                                                   */
/* ------------------------------------------------------------------ */

type Kind = AudioTrack["kind"] | "all";

export default function Listen() {
  const [kind, setKind] = useState<Kind>("all");
  const { current, isPlaying, isBuffering, play } = useAudioPlayer();

  const tracks = AUDIO_TRACKS.filter((t) => kind === "all" || t.kind === kind);

  const KINDS: { key: Kind; label: string; icon: typeof Headphones }[] = [
    { key: "all", label: "Tất cả", icon: Headphones },
    { key: "chant", label: "Nghe kinh", icon: Headphones },
    { key: "music", label: "Nhạc thiền", icon: Music },
  ];

  return (
    <AppShell title="Nghe">
      {/* Tab phân loại */}
      <div className="mb-4 flex flex-wrap gap-2">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const active = kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(166,124,46,0.35)]"
                  : "bg-card text-muted-foreground shadow-[0_1px_3px_rgba(63,50,33,0.08)] hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {k.label}
            </button>
          );
        })}
      </div>

      {/* Danh sách track — thẻ hàng ngang có ảnh minh họa nhỏ */}
      <div className="ds-card overflow-hidden">
        <ul className="divide-y divide-border/50">
          {tracks.map((t) => {
            const active = current?.id === t.id;
            const playing = active && isPlaying;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => play(t)}
                  className={cn(
                    "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-accent/60",
                    active && "bg-secondary/70",
                  )}
                >
                  {/* Ảnh minh họa nhỏ: đĩa nhạc / kinh sách */}
                  <span
                    className={cn(
                      "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
                      t.kind === "chant"
                        ? "bg-gradient-to-br from-gold/25 to-gold/5 text-gold"
                        : "bg-gradient-to-br from-[#5c4a2a]/30 to-[#5c4a2a]/5 text-[#6b5836]",
                    )}
                  >
                    {t.kind === "chant" ? (
                      <Headphones className="h-5 w-5" />
                    ) : (
                      <Music className="h-5 w-5" />
                    )}
                    {playing && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Pause className="h-5 w-5 text-white" />
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-semibold",
                        active && "text-primary",
                      )}
                    >
                      {t.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {t.author} ·{" "}
                      {t.kind === "chant" ? "Tụng Pāli" : "Nhạc thiền"}
                    </span>
                  </span>

                  {/* Nút phát tròn bên phải */}
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-gold",
                    )}
                  >
                    {active && isBuffering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playing ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 translate-x-[1px]" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
        Nguồn âm thanh công cộng: archive.org — Buddhist Protective Chants
        (tụng Pāli) và Mystical Gongs (nhạc thiền).
      </p>
    </AppShell>
  );
}
