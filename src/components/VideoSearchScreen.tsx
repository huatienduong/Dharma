/**
 * MÀN TÌM VIDEO — trang tìm kiếm và xem video YouTube, mở từ nút camera ở
 * góc trên trái (cạnh nút đàm thoại).
 *
 * Bố cục: ô tìm kiếm + kết quả ở trên, phần ĐỀ XUẤT (chủ đề Phật học hay
 * xem) nằm ở dưới. Bấm video nào thì phát ngay tại chỗ trong màn hình này,
 * không phải mở ứng dụng khác.
 */

import {
  fetchRelatedPage,
  fetchSuggestedPage,
  searchVideoInBrowser,
  viewCountText,
} from "@/lib/videoSearchClient";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { VideoPlayer } from "@/components/VideoPlayer";
import { keepBuddhistVideos } from "@/lib/buddhistVideoFilter";
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
import { useCallback, useEffect, useRef, useState } from "react";

export function VideoSearchScreen({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<VideoInfo | null>(null);
  const [message, setMessage] = useState("");

  // Danh sách gợi ý: tải theo trang, cuộn tới đâu lấy tới đó (không giới hạn).
  const [suggested, setSuggested] = useState<VideoInfo[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(true);
  const [suggestPage, setSuggestPage] = useState(0);
  const [suggestMore, setSuggestMore] = useState(false);
  const suggestBusyRef = useRef(false);

  /** Lấy trang gợi ý kế tiếp, bỏ trùng video đã có. */
  const loadMoreSuggested = useCallback(
    async (page: number) => {
      if (suggestBusyRef.current) return;
      suggestBusyRef.current = true;
      if (page === 0) setSuggestBusy(true);
      else setSuggestMore(true);
      // Chỉ đề xuất video về Phật giáo: lọc cứng, video lạc đề không hiện.
      const batch = keepBuddhistVideos(
        await fetchSuggestedPage(page).catch(() => []),
        true,
      );
      if (batch.length) {
        setSuggested((prev) => {
          const seen = new Set(prev.map((v) => v.videoId));
          const add = batch.filter((v) => !seen.has(v.videoId));
          return add.length ? [...prev, ...add] : prev;
        });
      }
      setSuggestBusy(false);
      setSuggestMore(false);
      suggestBusyRef.current = false;
      // Trang này bị lọc hết (không còn nội dung Phật giáo) → lấy tiếp trang
      // kế tiếp, đừng để danh sách đứng trống.
      if (!batch.length && page === 0) {
        void loadMoreSuggested(page + 1);
      }
    },
    [],
  );

  useEffect(() => {
    void loadMoreSuggested(0);
  }, [loadMoreSuggested]);

  /** Tự nạp thêm khi cuộn tới cuối danh sách gợi ý. */
  const suggestSentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = suggestSentinel.current;
    if (!el || playing) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const next = suggestPage + 1;
          setSuggestPage(next);
          void loadMoreSuggested(next);
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [suggestPage, loadMoreSuggested, playing]);

  // Video liên quan tới nội dung ĐANG XEM — tải theo trang, cuộn là có thêm.
  const [related, setRelated] = useState<VideoInfo[]>([]);
  const [relatedBusy, setRelatedBusy] = useState(false);
  const [relatedPage, setRelatedPage] = useState(0);
  const [relatedMore, setRelatedMore] = useState(false);
  const relatedBusyRef = useRef(false);
  const relatedVideoRef = useRef<VideoInfo | null>(null);

  const loadMoreRelated = useCallback(
    async (video: VideoInfo, page: number) => {
      if (relatedBusyRef.current) return;
      relatedBusyRef.current = true;
      if (page === 0) setRelatedBusy(true);
      else setRelatedMore(true);
      const batch = keepBuddhistVideos(
        await fetchRelatedPage(video, page).catch(() => []),
        true,
      );
      if (batch.length) {
        setRelated((prev) => {
          const seen = new Set(prev.map((v) => v.videoId));
          seen.add(video.videoId);
          const add = batch.filter((v) => !seen.has(v.videoId));
          return add.length ? [...prev, ...add] : prev;
        });
      }
      setRelatedBusy(false);
      setRelatedMore(false);
      relatedBusyRef.current = false;
    },
    [],
  );

  /** Mở trình phát: nạp trang đầu của video liên quan. */
  const openVideo = (v: VideoInfo) => {
    relatedVideoRef.current = v;
    setPlaying(v);
    setVideos([]);
    setSearched("");
    setMessage("");
    setRelated([]);
    setRelatedPage(0);
    void loadMoreRelated(v, 0);
  };

  /** Tự nạp thêm khi cuộn tới cuối danh sách liên quan. */
  const relatedSentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = relatedSentinel.current;
    if (!el || !playing || !relatedVideoRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const next = relatedPage + 1;
          setRelatedPage(next);
          void loadMoreRelated(relatedVideoRef.current!, next);
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [relatedPage, loadMoreRelated, playing]);

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

      {/* ---------- THANH TÌM KIẾM: micro bên trái, kính lúp bên phải ---------- */}
      {!playing ? (
        <div className="shrink-0 border-b border-border/60 bg-background/95 px-3 pb-3 backdrop-blur-md sm:px-4">
          <div className="mt-3 flex items-center gap-1 rounded-2xl border border-border/70 bg-card pr-1.5">
            {/* Micro: nói chủ đề, nằm bên TRÁI ô nhập */}
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
                  "relative ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
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
              className="h-12 min-w-0 flex-1 bg-transparent pl-1 text-[15px] text-foreground outline-none"
            />

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
      ) : null}

      {/* ---------- Nội dung cuộn: video đang phát, kết quả, gợi ý ---------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8 sm:px-4">
        {/* Trình phát GHIM ở đầu trang: danh sách bên dưới lướt riêng, trình
            phát không bị cuộn theo. */}
        {playing ? (
          <div className="sticky top-0 z-40 bg-background">
            <VideoPlayer
              video={playing}
              pinned
              onClose={() => {
                setPlaying(null);
                setRelated([]);
              }}
            />
          </div>
        ) : null}

        {/* Tiêu đề video đang xem */}
        {playing ? (
          <p className="mt-3 line-clamp-2 px-1 text-[14px] font-medium leading-snug">
            {playing.title || "Video"}
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


        {/* ĐANG XEM VIDEO: chỉ hiện video LIÊN QUAN tới nội dung đó. */}
        {playing ? (
          <section>
            {relatedBusy ? (
              <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                Đang tải video liên quan…
              </p>
            ) : null}

            {!relatedBusy && !related.length ? (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Chưa tải được video liên quan.
              </p>
            ) : null}

            <ul className="mt-3 space-y-1.5">
              {related.map((v) => (
                <li key={v.videoId}>
                  <button
                    type="button"
                    onClick={() => openVideo(v)}
                    className="flex w-full items-center gap-3.5 p-2 text-left transition hover:bg-muted/50"
                  >
                    <span className="relative shrink-0">
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-16 w-28 object-cover"
                      />
                      {v.duration ? (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] tabular-nums text-white">
                          {v.duration}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-foreground/95">
                        {v.title || "Video"}
                      </span>
                      {viewCountText(v.viewCount) ? (
                        <span className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          {viewCountText(v.viewCount)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* CHƯA XEM VIDEO: hiện danh sách gợi ý chung. */}
        {playing ? null : (
        <section>
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
                    <span className="line-clamp-2 block text-[15px] font-medium leading-snug text-foreground/95">
                      {v.title || "Video"}
                    </span>
                    {viewCountText(v.viewCount) ? (
                      <span className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        {viewCountText(v.viewCount)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {/* Cuộn tới đây thì nạp thêm gợi ý */}
          <div ref={suggestSentinel} className="h-1" />
          {suggestMore ? (
            <p className="mt-2 flex items-center justify-center gap-2 py-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              Đang tải thêm…
            </p>
          ) : null}
        </section>
        )}

      </div>
    </div>
  );
}
