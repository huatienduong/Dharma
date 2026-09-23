import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import {
  ChevronRight,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Topic = { id: string; title: string; desc?: string };

type Lesson = {
  name: string;
  pali?: string;
  tagline?: string;
  source?: string;
  suggestedMin?: number;
  difficulty?: string;
  benefits?: string[];
  steps?: Array<{ title: string; text: string }>;
  tips?: string[];
  body?: string;
};

const TOPICS_KEY = "ds-meditation-topics";

function loadCachedTopics(): Topic[] | null {
  try {
    const raw = localStorage.getItem(TOPICS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Topic[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * KHÁM PHÁ THÊM — Trợ lý Phật học TỰ ĐỀ XUẤT chủ đề thiền mới và tự biên
 * soạn bài hướng dẫn chi tiết để thực hành ngay trong ứng dụng.
 * Danh sách chủ đề cache trên thiết bị; bài học biên soạn theo yêu cầu.
 */
export function AIMeditationExplorer() {
  const genTopics = useAction(api.aiDocs.generateMeditationTopics);
  const genLesson = useAction(api.aiDocs.generateMeditationLesson);

  const [topics, setTopics] = useState<Topic[] | null>(loadCachedTopics);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTopic, setLessonTopic] = useState<string | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  const fetchTopics = () => {
    setLoadingTopics(true);
    genTopics({})
      .then((json) => {
        const parsed = JSON.parse(json) as Topic[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTopics(parsed);
          try {
            localStorage.setItem(TOPICS_KEY, JSON.stringify(parsed));
          } catch {
            /* bỏ qua */
          }
        }
      })
      .catch(() => toast.error("Không nạp được chủ đề thiền, thử lại sau."))
      .finally(() => setLoadingTopics(false));
  };

  // Chưa có cache → tự nạp 1 lần khi mở trang
  useEffect(() => {
    if (topics) return;
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLesson = (t: Topic) => {
    setLessonTopic(t.title);
    setLoadingLesson(true);
    setLesson(null);
    genLesson({ topic: t.title })
      .then((json) => {
        const parsed = JSON.parse(json) as Lesson;
        if (!parsed?.name) throw new Error("Bài học rỗng.");
        setLesson(parsed);
      })
      .catch(() => {
        toast.error("Không biên soạn được bài thiền này, thử lại sau.");
        setLessonTopic(null);
      })
      .finally(() => setLoadingLesson(false));
  };

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="h-4 w-4 text-gold" />
        Khám phá thêm — Trợ lý Phật học đề xuất
      </h2>

      {loadingTopics && !topics ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Trợ lý Phật học đang gợi ý chủ đề thiền mới…
        </div>
      ) : !topics ? (
        <button
          type="button"
          onClick={fetchTopics}
          className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:bg-accent"
        >
          Tải gợi ý chủ đề thiền
        </button>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openLesson(t)}
                className="group flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 p-3.5 text-left transition hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary">
                    {t.title}
                  </span>
                  {t.desc && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.desc}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={fetchTopics}
            disabled={loadingTopics}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            {loadingTopics ? "Đang đổi chủ đề…" : "Gợi ý chủ đề khác"}
          </button>
        </>
      )}

      {/* Bài học đang biên soạn */}
      {loadingLesson && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-3.5 py-3 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Trợ lý Phật học đang biên soạn bài «{lessonTopic}»…
        </div>
      )}

      {/* Bài học chi tiết — overlay đọc toàn màn hình */}
      {lesson && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/60 bg-background px-3">
            <button
              type="button"
              onClick={() => setLesson(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-accent"
              aria-label="Đóng bài học"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold">{lesson.name}</p>
          </div>

          <div className="mx-auto max-w-3xl space-y-5 px-4 pb-16 pt-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {lesson.name}
              </h1>
              {lesson.pali && (
                <p className="mt-0.5 text-sm italic text-gold">{lesson.pali}</p>
              )}
              {lesson.tagline && (
                <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">
                  {lesson.tagline}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {lesson.difficulty && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    {lesson.difficulty}
                  </span>
                )}
                {lesson.suggestedMin && (
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    Gợi ý {lesson.suggestedMin} phút
                  </span>
                )}
                {lesson.source && (
                  <span className="rounded-full bg-gold/10 px-2.5 py-1 font-medium text-gold">
                    {lesson.source}
                  </span>
                )}
              </div>
            </div>

            {lesson.body && (
              <div className="whitespace-pre-wrap rounded-xl border border-border/60 bg-card/60 p-4 text-sm leading-[1.85] text-foreground/85">
                {lesson.body}
              </div>
            )}

            {lesson.benefits && lesson.benefits.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-card/60 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lợi ích
                </h3>
                <ul className="space-y-1.5">
                  {lesson.benefits.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {lesson.steps && lesson.steps.length > 0 && (
              <section className="space-y-3">
                {lesson.steps.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/60 bg-card/60 p-4"
                  >
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.85] text-foreground/85">
                      {s.text}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {lesson.tips && lesson.tips.length > 0 && (
              <section className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">
                  Lời khuyên thực hành
                </h3>
                <ul className="space-y-1.5">
                  {lesson.tips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
