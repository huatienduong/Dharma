import { LegalDocs } from "@/components/LegalDocs";
import { Button } from "@/components/ui/button";
import { Check, FileText, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const CONSENT_KEY = "dharma-legal-consent-v1";

/**
 * Chỉ hiện một lần trên mỗi thiết bị/phiên cài ứng dụng. Sau khi người dùng
 * đồng ý, lựa chọn được lưu cục bộ và không hỏi lại ở các lần mở sau.
 */
export function LegalConsentGate() {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(CONSENT_KEY) === "accepted");
    } catch {
      setAccepted(false);
    }
  }, []);

  if (accepted) return null;

  const accept = () => {
    if (!checked) return;
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // Vẫn cho phép tiếp tục trong phiên hiện tại nếu trình duyệt chặn lưu trữ.
    }
    setAccepted(true);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-background/95 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-5 shadow-2xl sm:p-7">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-8" />
        </div>
        <h1 className="mt-4 text-center text-xl font-extrabold tracking-tight">
          Trước khi sử dụng ứng dụng
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
          Trợ lý Phật học cần bạn đọc và đồng ý với chính sách quyền riêng tư
          và điều khoản sử dụng trước khi bắt đầu.
        </p>

        {showLegal ? (
          <div className="mt-5">
            <LegalDocs />
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
              <button
                type="button"
                onClick={() => setShowLegal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/45 px-3 py-3 text-sm font-semibold transition hover:bg-accent"
              >
                <FileText className="size-4 text-primary" /> Chính sách quyền riêng tư
              </button>
              <button
                type="button"
                onClick={() => setShowLegal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/45 px-3 py-3 text-sm font-semibold transition hover:bg-accent"
              >
                <Scale className="size-4 text-primary" /> Điều khoản sử dụng
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-muted/35 p-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                Tôi đã đọc và đồng ý với chính sách quyền riêng tư và điều khoản
                sử dụng của ứng dụng.
              </span>
            </label>

            <Button
              type="button"
              onClick={accept}
              disabled={!checked}
              className="mt-4 w-full gap-2 rounded-full"
            >
              <Check className="size-4" /> Đồng ý và tiếp tục
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Thông báo này chỉ hiển thị một lần khi bạn cài và mở ứng dụng lần đầu.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
