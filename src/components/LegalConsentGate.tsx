import { cn } from "@/lib/utils";
import { LegalDocs } from "@/components/LegalDocs";
import { Button } from "@/components/ui/button";
import { LEGAL_DOCS, type LegalDocKey } from "@/convex/legalContent";
import { Check, FileText, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const CONSENT_KEY = "dharma-legal-consent-v2";

type ConsentRecord = {
  version: string;
  documents: Partial<Record<LegalDocKey, string>>;
};

const DOC_META: Record<LegalDocKey, { label: string; icon: typeof FileText }> = {
  "privacy-policy": { label: "Chính sách quyền riêng tư", icon: FileText },
  "terms-of-service": { label: "Điều khoản sử dụng", icon: Scale },
};

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (
      typeof parsed.version !== "string" ||
      !parsed.documents ||
      typeof parsed.documents !== "object"
    ) {
      return null;
    }
    return {
      version: parsed.version,
      documents: parsed.documents as Partial<Record<LegalDocKey, string>>,
    };
  } catch {
    return null;
  }
}

/**
 * Mỗi lần nội dung pháp lý thay đổi, người dùng phải đọc lại phần thay đổi và
 * xác nhận đồng ý. Bản đồ nội dung đã đồng ý được giữ cục bộ để không yêu cầu
 * đọc lại những tài liệu không thay đổi.
 */
export function LegalConsentGate() {
  const [consent, setConsent] = useState<ConsentRecord | null | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [readDocuments, setReadDocuments] = useState<Record<LegalDocKey, boolean>>({
    "privacy-policy": false,
    "terms-of-service": false,
  });

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const changedDocuments = useMemo(() => {
    if (!consent) return LEGAL_DOCS;
    return LEGAL_DOCS.filter((doc) => consent.documents[doc.key] !== doc.content);
  }, [consent]);

  const hasReadAll = changedDocuments.every((doc) => readDocuments[doc.key]);
  const isFirstUse = consent === null;
  const hasLegalChanges = !isFirstUse && changedDocuments.length > 0;

  if (consent !== undefined && changedDocuments.length === 0) return null;

  const markDocumentRead = (key: LegalDocKey) => {
    setReadDocuments((current) => ({ ...current, [key]: true }));
  };

  const accept = () => {
    if (!checked || !hasReadAll) return;
    const nextDocuments = Object.fromEntries(
      LEGAL_DOCS.map((doc) => [doc.key, doc.content]),
    ) as Partial<Record<LegalDocKey, string>>;
    const nextConsent: ConsentRecord = {
      version: LEGAL_DOCS[0]?.version ?? "unknown",
      documents: { ...consent?.documents, ...nextDocuments },
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(nextConsent));
    } catch {
      // Vẫn cho phép tiếp tục trong phiên hiện tại nếu trình duyệt chặn lưu trữ.
    }
    setConsent(nextConsent);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-5 shadow-2xl sm:p-7">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="mt-4 text-center text-xl font-extrabold tracking-tight">
          {isFirstUse ? "Trước khi sử dụng ứng dụng" : "Có bản cập nhật pháp lý"}
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
          {isFirstUse
            ? "Trợ lý Phật học cần bạn đọc và đồng ý với chính sách quyền riêng tư và điều khoản sử dụng trước khi bắt đầu."
            : "Chính sách quyền riêng tư hoặc điều khoản sử dụng đã được cập nhật. Bạn cần đọc các phần thay đổi và xác nhận đồng ý để tiếp tục sử dụng ứng dụng."}
        </p>

        {showLegal ? (
          <div className="mt-5">
            <LegalDocs
              documents={changedDocuments}
              baselineContents={consent?.documents}
              changedOnly={hasLegalChanges}
              onReachEnd={markDocumentRead}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLegal(false)}
              className="mt-4 w-full rounded-full"
            >
              Quay lại
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {changedDocuments.map((doc) => {
                const meta = DOC_META[doc.key];
                const Icon = meta.icon;
                return (
                  <button
                    key={doc.key}
                    type="button"
                    onClick={() => setShowLegal(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/45 px-3 py-3 text-sm font-semibold transition hover:bg-accent"
                  >
                    <Icon className="size-4 text-primary" /> {meta.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {hasReadAll
                ? isFirstUse
                  ? "Bạn đã đọc đến cuối cả hai tài liệu."
                  : "Bạn đã đọc đến cuối các phần vừa thay đổi."
                : hasLegalChanges
                  ? "Hãy mở và đọc đến cuối các phần được đánh dấu thay đổi trước khi tích đồng ý."
                  : "Hãy mở và đọc đến cuối cả hai tài liệu trước khi tích đồng ý."}
            </p>
            <label
              className={cn(
                "mt-2 flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/35 p-3 text-sm leading-relaxed",
                hasReadAll ? "cursor-pointer" : "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!hasReadAll}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                Tôi đã đọc phần nội dung mới thay đổi và đồng ý tiếp tục sử dụng ứng dụng.
              </span>
            </label>

            <Button
              type="button"
              onClick={accept}
              disabled={!checked || !hasReadAll}
              className="mt-4 w-full gap-2 rounded-full"
            >
              <Check className="size-4" /> Đồng ý và tiếp tục
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {isFirstUse
                ? "Thông báo này chỉ hiển thị một lần khi bạn cài và mở ứng dụng lần đầu."
                : "Chỉ những phần thay đổi mới được yêu cầu đọc lại."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
