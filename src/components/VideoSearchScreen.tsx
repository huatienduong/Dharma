/**
 * MÀN TÌM VIDEO — trang tìm kiếm và xem video YouTube, mở từ nút camera ở
 * góc trên trái (cạnh nút đàm thoại).
 *
 * Bố cục: ô tìm kiếm + kết quả ở trên, phần ĐỀ XUẤT (chủ đề Phật học hay
 * xem) nằm ở dưới. Bấm video nào thì phát ngay tại chỗ trong màn hình này,
 * không phải mở ứng dụng khác.
 */

import { Button } from "@/components/ui/button";
import { BotAvatar } from "@/components/BotAvatar";
import { searchVideoInBrowser } from "@/lib/videoSearchClient";
import type { VideoInfo } from "@/lib/videoIntent";
import { loadYouTubeKey } from "@/lib/youtubeKey";
import { cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Lightbulb, Loader2, Play, Search, X } from "lucide-react";
import { useState } from "react";

/** Chủ đề gợi ý — dùng để bấm một cái là có video, không phải gõ. */
const SUGGESTIONS = [
  "Tứ Đế",
  "Tánh niệm",
  "Dukkha — khổ",
  "Vipassana",
  "Bát Nhã Tâm Kinh",
  "Nghiệp quả",
  "Bốn tầng nhẫn",
  "Cúng dường",
  "Luật Tứ Phần",
  "Thiền và trí tuệ",
];

export function VideoSearchScreen({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<VideoInfo | null>(null);
  const [message, setMessage] = useState("");

  const run = async (q: string) => {
    const topic = q.trim();
    if (!topic || busy) return;
    setBusy(true);
    setMessage("");
    setPlaying(null);
    setSearched(topic);
    try {
      const key = await loadYouTubeKey().catch(() => "");
      const found = await searchVideoInBrowser(topic, key);
      setVideos(found);
      if (!found.length) {
        setMessage(
          "Chưa tìm được video. Bạn dán khoá YouTube ở Cài đặt → Video YouTube thì tìm chính xác hơn.",
        );
      }
    } catch {
      setMessage("Chưa tìm được video. Bạn thử lại sau nhé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* ---------- Thanh trên ---------- */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-accent"
          aria-label="Quay lại khung chat"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          Tìm video trên YouTube
        </p>
      </div>

      {/* ---------- Nội dung cuộn ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8 sm:px-4">
        {/* Video đang phát */}
        {playing ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-black">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${playing.videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={playing.title || "Video trên YouTube"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-[13px] text-foreground/90">
                {playing.title || "Video đang xem"}
              </p>
              <button
                type="button"
                onClick={() => setPlaying(null)}
                className="shrink-0 text-[12px] text-muted-foreground transition hover:text-foreground"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : null}

        {/* Ô tìm kiếm */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border/70 bg-card px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void run(query);
                }
              }}
              placeholder="Nhập chủ đề muốn xem…"
              aria-label="Nhập chủ đề muốn xem video"
              className="h-11 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
                aria-label="Xoá nội dung tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={() => void run(query)}
            disabled={!query.trim() || busy}
            className="h-11 shrink-0 gap-1.5 rounded-full"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Tìm
          </Button>
        </div>

        {/* Kết quả */}
        {message ? (
          <p className="mt-4 rounded-2xl border border-border/50 bg-muted/40 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {message}
          </p>
        ) : null}

        {busy && !videos.length ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            Đang tìm video…
          </p>
        ) : null}

        {videos.length > 0 ? (
          <section className="mt-4">
            <h2 className="text-[13px] font-semibold text-muted-foreground">
              Kết quả cho “{searched}”
            </h2>
            <ul className="mt-2 space-y-2">
              {videos.map((v) => (
                <li key={v.videoId}>
                  <button
                    type="button"
                    onClick={() => setPlaying(v)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-card p-2 text-left transition hover:bg-muted/40"
                  >
                    <span className="relative shrink-0">
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-20 w-36 rounded-xl object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/25">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/90 pl-0.5 text-white">
                          <Play className="h-4 w-4 fill-current" />
                        </span>
                      </span>
                      {v.duration ? (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">
                          {v.duration}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[14px] font-medium leading-snug text-foreground/95">
                        {v.title || "Video trên YouTube"}
                      </span>
                      {v.channel ? (
                        <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                          {v.channel}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---------- ĐỀ XUẤT: nằm ở dưới ---------- */}
        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-gold" />
            Đề xuất chủ đề
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground/80">
            Bấm một chủ đề để xem video tương ứng ngay tại đây.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    void run(s);
                  }}
                  disabled={busy}
                  className={cn(
                    "rounded-full border border-border/60 bg-card px-3.5 py-2 text-[13px] transition",
                    "hover:border-primary/60 hover:bg-muted/40 disabled:opacity-50",
                  )}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Gợi ý dùng Trợ lý */}
        <section className="mt-8 flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/40 p-3">
          <BotAvatar className="mt-0.5" />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Muốn hỏi thêm về nội dung video? Quay lại khung chat và nhắn
            &ldquo;cho mình xem video về …&rdquo; — Trợ lý trả lời kèm và gửi
            danh sách video vào đúng câu đó.
          </p>
        </section>
      </div>

      {/* Liên kết mở rộng khi đang xem */}
      {playing ? (
        <a
          href={`https://www.youtube.com/watch?v=${playing.videoId}`}
          target="_blank"
          rel="noreferrer"
          className="mx-auto mb-[max(0.75rem,env(safe-area-inset-bottom))] inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Mở trên YouTube
        </a>
      ) : null}
    </div>
  );
}
