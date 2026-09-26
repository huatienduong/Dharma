/**
 * DANH SÁCH VIDEO ĐỀ XUẤT — hiện ngay dưới câu trả lời khi người dùng yêu
 * cầu xem video về một chủ đề.
 *
 * Trợ lý tự tìm và đề xuất tối đa 3 video; người dùng bấm video nào thì phát
 * video đó ngay tại chỗ trong khung chat (không rời ứng dụng), có nút quay
 * lại danh sách. Không tự phát kèm âm thanh: trình duyệt chặn phát tiếng
 * không cần thao tác của người dùng.
 */

import type { VideoInfo } from "@/lib/videoIntent";
import { ArrowLeft, ExternalLink, Play, Search } from "lucide-react";
import { useState } from "react";

export function VideoListCard({
  query,
  videos,
}: {
  query: string;
  videos: VideoInfo[];
}) {
  const [playing, setPlaying] = useState<VideoInfo | null>(null);

  if (playing) {
    return (
      <div className="mt-2 max-w-[420px] overflow-hidden rounded-3xl rounded-bl-md border border-border/50 bg-black shadow-sm">
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
          <button
            type="button"
            onClick={() => setPlaying(null)}
            className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Video khác</span>
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${playing.videoId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-[420px] overflow-hidden rounded-3xl rounded-bl-md border border-border/50 bg-card shadow-sm">
      <p className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2 text-[12px] text-muted-foreground">
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          Video đề xuất{query ? ` cho “${query}”` : ""}
        </span>
      </p>
      <ul className="divide-y divide-border/40">
        {videos.map((v) => (
          <li key={v.videoId}>
            <button
              type="button"
              onClick={() => setPlaying(v)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-muted/40"
              aria-label={`Xem video: ${v.title || "video đề xuất"}`}
            >
              <span className="relative shrink-0">
                <img
                  src={v.thumbnail}
                  alt=""
                  loading="lazy"
                  className="h-14 w-24 rounded-lg object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/25">
                  <Play className="h-4 w-4 fill-white text-white" />
                </span>
                {v.duration ? (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">
                    {v.duration}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[13px] font-medium leading-snug text-foreground/90">
                  {v.title || "Video trên YouTube"}
                </span>
                {v.channel ? (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {v.channel}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
