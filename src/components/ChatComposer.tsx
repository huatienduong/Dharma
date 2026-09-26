/**
 * KHUNG NHẬP CÂU HỎI — ô soạn tin, đính kèm ảnh và tệp, micro, nút gửi.
 *
 * Tách riêng khỏi trang chat. Ở đây có hai loại đính kèm:
 *   • ẢNH  → nhánh thị giác, Trợ lý nhìn và mô tả.
 *   • TỆP  → nhánh đọc tệp, Trợ lý đọc dữ liệu bên trong (CSV, JSON, PDF…).
 * Mỗi đính kèm đều có nút X riêng để gỡ mà không phải xoá cả câu hỏi.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  Eraser,
  FileText,
  ImagePlus,
  Loader2,
  Mic,
  Send,
  X,
} from "lucide-react";
import { useRef } from "react";

/** Số tệp tối đa mỗi lượt — khớp trần phía máy chủ. */
export const MAX_FILES_PER_MESSAGE = 3;

export type AttachedFile = {
  name: string;
  mime: string;
  base64: string;
  /** Kích thước gốc (byte) để hiển thị cho người dùng. */
  size: number;
};

export type ChatComposerProps = {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;

  image: { base64: string; mime: string } | null;
  extraImageCount: number;
  onPickImage: (file: File) => void;
  onClearImage: () => void;

  files: AttachedFile[];
  onPickFiles: (list: FileList | null) => void;
  onRemoveFile: (index: number) => void;

  micSupported: boolean;
  /**
   * Dịch lên (px) khi bàn phím ảo bật. Khung nhập là `position: fixed`
   * bám theo layout viewport nên bị chìm xuống dưới bàn phím — số này nâng
   * nó lên đúng mép trên của bàn phím. 0 = không bàn phím.
   */
  liftUp?: number;
  listening: boolean;
  micRefining: boolean;
  micInterim: string;
  onMicToggle: () => void;

  onClearAll: () => void;
};

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  busy,
  image,
  extraImageCount,
  onPickImage,
  onClearImage,
  files,
  onPickFiles,
  onRemoveFile,
  micSupported,
  liftUp = 0,
  listening,
  micRefining,
  micInterim,
  onMicToggle,
  onClearAll,
}: ChatComposerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAttachment = !!image || files.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={liftUp ? { transform: `translateY(-${liftUp}px)` } : undefined}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-3xl bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4"
    >
      {/* ---------- Đính kèm đang chờ gửi ---------- */}
      {(image || files.length > 0) && (
        <div className="mb-2 flex flex-wrap items-center gap-2 pl-1">
          {image && (
            <div className="relative">
              <img
                src={`data:${image.mime};base64,${image.base64}`}
                alt="Ảnh sẽ gửi"
                className="h-16 w-16 rounded-xl border border-border/60 object-cover"
              />
              <button
                type="button"
                onClick={onClearImage}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                aria-label="Xóa ảnh"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {image && extraImageCount > 0 && (
            <span className="text-xs text-muted-foreground">
              +{extraImageCount} ảnh nữa
            </span>
          )}
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex max-w-[15rem] items-center gap-1.5 rounded-xl border border-border/60 bg-card py-1.5 pl-2 pr-1 text-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate text-foreground/90">{f.name}</span>
              {f.size > 0 && (
                <span className="shrink-0 text-muted-foreground/70">
                  {formatSize(f.size)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-destructive text-white"
                aria-label={`Bỏ tệp ${f.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Khung nhập: ở chế độ sáng nền kem nên khung phải TRẮNG + viền đỏ
          rõ, bấm vào viền đậm hẳn lên; chế độ tối giữ nguyên như cũ. */}
      <div className="flex items-end gap-1 rounded-[24px] border border-gold/40 bg-card p-1.5 shadow-[0_2px_14px_-6px_rgba(176,24,27,0.30)] transition focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/25 dark:border-border/70 dark:bg-card dark:shadow-lg dark:focus-within:border-gold/50 dark:focus-within:ring-gold/15">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickImage(f);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-2xl text-foreground/70 transition hover:bg-accent hover:text-foreground"
            aria-label="Gửi ảnh cho trợ lý"
            title="Tải lên hình ảnh"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-2xl text-foreground/70 transition hover:bg-accent hover:text-foreground"
            aria-label="Gửi tệp cho trợ lý"
            title="Tải lên tệp (CSV, TXT, JSON, PDF…)"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="flex h-8 w-8 items-center justify-center rounded-2xl text-foreground/70 transition hover:bg-accent hover:text-foreground"
            title="Xóa hội thoại"
            aria-label="Xóa hội thoại"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={1}
          placeholder=""
          className="max-h-32 min-h-9 flex-1 resize-none self-center bg-transparent py-2 text-[16px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-[17px]"
        />

        {micSupported && (
          <button
            type="button"
            onClick={onMicToggle}
            disabled={micRefining}
            aria-label={listening ? "Dừng nghe" : "Hỏi bằng giọng nói"}
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 transition hover:bg-accent hover:text-foreground disabled:opacity-60",
              listening && "bg-destructive/10 text-destructive",
            )}
          >
            {micRefining ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin text-gold" />
            ) : (
              <Mic className="h-[18px] w-[18px]" />
            )}
            {listening && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
            )}
          </button>
        )}

        <Button
          type="submit"
          size="icon"
          disabled={busy || (!input.trim() && !hasAttachment)}
          className="h-10 w-10 shrink-0 rounded-full"
          aria-label="Gửi câu hỏi"
        >
          {busy ? (
            <AudioLines className="h-[18px] w-[18px] animate-pulse" />
          ) : (
            <Send className="h-[18px] w-[18px]" />
          )}
        </Button>
      </div>

      {/* Trạng thái nghe / chép lại: người dùng luôn biết ứng dụng đang
          nghe gì và đã nghe được bao nhiêu. */}
      {(listening || micRefining || micInterim) && (
        <div className="mt-2 flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
          {micRefining ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" />
          ) : (
            <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
          )}
          {micInterim && <span className="truncate">{micInterim}</span>}
        </div>
      )}
    </form>
  );
}
