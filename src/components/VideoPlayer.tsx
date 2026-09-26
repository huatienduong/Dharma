/**
 * TRÌNH PHÁT VIDEO RIÊNG CỦA ỨNG DỤNG.
 *
 * Không nhúng YouTube, không logo, không đường dẫn ra ngoài: phát tệp video
 * trực tiếp bằng thẻ <video> và tự vẽ toàn bộ thanh điều khiển.
 *
 * Có đủ: phát / tạm dừng, tua (kéo thanh thời gian, tua 10 giây), âm lượng,
 * tốc độ xem, hình trong hình, xem toàn màn hình, bàn phím tắt.
 *
 * "Chạy nền": thu nhỏ thành hình thu nhỏ ở góc màn hình thì video vẫn phát;
 * kèm Media Session API để hệ điều hành hiện tên bài và nút điều khiển.
 */

import {
  getVideoProgress,
  rememberVideoProgress,
} from "@/lib/videoProgress";
import { formatTime, resolveDirectStream } from "@/lib/videoStream";
import type { VideoInfo } from "@/lib/videoIntent";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/** Bỏ màu/UI do trình duyệt thêm vào thẻ video (không có nút YouTube nào). */
const NATIVE_CONTROLS = { controls: false, controlsList: undefined } as const;

export function VideoPlayer({
  video,
  onClose,
  /** Ghim trình phát ở đầu trang: không che hết màn hình, danh sách bên dưới vẫn cuộn được. */
  pinned = false,
}: {
  video: VideoInfo;
  onClose: () => void;
  pinned?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef(0);

  const [src, setSrc] = useState<string | null>(null);
  /** true = không có nguồn trực tiếp, dùng khung phát dự phòng. */
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [menuSpeed, setMenuSpeed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Thu nhỏ: video thu gọn ở góc màn hình, vẫn phát. */
  const [mini, setMini] = useState(false);
  const [chrome, setChrome] = useState(true);
  /** Vị trí đã xem trước đó (giây) — 0 = xem từ đầu. */
  const [resumeAt, setResumeAt] = useState(0);
  const resumedRef = useRef(false);

  // 1) Lấy nguồn phát trực tiếp (không phụ thuộc YouTube).
  useEffect(() => {
    const ctl = new AbortController();
    let alive = true;
    setLoading(true);
    setSrc(null);
    setFallback(false);
    void (async () => {
      const url = await resolveDirectStream(video.videoId, ctl.signal).catch(
        () => null,
      );
      if (!alive) return;
      if (url) {
        setSrc(url);
      } else {
        // Không có máy chủ nào phát trực tiếp được: chuyển sang khung phát dự
        // phòng để người dùng vẫn xem được video ngay.
        setFallback(true);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
      ctl.abort();
    };
  }, [video.videoId]);

  // 1b) Nhớ đã xem đến đâu: mở lại video thì nhảy thẳng về chỗ đang dừng.
  useEffect(() => {
    resumedRef.current = false;
    void (async () => {
      const saved = await getVideoProgress(video.videoId).catch(() => null);
      if (!saved || saved.position < 10) {
        setResumeAt(0);
        return;
      }
      setResumeAt(saved.position);
    })();
  }, [video.videoId]);

  // 2) Media Session: để hệ điều hành điều khiển khi ứng dụng chạy nền.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !video.title) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title || "Video",
        artist: video.channel || "Trợ lý Phật học",
      });
      navigator.mediaSession.setActionHandler("play", () => {
        void videoRef.current?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        videoRef.current?.pause();
      });
    } catch {
      /* trình duyệt không hỗ trợ đầy đủ */
    }
  }, [video.title, video.channel]);

  // 3) Bàn phím: Space/K play, ←/→ tua, F toàn màn hình, M tắt tiếng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = videoRef.current;
      if (!el) return;
      if (e.key === " " || e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (el.paused) void el.play().catch(() => {});
        else el.pause();
      } else if (e.key === "ArrowRight") {
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 10);
      } else if (e.key === "ArrowLeft") {
        el.currentTime = Math.max(0, el.currentTime - 10);
      } else if (e.key === "ArrowUp") {
        el.volume = Math.min(1, el.volume + 0.1);
        setVolume(el.volume);
        setMuted(el.volume === 0);
      } else if (e.key === "ArrowDown") {
        el.volume = Math.max(0, el.volume - 0.1);
        setVolume(el.volume);
        setMuted(el.volume === 0);
      } else if (e.key === "m" || e.key === "M") {
        const next = !el.muted;
        el.muted = next;
        setMuted(next);
      } else if (e.key === "f" || e.key === "F") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* một số trình duyệt chặn toàn màn hình theo chính sách */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Ẩn thanh điều khiển sau 2,5s không chạm (giống trình phát quen thuộc).
  const wake = useCallback(() => {
    setChrome(true);
    window.clearTimeout(hideTimer.current);
    // Ghim thì luôn giữ thanh điều khiển để người dùng tua được ngay.
    if (pinned) return;
    hideTimer.current = window.setTimeout(() => {
      if (playing) setChrome(false);
    }, 2500);
  }, [playing, pinned]);

  useEffect(() => {
    setChrome(true);
    wake();
    return () => window.clearTimeout(hideTimer.current);
  }, [wake]);

  const seek = (v: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = v;
    setTime(v);
  };

  /** Ghi nhớ ngay khi người dùng tua, dừng hoặc đóng (không chờ timer). */
  const saveNow = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    rememberVideoProgress(video.videoId, el.currentTime, el.duration || 0);
  }, [video.videoId]);

  useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (el) {
        rememberVideoProgress(
          video.videoId,
          el.currentTime,
          el.duration || 0,
        );
      }
    };
  }, [video.videoId]);

  const openPip = async () => {
    const el = videoRef.current;
    if (!el || !("pictureInPictureEnabled" in document)) return;
    try {
      await el.requestPictureInPicture();
    } catch {
      /* không hỗ trợ */
    }
  };

  // Hình thu nhỏ: nổi ở góc dưới bên phải, video vẫn chạy.
  if (mini) {
    return (
      <div className="fixed bottom-4 right-4 z-[120] w-[min(78vw,320px)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <video
          ref={videoRef}
          src={src ?? undefined}
          poster={video.thumbnail}
          autoPlay
          playsInline
          {...NATIVE_CONTROLS}
          className="aspect-video w-full bg-black object-contain"
          onClick={() => (videoRef.current?.paused
            ? void videoRef.current?.play().catch(() => {})
            : videoRef.current?.pause())}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={() =>
              videoRef.current?.paused
                ? void videoRef.current?.play().catch(() => {})
                : videoRef.current?.pause()
            }
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
            aria-label={playing ? "Tạm dừng" : "Phát"}
          >
            {playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <span className="tabular-nums text-[12px] text-muted-foreground">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setMini(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
            aria-label="Mở rộng trình phát"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
            aria-label="Đóng video"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={wake}
      onTouchStart={wake}
      className={
        pinned
          ? "sticky top-0 z-40 flex flex-col border-b border-border/50 bg-background"
          : "fixed inset-0 z-[130] flex flex-col bg-background"
      }
    >
      <div
        className={
          pinned
            ? "relative mx-auto w-full max-w-[860px]"
            : "relative flex min-h-0 flex-1 items-center justify-center"
        }
      >
        {fallback ? (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
        <video
          ref={videoRef}
          className={
            fallback
              ? "hidden"
              : pinned
                ? "aspect-video w-full rounded-2xl border border-border/50 bg-black object-contain"
                : "m-3 max-h-full w-full rounded-2xl border border-border/50 bg-black object-contain"
          }
          src={src ?? undefined}
          poster={video.thumbnail}
          playsInline
          {...NATIVE_CONTROLS}
          onClick={() =>
            videoRef.current?.paused
              ? void videoRef.current?.play().catch(() => {})
              : videoRef.current?.pause()
          }
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            setLoading(false);
            if (!resumedRef.current && resumeAt > 0) {
              const total = e.currentTarget.duration || 0;
              // Chỉ nhảy về chỗ cũ nếu video còn dài và chưa xem gần hết.
              if (total > resumeAt + 10) {
                e.currentTarget.currentTime = resumeAt;
                resumedRef.current = true;
              }
            }
            // Bật tiếng sau cú chạm đầu tiên của người dùng.
            e.currentTarget.volume = muted ? 0 : volume;
            void e.currentTarget.play().catch(() => {});
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />

        {loading ? (
          <p className="absolute flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-[13px] text-foreground/85 backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải video…
          </p>
        ) : null}

        {/* Đã xem đến đâu: nhảy về chỗ cũ, cho phép xem lại từ đầu */}
        {chrome && !mini && resumeAt > 0 && time < resumeAt - 2 ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center bg-gradient-to-b from-black/70 to-transparent p-3">
            <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[12px] text-foreground backdrop-blur">
              Đã xem đến {formatTime(resumeAt)}
              <button
                type="button"
                onClick={() => {
                  seek(0);
                  setResumeAt(0);
                }}
                className="rounded-full bg-accent px-2 py-0.5 text-foreground/90 transition hover:bg-primary hover:text-primary-foreground"
              >
                Xem lại từ đầu
              </button>
            </span>
          </div>
        ) : null}

        {/* Tiêu đề: chỉ tên video, không có tên kênh hay nhãn YouTube */}
        {chrome && !mini && !pinned ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-3 bg-gradient-to-b from-black/70 to-transparent p-3">
            <div className="pointer-events-auto min-w-0 flex-1">
              <p className="line-clamp-1 text-[14px] font-medium text-foreground">
                {video.title || "Video"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/80 text-foreground transition hover:bg-accent"
              aria-label="Đóng trình phát"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* ---------- Thanh điều khiển tự vẽ ---------- */}
      {chrome && !fallback ? (
        <div className="shrink-0 border-t border-border/50 bg-card/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 text-foreground backdrop-blur-md">
          {/* Thanh tua */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.5}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Tua video"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${
                duration ? (time / duration) * 100 : 0
              }%, var(--border) 0%)`,
            }}
          />

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                videoRef.current?.paused
                  ? void videoRef.current?.play().catch(() => {})
                  : videoRef.current?.pause()
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label={playing ? "Tạm dừng" : "Phát"}
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                saveNow();
                seek(Math.max(0, time - 10));
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label="Lùi 10 giây"
              title="Lùi 10 giây"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                saveNow();
                seek(Math.min(duration || 0, time + 10));
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label="Tiến 10 giây"
              title="Tiến 10 giây"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (videoRef.current) videoRef.current.muted = next;
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                }
              }}
              aria-label="Âm lượng"
              className="hidden h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-border sm:block"
            />

            <span className="ml-1 text-[12px] tabular-nums text-muted-foreground">
              {formatTime(time)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Tốc độ xem */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuSpeed((v) => !v)}
                className="flex h-9 items-center rounded-full px-2.5 text-[12px] tabular-nums text-foreground/85 transition hover:bg-accent"
                aria-label="Tốc độ xem"
              >
                {speed}×
              </button>
              {menuSpeed ? (
                <div className="absolute bottom-11 right-0 z-10 w-24 overflow-hidden rounded-xl border border-border/60 bg-card py-1 text-[12px] shadow-xl">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setMenuSpeed(false);
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left transition hover:bg-accent",
                        s === speed && "text-primary",
                      )}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Hình trong hình */}
            {"pictureInPictureEnabled" in document ? (
              <button
                type="button"
                onClick={() => void openPip()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
                aria-label="Xem hình trong hình"
                title="Hình trong hình"
              >
                <PictureInPicture2 className="h-4 w-4" />
              </button>
            ) : null}

            {/* Thu nhỏ — vẫn phát (chạy nền) */}
            <button
              type="button"
              onClick={() => setMini(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label="Thu nhỏ trình phát, vẫn phát"
              title="Thu nhỏ (vẫn phát)"
            >
              <Minimize2 className="h-4 w-4" />
            </button>

            {/* Toàn màn hình */}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/85 transition hover:bg-accent hover:text-foreground"
              aria-label="Xem toàn màn hình"
              title="Toàn màn hình"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
