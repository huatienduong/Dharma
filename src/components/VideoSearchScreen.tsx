/**
 * MÀN TÌM VIDEO — trang tìm kiếm và xem video YouTube, mở từ nút camera ở
 * góc trên trái (cạnh nút đàm thoại).
 *
 * Bố cục: ô tìm kiếm + kết quả ở trên, phần ĐỀ XUẤT (chủ đề Phật học hay
 * xem) nằm ở dưới. Bấm video nào thì phát ngay tại chỗ trong màn hình này,
 * không phải mở ứng dụng khác.
 */

import {
  fetchSuggestedVideos,
  searchVideoInBrowser,
  viewCountText,
} from "@/lib/videoSearchClient";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { VideoInfo } from "@/lib/videoIntent";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Mic,
  MicOff,
  Play,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export function VideoSearchScreen({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<VideoInfo | null>(null);
  const [message, setMessage] = useState("");

  // Danh sách gợi ý: video Phật giáo hay xem, tối đa 20, tải khi mở màn hình.
  const [suggested, setSuggested] = useState<VideoInfo[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(true);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const list = await fetchSuggestedVideos(20).catch(() => []);
      if (alive) {
        setSuggested(list);
        setSuggestBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Nói thẳng chủ đề vào ô tìm kiếm: cùng bộ nghe 3 tầng như ô nhập câu hỏi
  // của khung chat (Web Speech → Whisper → sửa dấu tiếng Việt).
  const voice = useVoiceSearch();

  const run = async (q: string) => {
    const topic = q.trim();
    if (!topic || busy) return;
    setMessage("");
    setPlaying(null);
    setBusy(true);
    setSearched(topic);
    try {
      // Ứng dụng tự dùng khoá của hệ thống qua máy chủ; ở đây chỉ chạy
      // đường dự phòng trong trình duyệt, người dùng không phải dán khoá.
      // Không lọc cứng: câu tìm đã gộp "Phật giáo" nên kết quả là nhóm
      // video liên quan tới Phật giáo.
      const found = await searchVideoInBrowser(topic);
      setVideos(found);
      if (!found.length) setMessage("Chưa tìm được video về chủ đề này nhé.");
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

      {/* ---------- THANH TÌM KIẾM: CỐ ĐỊNH, không cuộn theo danh sách ---------- */}
      <div className="shrink-0 border-b border-border/60 bg-background/95 px-3 pb-3 backdrop-blur-md sm:px-4">
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

      </div>

      {/* ---------- Nội dung cuộn: video đang phát, kết quả, gợi ý ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8 sm:px-4">
        {/* Video đang phát: trình phát riêng của ứng dụng, không nhúng YouTube */}
        {playing ? <VideoPlayer video={playing} onClose={() => setPlaying(null)} /> : null}

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
                    className="flex w-full items-center gap-3 border border-border/50 bg-card p-2 text-left transition hover:bg-muted/40"
                  >
                    <span className="relative shrink-0">
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-20 w-36 object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
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
                        {v.title || "Video"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}


        <section>
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Play className="h-3.5 w-3.5 text-gold" />
            Video gợi ý
          </h2>

          {suggestBusy ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              Đang tải video gợi ý…
            </p>
          ) : null}

          {!suggestBusy && !suggested.length ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Chưa tải được danh sách gợi ý. Bạn thử tìm theo chủ đề ở ô trên nhé.
            </p>
          ) : null}

          <ul className="mt-3 space-y-1.5">
            {suggested.map((v) => (
              <li key={v.videoId}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(v);
                    setVideos([]);
                    setSearched("");
                    setMessage("");
                  }}
                  className="flex w-full items-center gap-3 p-1.5 text-left transition hover:bg-muted/50"
                >
                  {/* Ảnh nhỏ bên trái */}
                  <span className="relative shrink-0">
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-12 w-20 object-cover"
                    />
                    {v.duration ? (
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">
                        {v.duration}
                      </span>
                    ) : null}
                  </span>
                  {/* Tiêu đề + số lượt xem bên phải */}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-[13px] font-medium leading-snug text-foreground/95">
                      {v.title || "Video"}
                    </span>
                    {viewCountText(v.viewCount) ? (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {viewCountText(v.viewCount)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
