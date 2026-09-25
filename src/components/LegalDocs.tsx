import { api } from "@/convex/_generated/api";
import { LEGAL_DOCS } from "@/convex/legalContent";
import { useQuery } from "convex/react";
import { useState } from "react";
import { FileText, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type LegalKey = "privacy-policy" | "terms-of-service";

type LegalMeta = {
  latestVersion?: string;
  releaseNotes?: string;
  releasedAt?: number;
} | null | undefined;

const DOCS: {
  key: LegalKey;
  label: string;
  icon: typeof FileText;
}[] = [
  { key: "privacy-policy", label: "Quyền riêng tư", icon: FileText },
  { key: "terms-of-service", label: "Điều khoản", icon: Scale },
];

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

export function LegalDocs() {
  const [tab, setTab] = useState<LegalKey>("privacy-policy");
  const privacy = useQuery(api.library.getLegalDoc, { key: "privacy-policy" });
  const terms = useQuery(api.library.getLegalDoc, { key: "terms-of-service" });

  const metaFor = (key: LegalKey): LegalMeta =>
    key === "privacy-policy" ? privacy : terms;

  const active = DOCS.find((d) => d.key === tab)!;
  const meta = metaFor(tab);
  // Server là nguồn hiển thị (cron tự đồng bộ theo mã nguồn); server chưa
  // sẵn sàng thì dùng trực tiếp bản chuẩn trong mã nguồn — cùng một nguồn.
  const sourceDoc = LEGAL_DOCS.find((d) => d.key === tab)!;
  const content = meta?.releaseNotes?.trim()
    ? meta.releaseNotes
    : sourceDoc.content;

  return (
    <div className="space-y-3 pt-1">
      {/* Chọn tài liệu */}
      <div className="grid grid-cols-2 gap-2">
        {DOCS.map((d) => {
          const Icon = d.icon;
          const isActive = d.key === tab;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setTab(d.key)}
              aria-pressed={isActive}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Phiên bản tài liệu */}
      <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-2.5">
        <p className="text-xs font-semibold">Phiên bản tài liệu</p>
        <p className="text-xs text-muted-foreground">
          {meta?.latestVersion ?? sourceDoc.version}
        </p>
      </div>

      {/* Nội dung */}
      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-4">
        <LegalText text={content} />
      </div>
    </div>
  );
}
