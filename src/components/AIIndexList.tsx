import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { BookMarked, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type AIIndexKind = "suttas" | "vinaya" | "dictionary" | "commentary";

type IndexEntry = {
  id: string;
  title: string;
  pali?: string;
  desc?: string;
};

type IndexDoc = Doc<"aiDocs"> | null | undefined;

/**
 * Danh sách đề xuất do Trợ lý Phật học TỰ NẠP TOÀN BỘ — thay dữ liệu cứng cũ.
 * Cache dùng chung: người đầu mở là AI nạp (vài giây), người sau đọc tức thì.
 */
export function AIIndexList({
  indexKind,
  onOpen,
  emptyHint,
}: {
  indexKind: AIIndexKind;
  /** id + title do danh sách đề xuất cung cấp */
  onOpen(entry: IndexEntry): void;
  emptyHint?: string;
}) {
  const cached = useQuery(api.aiDocs.getDoc, {
    kind: `index-${indexKind}`,
    refId: "main",
  }) as IndexDoc;
  const cacheDoc = useMutation(api.aiDocs.cacheDoc);
  const generate = useAction(api.aiDocs.generateIndex);

  const [entries, setEntries] = useState<IndexEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const body = cached?.body ?? null;

  // Parse cache khi có
  useEffect(() => {
    if (!body || entries) return;
    try {
      setEntries(JSON.parse(body) as IndexEntry[]);
    } catch {
      /* cache hỏng — nạp lại */
    }
  }, [body, entries]);

  // Chưa có cache → AI tự nạp toàn bộ danh sách
  useEffect(() => {
    if (cached === undefined) return; // đang query
    if (cached !== null || entries || busy) return; // đã có cache/danh sách hoặc đang nạp
    setBusy(true);
    generate({ indexKind })
      .then(async (json) => {
        const parsed = JSON.parse(json) as IndexEntry[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Danh sách trống.");
        }
        setEntries(parsed);
        await cacheDoc({
          kind: `index-${indexKind}`,
          refId: "main",
          title: `Đề xuất ${indexKind}`,
          body: json,
          source: "Trợ lý Phật học tự nạp từ Kinh điển Pāli — truyền thống Theravāda",
        }).catch(() => undefined);
      })
      .catch((err: Error) => {
        toast.error(err.message);
      })
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cached, entries, busy, indexKind]);

  if (cached === undefined || (!entries && busy)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <Sparkles className="h-3.5 w-3.5" />
          Trợ lý Phật học đang tự nạp danh sách đề xuất từ Kinh điển Pāli…
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? "Chưa nạp được danh sách. Hãy thử lại sau."}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {entries.map((e, i) => (
        <button
          key={`${e.id}-${i}`}
          type="button"
          onClick={() => onOpen(e)}
          className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <BookMarked className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold group-hover:text-primary">
              {e.title}
            </span>
            {e.pali && (
              <span className="block truncate text-[11px] italic text-muted-foreground">
                {e.pali}
              </span>
            )}
            {e.desc && (
              <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {e.desc}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
