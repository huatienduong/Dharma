import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAction, useMutation, useQuery } from "convex/react";
import { ImageOff, Loader2, ScrollText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export type AIDocKind =
  | "sutta"
  | "vinaya"
  | "abhidhamma"
  | "dictionary"
  | "commentary"
  | "subcommentary";

type GenerateAction =
  | typeof api.aiDocs.generateSutta
  | typeof api.aiDocs.generateVinaya
  | typeof api.aiDocs.generateAbhidhamma
  | typeof api.aiDocs.generateDictEntry
  | typeof api.aiDocs.generateCommentary
  | typeof api.aiDocs.generateSubcommentary;

function actionFor(kind: AIDocKind): GenerateAction {
  switch (kind) {
    case "sutta":
      return api.aiDocs.generateSutta as GenerateAction;
    case "vinaya":
      return api.aiDocs.generateVinaya as GenerateAction;
    case "abhidhamma":
      return api.aiDocs.generateAbhidhamma as GenerateAction;
    case "dictionary":
      return api.aiDocs.generateDictEntry as GenerateAction;
    case "commentary":
      return api.aiDocs.generateCommentary as GenerateAction;
    case "subcommentary":
      return api.aiDocs.generateSubcommentary as GenerateAction;
  }
}

/* ------------------------------------------------------------------ */
/* Thumbnail tự nạp từ internet (Wikipedia REST — không cần khóa)      */
/* Al tự lấy hình ảnh minh họa cho chủ đề: tượng Phật, kinh sách...    */
/* ------------------------------------------------------------------ */

const thumbCache = new Map<string, string | null>();

function wikiTerm(kind: AIDocKind, refId: string, title?: string): string {
  const t = (title ?? refId).toLowerCase();
  if (kind === "vinaya") return "Vinaya";
  if (kind === "abhidhamma") {
    if (/citta.*vithi|tien-trinh|citta-vīthi/.test(t)) return "Citta (Buddhism)";
    if (/patthana|24 duyen|paccaya/.test(t)) return "Paṭṭhāna";
    if (/cetasika|tam so/.test(t)) return "Mental factors (Buddhism)";
    if (/rupa|sac phap|vat chat/.test(t)) return "Rūpa";
    if (/nibbana|niet ban/.test(t)) return "Nirvana (Buddhism)";
    if (/kamma|nghiep/.test(t)) return "Karma in Buddhism";
    if (/visuddhimagga/.test(t)) return "Visuddhimagga";
    if (/abhidhammattha|vi dieu phap|thang phap/.test(t)) return "Abhidhammattha-saṅgaha";
    return "Abhidhamma Piṭaka";
  }
  if (kind === "dictionary") {
    if (/nibb|niet/.test(t)) return "Nirvana (Buddhism)";
    if (/anicca/.test(t)) return "Impermanence";
    if (/dukkha/.test(t)) return "Duḥkha";
    if (/anatta/.test(t)) return "Anattā";
    if (/sangha|tăng/.test(t)) return "Sangha";
    if (/kamma|nghiệp/.test(t)) return "Karma in Buddhism";
    if (/vipass/.test(t)) return "Vipassanā";
    if (/samatha|jhana|thiền định/.test(t)) return "Dhyāna in Buddhism";
    if (/metta|từ bi/.test(t)) return "Mettā";
    if (/upa/.test(t)) return "Uposatha";
    if (/bodh|bồ đề/.test(t)) return "Bodhi";
    if (/pariyatti|tipitaka|piṭaka/.test(t)) return "Tripiṭaka";
    return "Buddhism";
  }
  if (kind === "commentary") return "Atthakatha";
  if (kind === "subcommentary") return "Pali Canon";
  // sutta: tìm theo tên chủ đề quen thuộc
  if (/dhammacakka|chuyển pháp/.test(t)) return "Dhammacakkappavattana Sutta";
  if (/mahasatipa|niệm thật/.test(t)) return "Satipaṭṭhāna Sutta";
  if (/anapana|niệm hơi thở/.test(t)) return "Ānāpānasati Sutta";
  if (/metta/.test(t)) return "Metta Sutta";
  if (/parinibb|mahaparinib/.test(t)) return "Parinibbāna Sutta";
  if (/dhammapada|pháp cú/.test(t)) return "Dhammapada";
  if (/jataka|bổn sinh/.test(t)) return "Jātaka tales";
  if (/sigalovada|gia chủ/.test(t)) return "Sigālovāda Sutta";
  if (/mangala|cát tường/.test(t)) return "Maṅgala Sutta";
  if (/ratana|bảo/ .test(t)) return "Ratana Sutta";
  if (/kaccana|trung đạo/.test(t)) return "Kaccānagotta Sutta";
  return "Gautama Buddha";
}

export function DocThumb({
  kind,
  refId,
  title,
  size = "w-20 h-20",
}: {
  kind: AIDocKind;
  refId: string;
  title?: string;
  size?: string;
}) {
  const key = `${kind}:${title ?? refId}`;
  const [src, setSrc] = useState<string | null | undefined>(thumbCache.get(key));

  useEffect(() => {
    if (src !== undefined) return;
    let cancelled = false;
    const term = encodeURIComponent(wikiTerm(kind, refId, title));
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${term}?redirect=true`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { thumbnail?: { source?: string } } | null) => {
        if (cancelled) return;
        const url = j?.thumbnail?.source ?? null;
        thumbCache.set(key, url);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) {
          thumbCache.set(key, null);
          setSrc(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (src === undefined) {
    return <span className={`${size} shrink-0 animate-pulse rounded-xl bg-muted`} />;
  }
  if (src === null) {
    return (
      <span
        className={`${size} flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted text-muted-foreground/50`}
        aria-hidden
      >
        <ImageOff className="h-5 w-5" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${size} shrink-0 rounded-xl border border-border/60 object-cover`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Đề xuất nội dung liên quan sau khi đọc                              */
/* ------------------------------------------------------------------ */

type RelatedItem = { kind: AIDocKind; refId: string; title: string; desc: string };

function relatedFor(kind: AIDocKind, refId: string, title?: string): RelatedItem[] {
  const t = (title ?? refId).toLowerCase();
  if (kind === "dictionary") {
    if (/anicca/.test(t))
      return [
        { kind: "dictionary", refId: "dukkha", title: "Dukkha — Khổ", desc: "Sự thật về khổ đế" },
        { kind: "dictionary", refId: "anatta", title: "Anattā — Vô ngã", desc: "Ba đặc tính vô thường — khổ — vô ngã" },
        { kind: "dictionary", refId: "vipassana", title: "Vipassanā — Quán", desc: "Thiền quán chiếu ba đặc tính" },
      ];
    if (/nibb|niet/.test(t))
      return [
        { kind: "dictionary", refId: "magga", title: "Magga — Đạo", desc: "Con đường diệt khổ" },
        { kind: "dictionary", refId: "nibbana-2", title: "Niết bàn hữu dư / vô dư", desc: "Hai tầng mặt giải thoát" },
        { kind: "dictionary", refId: "arhat", title: "Arahant", desc: "Bậc đã chứng ngộ" },
      ];
  }
  if (kind === "sutta" || kind === "subcommentary") {
    return [
      { kind: "commentary", refId, title: `Chú giải: ${title ?? refId}`, desc: "Aṭṭhakathā giải nghĩa từng đoạn" },
      { kind: "subcommentary", refId, title: `Luận giải sâu hơn`, desc: "Bố cục luận lý + câu hỏi thường gặp" },
      { kind: "dictionary", refId: "anicca", title: "Anicca — Vô thường", desc: "Thuật ngữ trung tâm trong kinh" },
    ];
  }
  if (kind === "vinaya") {
    return [
      { kind: "dictionary", refId: "patimokkha", title: "Pātimokkha", desc: "Bộ giới bổn của Tỳ kheo" },
      { kind: "vinaya", refId: "patimokkha", title: "Giới bổn Pātimokkha", desc: "227 giới cốt lõi" },
      { kind: "dictionary", refId: "sangha", title: "Sangha — Tăng già", desc: "Cộng đồng xuất gia" },
    ];
  }
  if (kind === "abhidhamma") {
    return [
      { kind: "abhidhamma", refId: "citta", title: "Citta — Tâm", desc: "89/121 tâm theo Vi Diệu Pháp" },
      { kind: "abhidhamma", refId: "cetasika", title: "Cetasika — Tâm sở", desc: "52 tâm sở đồng sinh với tâm" },
      { kind: "abhidhamma", refId: "patthana", title: "Paṭṭhāna — 24 duyên", desc: "Bộ luận về nhân duyên" },
    ];
  }
  // commentary
  return [
    { kind: "subcommentary", refId, title: `Luận giải: ${title ?? refId}`, desc: "Phân tích giáo lý hiện đại" },
    { kind: "sutta", refId, title: `Bản kinh gốc`, desc: "Đọc kinh văn đầy đủ" },
    { kind: "dictionary", refId: "atthakatha", title: "Aṭṭhakathā", desc: "Truyền thống chú giải Mahāvihāra" },
  ];
}

function RelatedDocs({ kind, refId, title }: { kind: AIDocKind; refId: string; title?: string }) {
  const navigate = useNavigate();
  const items = useMemo(
    () => relatedFor(kind, refId, title),
    [kind, refId, title],
  );

  return (
    <section className="mt-6">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Nội dung liên quan — đề xuất cho bạn
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {items.map((r, i) => (
          <button
            key={`${r.kind}-${r.refId}-${i}`}
            type="button"
            onClick={() => navigate(r.kind === "sutta" ? `/suttas/${r.refId}` : r.kind === "vinaya" ? `/vinaya/${r.refId}` : r.kind === "abhidhamma" ? `/abhidhamma/${r.refId}` : `/dictionary`)}
            className="group flex items-start gap-2.5 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition hover:border-primary/40 hover:bg-accent/40"
          >
            {r.kind !== "dictionary" && (
              <DocThumb kind={r.kind} refId={r.refId} title={r.title} size="h-12 w-12" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold group-hover:text-primary">
                {r.title}
              </span>
              <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {r.desc}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Render markdown đơn giản: "## ", "• ", "** **", đoạn thường        */
/* ------------------------------------------------------------------ */

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

function MarkdownView({ body }: { body: string }) {
  const blocks = useMemo(() => {
    const lines = body.split("\n");
    const out: { type: "h2" | "bullet" | "p"; text: string; bullets?: string[] }[] = [];
    let current: { type: "h2" | "bullet" | "p"; text: string; bullets?: string[] } | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("## ")) {
        if (current) out.push(current);
        current = { type: "h2", text: line.slice(3) };
      } else if (line.startsWith("• ") || line.startsWith("- ")) {
        const item = line.replace(/^[•-]\s*/, "");
        if (current?.type === "bullet") {
          current.bullets?.push(item);
        } else {
          if (current) out.push(current);
          current = { type: "bullet", text: item, bullets: [item] };
        }
      } else {
        if (current) out.push(current);
        current = { type: "p", text: line };
      }
    }
    if (current) out.push(current);
    return out;
  }, [body]);

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h2 key={i} className="border-b border-border/70 pb-1 pt-3 text-base font-bold text-foreground first:pt-0">
              {b.text}
            </h2>
          );
        }
        if (b.type === "bullet" && b.bullets) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.bullets.map((li, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-0.5 text-muted-foreground">•</span>
                  <span className="flex-1">{renderInline(li)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lõi bài đọc (không bọc AppShell — nhúng được vào trang bất kỳ)      */
/* ------------------------------------------------------------------ */

export function AIDocArticle({
  kind,
  refId,
  title,
  pali,
  extra,
  showRelated = true,
  showThumb = true,
}: {
  kind: AIDocKind;
  refId: string;
  title?: string;
  /** Tên/thuật ngữ Pāli của tài liệu — hiển thị ngay dưới tiêu đề */
  pali?: string;
  extra?: string;
  showRelated?: boolean;
  showThumb?: boolean;
}) {
  const cached = useQuery(api.aiDocs.getDoc, { kind, refId });
  const cacheDoc = useMutation(api.aiDocs.cacheDoc);

  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const genAction = useAction(actionFor(kind));

  const body = cached?.body ?? pendingBody;
  const docTitle = cached?.title || title || refId;

  // Tự sinh AI khi chưa có cache — AI tự nạp dữ liệu mỗi lần tra cứu mới
  // (không yêu cầu đăng nhập: hành vi AI cho cả khách + thành viên)
  useEffect(() => {
    if (cached || generating || pendingBody !== null) return;
    setGenerating(true);
    genAction({ refId, title, extra })
      .then((text) => {
        const m = text.match(/^Nguồn:\s*(.+)$/im);
        const src = m ? m[1].trim() : "Kinh điển Pāli — truyền thống Theravāda | Phiên dịch: Trợ lý Phật học biên soạn theo truyền thống Mahāvihāra";
        const clean = text.replace(/^Nguồn:\s*.+$/im, "").trim();
        setPendingBody(clean);
        void cacheDoc({ kind, refId, title: title ?? docTitle, body: clean, source: src }).catch(() => undefined);
      })
      .catch(() => {
        setPendingBody("");
      })
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached, refId]);

  const loading = cached === undefined || (generating && !pendingBody);

  return (
    <div>
      <article className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
        {/* Header bài đọc: thumbnail tự nạp + tiêu đề */}
        {showThumb && (
          <div className="mb-4 flex items-start gap-3.5 border-b border-border/60 pb-4">
            <DocThumb kind={kind} refId={refId} title={docTitle} size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {kind === "sutta" ? "Bản kinh đầy đủ" : kind === "vinaya" ? "Luật tạng" : kind === "abhidhamma" ? "Luận tạng — Abhidhamma" : kind === "dictionary" ? "Từ điển Phật học" : kind === "commentary" ? "Chú giải Aṭṭhakathā" : "Luận giải Ṭīkā"}
              </p>
              <h3 className="mt-1 text-base font-bold leading-snug">{docTitle}</h3>
              {pali && <p className="mt-0.5 text-xs italic text-gold">{pali}</p>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2.5 text-xs font-medium text-foreground/90">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang biên soạn…
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" style={{ maxWidth: `${88 - ((i * 13) % 30)}%` }} />
            ))}
          </div>
        ) : body ? (
          <>
            <MarkdownView body={body} />
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm font-medium">Chưa tạo được nội dung</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Có thể khóa AI chưa được cấu hình hoặc có lỗi kết nối. Hãy thử lại.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setPendingBody(null)}>
              Thử lại
            </Button>
          </div>
        )}
      </article>

      {/* Đề xuất nội dung liên quan sau khi đọc */}
      {showRelated && body && (
        <RelatedDocs kind={kind} refId={refId} title={docTitle} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trang đọc độc lập (bọc AppShell sẵn)                                */
/* ------------------------------------------------------------------ */

export function AIDocReader({
  kind,
  refId,
  title,
  pali,
  extra,
  appTitle,
  appSubtitle,
  headerExtra,
  children,
}: {
  kind: AIDocKind;
  refId: string;
  title?: string;
  pali?: string;
  extra?: string;
  appTitle: string;
  appSubtitle?: string;
  headerExtra?: ReactNode;
  children?: ReactNode;
}) {
  const cached = useQuery(api.aiDocs.getDoc, { kind, refId });
  const docTitle = cached?.title || title || refId;

  return (
    <AppShell title={appTitle} subtitle={appSubtitle}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ScrollText className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate">{docTitle}</span>
              {pali && (
                <span className="block text-xs font-normal italic text-gold">
                  {pali}
                </span>
              )}
            </span>
          </h1>
          {headerExtra}
        </div>

        {children}

        <AIDocArticle
          kind={kind}
          refId={refId}
          title={title}
          pali={pali}
          extra={extra}
        />
      </div>
    </AppShell>
  );
}
