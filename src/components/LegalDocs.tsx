import { LEGAL_DOCS, type LegalDoc, type LegalDocKey } from "@/convex/legalContent";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type LegalDocsProps = {
  onReachEnd?: (key: LegalDocKey) => void;
  documents?: LegalDoc[];
  baselineContents?: Partial<Record<LegalDocKey, string>>;
  changedOnly?: boolean;
};

const DOC_META: Record<LegalDocKey, { label: string; icon: typeof FileText }> = {
  "privacy-policy": { label: "Quyền riêng tư", icon: FileText },
  "terms-of-service": { label: "Điều khoản", icon: Scale },
};

/** Chia tài liệu thành các khối để người dùng chỉ phải đọc phần vừa thay đổi. */
function changedSections(current: string, previous: string | undefined): string {
  if (!previous) return current;
  const previousBlocks = new Set(
    previous
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean),
  );
  const changed = current
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !previousBlocks.has(block));

  return changed.length > 0
    ? changed.join("\n\n")
    : "Nội dung này không có thay đổi nào so với phiên bản bạn đã đồng ý.";
}

/** Hiển thị text đơn giản: **đậm** thành <strong>, xuống dòng giữ nguyên. */
function LegalText({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 text-[13.5px] leading-relaxed text-foreground/90">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} className="whitespace-pre-wrap">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-bold text-foreground">
                  {part}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function LegalDocs({
  onReachEnd,
  documents = LEGAL_DOCS,
  baselineContents,
  changedOnly = false,
}: LegalDocsProps) {
  const [tab, setTab] = useState<LegalDocKey>(documents[0]?.key ?? "privacy-policy");
  const contentRef = useRef<HTMLDivElement>(null);
  const sourceDoc = documents.find((doc) => doc.key === tab) ?? documents[0];
  const displayContent = useMemo(
    () =>
      sourceDoc
        ? changedOnly
          ? changedSections(sourceDoc.content, baselineContents?.[sourceDoc.key])
          : sourceDoc.content
        : "",
    [baselineContents, changedOnly, sourceDoc],
  );

  useEffect(() => {
    if (!documents.some((doc) => doc.key === tab)) {
      setTab(documents[0]?.key ?? "privacy-policy");
    }
  }, [documents, tab]);

  useEffect(() => {
    const element = contentRef.current;
    if (element && element.scrollHeight <= element.clientHeight + 4) {
      onReachEnd?.(sourceDoc.key);
    }
  }, [onReachEnd, sourceDoc.key, displayContent]);

  if (!sourceDoc) return null;

  return (
    <div className="space-y-3 pt-1">
      {changedOnly && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Bạn chỉ cần đọc các phần được đánh dấu là nội dung mới thay đổi. Cuộn đến cuối phần thay đổi của tài liệu để tiếp tục.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {documents.map((doc) => {
          const meta = DOC_META[doc.key];
          const Icon = meta.icon;
          const isActive = doc.key === sourceDoc.key;
          return (
            <button
              key={doc.key}
              type="button"
              onClick={() => setTab(doc.key)}
              aria-pressed={isActive}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-2.5">
        <p className="text-xs font-semibold">Phiên bản tài liệu</p>
        <p className="text-xs text-muted-foreground">{sourceDoc.version}</p>
      </div>

      <div
        ref={contentRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
            onReachEnd?.(sourceDoc.key);
          }
        }}
        className="max-h-[420px] overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-4"
      >
        <LegalText text={displayContent} />
      </div>
    </div>
  );
}
