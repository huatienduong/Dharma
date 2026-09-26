/**
 * KHU HỘI THOẠI — danh sách tin nhắn, tiến trình và thẻ lỗi.
 *
 * Tách riêng khỏi trang chat. Trang chỉ lo chuyện gửi/nhận dữ liệu; phần
 * hiển thị nằm ở đây để sửa giao diện không phải đụng tới logic.
 */

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { formatTs, plainText, type Msg } from "@/lib/chatHelpers";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useState } from "react";

export type FailedReply = {
  message: string;
  question: string;
  msg: Msg;
};

export type ChatThreadProps = {
  messages: Msg[];
  isEmpty: boolean;
  streamingReply: string | null;
  failedReply: FailedReply | null;
  onRetry: () => void;
  onDismissFailed: () => void;
  imageProgress: number | null;
  busy: boolean;
  stalled: boolean;
  onRecallMessage: (m: Msg) => void;
  onRecallImage: (m: Msg) => void;
};

export function ChatThread({
  messages,
  isEmpty,
  streamingReply,
  failedReply,
  onRetry,
  onDismissFailed,
  imageProgress,
  busy,
  stalled,
  onRecallMessage,
  onRecallImage,
}: ChatThreadProps) {
  // Chưa có tin nhắn nào: để trống hoàn toàn, vào thẳng khung chat. Lời
  // chào và danh sách câu hỏi đề xuất đã được gỡ theo yêu cầu.
  if (isEmpty) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3 sm:px-4 [&>*:first-child]:mt-0">
      {messages.map((m, i) => {
        // Nhóm tin nhắn liên tiếp cùng người gửi — kiểu Messenger
        const grouped = i > 0 && messages[i - 1].role === m.role;
        return m.role === "user" ? (
          <UserMessage
            key={i}
            content={m.content}
            ts={m.ts}
            grouped={grouped}
            image={m.image}
            onRecall={() => onRecallMessage(m)}
            onRecallImage={m.image ? () => onRecallImage(m) : undefined}
          />
        ) : (
          <AssistantMessage
            key={i}
            content={m.content}
            ts={m.ts}
            grouped={grouped}
            image={m.image}
            imageStorageId={m.imageStorageId}
          />
        );
      })}
      {streamingReply !== null && streamingReply.length > 0 && (
        <AssistantMessage content={streamingReply} ts={Date.now()} grouped={false} />
      )}
      {/* Lỗi trả lời + nút gửi lại, hiện ngay trong hội thoại */}
      {failedReply && (
        <div className="mt-4 flex items-start gap-2">
          <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <Undo2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 sm:max-w-[78%]">
            <div className="rounded-3xl rounded-bl-md border border-destructive/40 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-semibold text-destructive">
                Trợ lý chưa trả lời được
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                {failedReply.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onRetry}
                  disabled={busy}
                  className="gap-1.5"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  Gửi lại
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onDismissFailed}
                  disabled={busy}
                >
                  Bỏ qua
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {imageProgress !== null && (
        <div className="mt-4 flex items-start gap-2">
          <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1 sm:max-w-[75%]">
            <div className="rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>
                  {imageProgress >= 100
                    ? "Đã tạo xong hình"
                    : "Đang vẽ hình theo yêu cầu của bạn"}
                </span>
                <span className="tabular-nums text-primary">
                  {imageProgress}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-300 ease-out"
                  style={{ width: `${imageProgress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Trợ lý đang phác họa — vui lòng chờ thêm ít giây.
              </p>
            </div>
          </div>
        </div>
      )}
      {busy && streamingReply === null && imageProgress === null &&
        (stalled ? (
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="pt-2 text-sm text-muted-foreground">
              Trả lời quá lâu hoặc kết nối không ổn định — hãy thử gửi lại câu hỏi.
            </p>
          </div>
        ) : (
          <AssistantThinking />
        ))}
    </div>
  );
}

export function AssistantMessage({
  content,
  ts,
  grouped,
  image,
  imageStorageId,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
  /** Ảnh người dùng tải lên (chưa dùng ở bong bóng trợ lý) */
  image?: { base64: string; mime: string };
  /** storageId ảnh AI tạo trong Convex File Storage */
  imageStorageId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = plainText(content);
  // Nạp URL ảnh từ storage — URL ổn định nên lịch sử cũ vẫn xem lại được.
  const imageUrl = useQuery(
    api.aiChat.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : "skip",
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    const payload = `${text}\n\n— Trợ lý Phật học`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Trợ lý Phật học", text: payload });
        return;
      }
    } catch {
      // Người dùng đã hủy chia sẻ — bỏ qua.
      return;
    }
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      /* bộ nhớ đầy hoặc trình duyệt chặn clipboard */
    }
  };

  return (
    <div className={cn("flex items-start gap-2", grouped ? "mt-1.5" : "mt-5")}>
      {/* Avatar robot ở TRÊN — thẳng hàng đầu bong bóng trả lời */}
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1 sm:max-w-[75%]">
        {image && (
          <img
            src={`data:${image.mime};base64,${image.base64}`}
            alt="Hình ảnh Trợ lý Phật học tạo theo yêu cầu"
            className="mb-2 block max-h-80 w-auto max-w-full rounded-3xl rounded-bl-md border border-border/50 object-cover shadow-sm"
          />
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Hình ảnh Trợ lý Phật học tạo theo yêu cầu"
            className="mb-2 block max-h-80 w-auto max-w-full rounded-3xl rounded-bl-md border border-border/50 object-cover shadow-sm"
          />
        )}
        <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-2.5 text-[18px] leading-[1.8] text-foreground/95 shadow-sm sm:text-[19px]">
          {text}
        </div>
        <div className="mt-1 flex items-center gap-1 pl-2 text-[12px] text-muted-foreground/70">
          <span>{formatTs(ts)}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded px-1 py-0.5 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sao chép câu trả lời"
            title={copied ? "Đã sao chép" : "Sao chép"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-gold" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded px-1 py-0.5 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Chia sẻ câu trả lời"
            title="Chia sẻ"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMessage({
  content,
  ts,
  grouped,
  image,
  onRecall,
  onRecallImage,
}: {
  content: string;
  ts: number;
  grouped?: boolean;
  image?: { base64: string; mime: string };
  onRecall: () => void;
  onRecallImage?: () => void;
}) {
  return (
    <div className={cn("flex justify-end", grouped ? "mt-1.5" : "mt-5")}>
      <div className="flex max-w-[86%] flex-col items-end sm:max-w-[78%]">
        {/* Ảnh đi kèm — có nút thu hồi riêng, không cần xóa cả tin nhắn. */}
        {image && (
          <div className="relative mb-1.5 max-w-full">
            <img
              src={`data:${image.mime};base64,${image.base64}`}
              alt="Ảnh người dùng gửi kèm"
              className="block max-h-64 w-auto max-w-full rounded-2xl border border-border/60 object-cover shadow-sm"
            />
            {onRecallImage && (
              <button
                type="button"
                onClick={onRecallImage}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur transition hover:bg-black/85 active:scale-95"
                aria-label="Thu hồi hình ảnh"
                title="Thu hồi hình ảnh"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {content && (
          <div className="inline-block max-w-full whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[18px] leading-[1.8] text-primary-foreground shadow-sm sm:text-[19px]">
            {content}
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 pr-1 text-[12px] text-muted-foreground/70">
          <span>{formatTs(ts)}</span>
          <button
            type="button"
            onClick={onRecall}
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Thu hồi tin nhắn"
            title="Thu hồi tin nhắn"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Thu hồi
          </button>
        </div>
      </div>
    </div>
  );
}

function AssistantThinking() {
  return (
    <div className="mt-5 flex items-start gap-2">
      {/* Avatar robot ở TRÊN, đồng hàng với bong bóng chờ */}
      <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-sm">
        <Bot className="h-6 w-6" />
      </span>
      <div className="inline-flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-border/50 bg-card px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-gold/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
