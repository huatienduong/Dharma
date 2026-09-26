/**
 * MÀN TÌM VIDEO — trang tìm kiếm và xem video YouTube, mở từ nút camera ở
 * góc trên trái (cạnh nút đàm thoại).
 *
 * Bố cục: ô tìm kiếm + kết quả ở trên, phần ĐỀ XUẤT (chủ đề Phật học hay
 * xem) nằm ở dưới. Bấm video nào thì phát ngay tại chỗ trong màn hình này,
 * không phải mở ứng dụng khác.
 */

import { BotAvatar } from "@/components/BotAvatar";
import {
  isBuddhistTopic,
  keepBuddhistVideos,
  NO_BUDDHIST_VIDEO_MESSAGE,
} from "@/lib/buddhistVideoFilter";
import { searchVideoInBrowser } from "@/lib/videoSearchClient";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import type { VideoInfo } from "@/lib/videoIntent";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Mic, MicOff, Play, Search, X } from "lucide-react";
import { useState } from "react";

export function VideoSearchScreen({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<VideoInfo | null>(null);
  const [message, setMessage] = useState("");

  // Nói thẳng chủ đề vào ô tìm kiếm: cùng bộ nghe 3 tầng như ô nhập câu hỏi
  // của khung chat (Web Speech → Whisper → sửa dấu tiếng Việt).
  const voice = useVoiceSearch();

  const run = async (q: string) => {
    const topic = q.trim();
    if (!topic || busy) return;
    setMessage("");
    setPlaying(null);
    // Chỉ tìm nội dung Phật giáo: chủ đề khác Phật học thì báo luôn, khỏi
    // tìm để không hiện kết quả lạc đề.
    if (!isBuddhistTopic(topic)) {
      setVideos([]);
      setMessage(NO_BUDDHIST_VIDEO_MESSAGE);
      return;
    }
    setBusy(true);
    setSearched(topic);
    try {
      // Ứng dụng tự dùng khoá của hệ thống qua máy chủ; ở đây chỉ chạy
      // đường dự phòng trong trình duyệt, người dùng không phải dán khoá.
      const found = keepBuddhistVideos(
        await searchVideoInBrowser(topic),
        true,
      );
      setVideos(found);
      if (!found.length) setMessage(NO_BUDDHIST_VIDEO_MESSAGE);
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
          Xem video cùng Trợ lý Phật học
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

        {/* Ô tìm kiếm: micro và kính lúp nằm TRONG ô, không có nút bên ngoài */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/70 bg-card pl-3 pr-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run(query);
              }
            }}
            aria-label="Nhập chủ đề muốn xem video"
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none"
          />

          {/* Xoá nội dung */}
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Xoá nội dung tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {/* Micro: nói chủ đề thay vì gõ */}
          {voice.supported ? (
            <button
              type="button"
              onClick={() => {
                if (voice.listening) {
                  voice.stop();
                  return;
                }
                voice.start((text) => {
                  const spoken = text.trim();
                  if (!spoken) return;
                  setQuery(spoken);
                  void run(spoken);
                });
              }}
              disabled={voice.refining}
              aria-label={voice.listening ? "Dừng nói" : "Nói chủ đề muốn xem"}
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
                voice.listening
                  ? "bg-destructive/15 text-destructive"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
                voice.refining && "opacity-60",
              )}
            >
              {voice.refining ? (
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
              ) : voice.listening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {voice.listening ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                </span>
              ) : null}
            </button>
          ) : null}

          {/* Kính lúp: chạy tìm ngay trong ô */}
          <button
            type="button"
            onClick={() => void run(query)}
            disabled={!query.trim() || busy}
            aria-label="Tìm video"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
              query.trim() && !busy
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground/60",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Câu đang nói vào ô tìm kiếm */}
        {voice.listening || voice.refining || voice.interim ? (
          <p className="mt-2 flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
            {voice.refining ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" />
            ) : (
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
            )}
            {voice.interim ? (
              <span className="truncate">{voice.interim}</span>
            ) : (
              <span>{voice.refining ? "Đang chép lại…" : "Đang nghe…"}</span>
            )}
          </p>
        ) : null}

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

        {/* Gợi ý dùng Trợ lý */}
        <section className="mt-8 flex items-start gap-2.5 rounded-2xl border border-border/50 bg-muted/40 p-3">
          <BotAvatar className="mt-0.5" />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Muốn hỏi thêm về nội dung video? Quay lại khung chat và nhắn
            &ldquo;cho mình xem video về …&rdquo; — Trợ lý trả lời kèm và gửi
            danh sách video Phật học vào đúng câu đó.
          </p>
        </section>
      </div>

    </div>
  );
}
