import { AppShell } from "@/components/AppShell";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2, ScrollText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

export type AIDocKind =
  | "sutta"
  | "vinaya"
  | "dictionary"
  | "commentary"
  | "subcommentary";

type GenerateAction =
  | typeof api.aiDocs.generateSutta
  | typeof api.aiDocs.generateVinaya
  | typeof api.aiDocs.generateDictEntry
  | typeof api.aiDocs.generateCommentary
  | typeof api.aiDocs.generateSubcommentary;

function actionFor(kind: AIDocKind): GenerateAction {
  switch (kind) {
    case "sutta":
      return api.aiDocs.generateSutta as GenerateAction;
    case "vinaya":
      return api.aiDocs.generateVinaya as GenerateAction;
    case "dictionary":
      return api.aiDocs.generateDictEntry as GenerateAction;
    case "commentary":
      return api.aiDocs.generateCommentary as GenerateAction;
    case "subcommentary":
      return api.aiDocs.generateSubcommentary as GenerateAction;
  }
}

/* ------------------------------------------------------------------ */
/* Render markdown đơn giản: "## ", "• ", "** **", đoạn thường        */
/* ------------------------------------------------------------------ */

function renderInline(text: string): ReactNode[] {
  // Tách **đậm** ra khỏi đoạn thường
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
      } else if (/^Nguồn:/i.test(line)) {
        if (current) out.push(current);
        current = null;
        out.push({ type: "p", text: line, });
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
            <h2 key={i} className="border-b border-gold/25 pb-1 pt-3 text-base font-bold text-foreground first:pt-0">
              {b.text}
            </h2>
          );
        }
        if (b.type === "bullet" && b.bullets) {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.bullets.map((li, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-0.5 text-gold">•</span>
                  <span className="flex-1">{renderInline(li)}</span>
                </li>
              ))}
            </ul>
          );
        }
        // Dòng Nguồn: hiển thị nổi bật
        if (/^Nguồn:/i.test(b.text)) {
          return (
            <p
              key={i}
              className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-medium text-foreground/90"
            >
              📜 {renderInline(b.text)}
            </p>
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
  extra,
}: {
  kind: AIDocKind;
  refId: string;
  title?: string;
  extra?: string;
}) {
  const { isAuthenticated } = useAuth();
  const cached = useQuery(api.aiDocs.getDoc, { kind, refId });
  const cacheDoc = useMutation(api.aiDocs.cacheDoc);

  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const genAction = useAction(actionFor(kind));

  const body = cached?.body ?? pendingBody;
  const source = cached?.source ?? pendingSource;
  const docTitle = cached?.title || title || refId;

  // Tự sinh AI khi chưa có cache (một lần mỗi refId)
  useEffect(() => {
    if (cached || generating || pendingBody !== null || !isAuthenticated) return;
    setGenerating(true);
    genAction({ refId, title, extra })
      .then((text) => {
        // Tách dòng Nguồn: cuối văn bản
        const m = text.match(/^Nguồn:\s*(.+)$/im);
        const src = m ? m[1].trim() : "Kinh điển Pāli — truyền thống Theravāda";
        const clean = text.replace(/^Nguồn:\s*.+$/im, "").trim();
        setPendingBody(clean);
        setPendingSource(src);
        // Lưu cache dùng chung (best effort)
        void cacheDoc({
          kind,
          refId,
          title: title ?? docTitle,
          body: clean,
          source: src,
        }).catch(() => undefined);
      })
      .catch((err: Error) => {
        toast.error(err.message);
        setPendingBody(""); // hiển thị thông báo lỗi thay vì treo
      })
      .finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached, refId, isAuthenticated]);

  const loading = cached === undefined || (generating && !pendingBody);

  return (
    <article className="rounded-2xl border border-border/60 bg-card/60 p-5 sm:p-6">
      {loading ? (
        <div className="space-y-3">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-medium text-foreground/90">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Trợ lý AI đang biên soạn nội dung đầy đủ theo truyền thống Theravāda…
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ maxWidth: `${88 - ((i * 13) % 30)}%` }} />
          ))}
        </div>
      ) : body ? (
        <>
          <MarkdownView body={body} />
          {source && (
            <p className="mt-5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs leading-relaxed text-foreground/90">
              <strong className="text-gold">Nguồn bài kinh:</strong> {source}
            </p>
          )}
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
  );
}

/* ------------------------------------------------------------------ */
/* Trang đọc độc lập (bọc AppShell sẵn)                                */
/* ------------------------------------------------------------------ */

export function AIDocReader({
  kind,
  refId,
  title,
  extra,
  appTitle,
  appSubtitle,
  headerExtra,
  children,
}: {
  kind: AIDocKind;
  refId: string;
  title?: string;
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
            <ScrollText className="h-5 w-5 text-gold" />
            {docTitle}
          </h1>
          {headerExtra}
        </div>

        {children}

        <AIDocArticle kind={kind} refId={refId} title={title} extra={extra} />
      </div>
    </AppShell>
  );
}
