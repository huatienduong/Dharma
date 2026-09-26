/**
 * THẺ XEM VIDEO TRONG KHUNG CHAT.
 *
 * Mặc định chỉ hiện ảnh nhỏ + nút play (nhẹ, không tự tải video). Người dùng
 * bấm mới nhúng iframe `youtube-nocookie` để xem ngay tại chỗ — cùng kiểu
 * "xem trực tiếp trong đoạn chat".
 */

import type { VideoInfo } from "@/lib/videoIntent";
import { ExternalLink, Play, X } from "lucide-react";
import { useState } from "react";

export function VideoCard({ video }: { video: VideoInfo }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="mt-2 max-w-[420px] overflow-hidden rounded-3xl rounded-bl-md border border-border/50 bg-black shadow-sm">
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title || "Video trên YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-[12px] text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Đóng video
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-[420px] overflow-hidden rounded-3xl rounded-bl-md border border-border/50 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block w-full"
        aria-label={`Xem video: ${video.title || "video trên YouTube"}`}
      >
        <img
          src={video.thumbnail}
          alt={video.title || "Ảnh nhỏ video"}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/35" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/90 pl-0.5 text-white shadow-lg transition group-hover:scale-105 group-hover:bg-red-500">
            <Play className="h-6 w-6 fill-current" />
          </span>
        </span>
        {video.duration ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {video.duration}
          </span>
        ) : null}
      </button>
      <div className="flex items-start gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          {video.title ? (
            <p className="truncate text-[13px] font-medium text-foreground/90">
              {video.title}
            </p>
          ) : null}
          {video.channel ? (
            <p className="truncate text-[12px] text-muted-foreground">
              {video.channel}
            </p>
          ) : null}
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[12px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Mở trên YouTube"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          YouTube
        </a>
      </div>
    </div>
  );
}
