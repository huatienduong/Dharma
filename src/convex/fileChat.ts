/**
 * PHÂN TÍCH TỆP NGƯỜI DÙNG GỬI LÊN.
 *
 * Mục đích: người dùng tải lên tệp (bảng tính CSV, văn bản, JSON, PDF…) và
 * Trợ lý đọc dữ liệu bên trong để giải thích, tóm tắt, thống kê.
 *
 * VÌ SAO KHÔNG DÙNG CHUNG NHÁNH CHỮ:
 *   Tệp bảng tính có thể rất dài; đưa nguyên tệp vào lịch sử chat sẽ nổ
 *   hạn mức token và làm hỏng cả các lượt hỏi sau. Ở đây tệp được rút gọn
 *   có kiểm soát (xem `buildDigest`) rồi mới đưa sang mô hình.
 *
 * ĐỊNH DẠNG:
 *   • Văn bản thuần (txt, md, csv, tsv, json, log, srt, vtt, xml, html, code):
 *     đọc thẳng nội dung, có tóm tắt cấu trúc cho bảng dữ liệu.
 *   • PDF: Gemini đọc PDF trực tiếp — gửi thẳng tệp, không phải trích text.
 *   • Định dạng nhị phân khác (docx, xlsx, pptx…): báo rõ là chưa hỗ trợ
 *     thay vì trả lời sai. Người dùng chỉ cần xuất ra CSV hoặc PDF.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { featuresPrompt } from "../lib/appFeatures";
import { cleanPlainText } from "../lib/textClean";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Model đọc tệp, thử lần lượt. */
const FILE_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];

/* ----- Hạn mức "gói" cho một lượt phân tích tệp ----- */

/** Trần số tệp mỗi lượt. */
export const MAX_FILES_PER_REQUEST = 3;
/** Một tệp không được vượt quá ngân sách này. */
const MAX_FILE_BASE64 = 4_000_000;
/** Tổng dung lượng base64 mỗi lượt. */
const MAX_TOTAL_BASE64 = 8_000_000;
/** Ngân sách ký tự nội dung gửi lên mô hình cho toàn bộ tệp. */
const MAX_DIGEST_CHARS = 24_000;

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — một PHẬT TỬ THUẦN THÀNH và là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp. Ứng dụng này do nhà phát triển Hứa Tiến Dương xây dựng và trực tiếp vận hành.

NHIỆM VỤ: đọc TỆP người dùng gửi lên và giúp họ hiểu dữ liệu bên trong.

CÁCH TRẢ LỜI:
- Nói trước tệp đó là gì, có bao nhiêu dòng/cột, các cột chính gồm những gì.
- Rồi mới giải thích, tóm tắt hoặc thống kê dữ liệu mà người dùng cần.
- VIẾT THÀNH VĂN XUÔI: không gạch đầu dòng, không đánh số mục, không tiêu đề, không mở đầu bằng dấu gạch.
- Nếu tệp là bảng số liệu, nêu vài con số nổi bật thật sự có trong tệp.
- TUYỆT ĐỐI không bịa số liệu, không tự thêm cột không có trong tệp. Thiếu dữ liệu thì nói thẳng là tệp không có.
- Nếu tệp bị cắt bớt, nói rõ chỉ đọc được phần đầu.
- Trả lời tiếng Việt, thân thiện, khiêm tốn, không emoji, không markdown.
- NGẮN GỌN: tối đa 8 câu.
- Không tự chèn đường dẫn nguồn. Chỉ khi người dùng hỏi rõ mới nêu tối đa 1–2 đường dẫn thật.

${featuresPrompt(true)}`;

export type FileInput = { name: string; mime?: string; base64: string };

export type FileReply =
  | {
      ok: true;
      reply: string;
      provider: string;
      fileNames: string[];
      dropped: string[];
    }
  | {
      ok: false;
      code: "rate_limited" | "no_provider" | "bad_file" | "unsupported" | "ai_unavailable";
      message: string;
    };

/** Định dạng đọc thẳng được như văn bản. */
const TEXT_EXT = [
  "txt", "md", "csv", "tsv", "json", "jsonl", "ndjson", "log", "srt", "vtt",
  "xml", "html", "htm", "yaml", "yml", "ini", "sql", "js", "ts", "tsx", "jsx",
  "py", "java", "c", "cpp", "h", "cs", "go", "rs", "php", "rb", "sh",
];

const PDF_EXT = ["pdf"];

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

/** Giải mã base64 → chuỗi (môi trường action của Convex có `atob`). */
function decodeText(base64: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Rút gọn tệp bảng dữ liệu trước khi gửi lên mô hình.
 *
 * Bảng CSV hàng trăm nghìn dòng gửi nguyên văn sẽ nổ hạn mức token. Ở đây
 * chỉ giữ tiêu đề cột, một số dòng đầu để người dùng thấy "tệp trông như
 * thế nào", và nêu rõ tổng số dòng thật.
 */
function digestTable(text: string, maxRows: number): { digest: string; rows: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { digest: "(tệp rỗng)", rows: 0 };
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const header = lines[0];
  const cols = header.split(sep).map((c) => c.trim()).filter(Boolean);
  const rows = lines.length - 1;
  const head = lines.slice(1, 1 + maxRows);
  const note =
    rows > maxRows
      ? `\n(tệp có ${rows} dòng dữ liệu; tôi chỉ đọc ${maxRows} dòng đầu để không vượt giới hạn xử lý. Nếu bạn cần thống kê một cột cụ thể, hãy nói rõ cột đó.)`
      : "";
  return {
    digest: `Tên tệp: có ${rows} dòng dữ liệu.\nCột: ${cols.join(", ")}\n\n${header}\n${head.join("\n")}${note}`,
    rows,
  };
}

/** Tóm tắt cấu trúc tệp văn bản dài để vẫn nằm trong ngân sách. */
function digestText(name: string, text: string): string {
  const max = Math.floor(MAX_DIGEST_CHARS * 0.8);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n(tệp dài ${text.length} ký tự; tôi chỉ đọc ${max} ký tự đầu. Hãy cho biết bạn cần tìm phần nào.)`;
}

type Digest =
  | { kind: "text"; name: string; body: string }
  | { kind: "pdf"; name: string; base64: string };

/**
 * Chuẩn hoá danh sách tệp: chọn định dạng hỗ trợ, cắt theo hạn mức gói, và
 * dựng phần nội dung gửi lên. Trả về lý do bỏ tệp để báo cho người dùng.
 */
function buildDigests(
  files: FileInput[],
): { items: Digest[]; dropped: string[]; unsupported: string[]; overQuota: string[] } {
  const items: Digest[] = [];
  const dropped: string[] = [];
  const unsupported: string[] = [];
  const overQuota: string[] = [];
  let total = 0;
  let budget = MAX_DIGEST_CHARS;

  for (const f of files) {
    // KIỂM TRA ĐỊNH DẠNG TRƯỚC: nếu báo “quá số tệp cho phép” cho một tệp
    // docx thì người dùng tưởng chỉ cần bỏ bớt tệp khác, trong khi thật ra
    // định dạng đó vốn không đọc được.
    const ext = extOf(f.name);
    const mime = (f.mime ?? "").toLowerCase();
    const isPdf = PDF_EXT.includes(ext) || mime === "application/pdf";
    const isText =
      TEXT_EXT.includes(ext) ||
      mime.startsWith("text/") ||
      mime === "application/json" ||
      mime === "application/xml";
    if (!isPdf && !isText) {
      unsupported.push(f.name);
      continue;
    }
    if (items.length >= MAX_FILES_PER_REQUEST) {
      overQuota.push(f.name);
      continue;
    }
    if (f.base64.length > MAX_FILE_BASE64 || total + f.base64.length > MAX_TOTAL_BASE64) {
      overQuota.push(f.name);
      continue;
    }
    total += f.base64.length;
    if (isPdf) {
      items.push({ kind: "pdf", name: f.name, base64: f.base64 });
      continue;
    }
    let text = "";
    try {
      text = decodeText(f.base64);
    } catch {
      dropped.push(f.name);
      continue;
    }
    const looksLikeTable =
      ext === "csv" || ext === "tsv" || mime === "text/csv" || /\n[^\n]*,[^\n]*\n/.test(text.slice(0, 4000));
    const body = looksLikeTable
      ? digestTable(text, 40).digest
      : digestText(f.name, text);
    if (body.length > budget) {
      items.push({ kind: "text", name: f.name, body: body.slice(0, budget) });
      budget = 0;
    } else {
      items.push({ kind: "text", name: f.name, body });
      budget -= body.length;
    }
  }
  return { items, dropped, unsupported, overQuota };
}

async function rateLimited(
  ctx: { runMutation: (m: unknown, a: unknown) => Promise<{ allowed: boolean }> },
  deviceId: string | undefined,
  integrity: string | undefined,
): Promise<boolean> {
  const trusted =
    integrity === "ok" && typeof deviceId === "string" && deviceId.length >= 8;
  const key = trusted ? deviceId!.slice(0, 64) : "anonymous";
  const res = (await ctx.runMutation(internal.aiChat.checkAiRateLimit, {
    bucket: "ask",
    deviceId: key,
    limit: trusted ? 15 : 2,
  })) as { allowed: boolean };
  return !res.allowed;
}

export const analyzeFiles = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    files: v.array(
      v.object({
        name: v.string(),
        mime: v.optional(v.string()),
        base64: v.string(),
      }),
    ),
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (ctx, { messages, files, deviceId, integrity }): Promise<FileReply> => {
    if (await rateLimited(ctx as never, deviceId, integrity)) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại.",
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return {
        ok: false as const,
        code: "no_provider" as const,
        message: "Máy chủ chưa cấu hình khoá đọc tệp.",
      };
    }

    const incoming = (files ?? []).filter((f) => !!f.base64);
    if (incoming.length === 0) {
      return {
        ok: false as const,
        code: "bad_file" as const,
        message: "Không nhận được tệp. Hãy thử chọn lại.",
      };
    }

    const { items, dropped, unsupported, overQuota } = buildDigests(incoming);
    if (items.length === 0) {
      return {
        ok: false as const,
        code: "unsupported" as const,
        message:
          "Chưa đọc được định dạng này. Hãy xuất tệp ra CSV, văn bản hoặc PDF rồi gửi lại.",
      };
    }

    const question =
      messages[messages.length - 1]?.content?.trim() ||
      "Hãy mô tả và giải thích dữ liệu trong tệp này.";
    const notes: string[] = [];
    if (unsupported.length) {
      notes.push(`Các tệp chưa hỗ trợ định dạng và không được phân tích: ${unsupported.join(", ")}.`);
    }
    if (overQuota.length) {
      notes.push(`Các tệp vượt giới hạn của gói nên không được gửi: ${overQuota.join(", ")}.`);
    }
    if (dropped.length) {
      notes.push(`Các tệp không đọc được: ${dropped.join(", ")}.`);
    }

    const parts: Record<string, unknown>[] = [
      {
        text: `${question}${notes.length ? `\n(Lưu ý: ${notes.join(" ")})` : ""}`,
      },
      ...items.map((it) =>
        it.kind === "pdf"
          ? { inlineData: { mimeType: "application/pdf", data: it.base64 } }
          : { text: `\n--- Nội dung tệp "${it.name}" ---\n${it.body}` },
      ),
    ];

    let lastError = "không rõ";
    for (const model of FILE_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts }],
            generationConfig: { maxOutputTokens: 2048 },
          }),
          signal: AbortSignal.timeout(40_000),
        });
        if (!res.ok) {
          lastError = `${model}: HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 140)}`;
          continue;
        }
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
          promptFeedback?: { blockReason?: string };
        };
        const text = cleanPlainText(
          (json.candidates?.[0]?.content?.parts ?? [])
            .filter((p) => !p.thought)
            .map((p) => p.text ?? "")
            .join(""),
        );
        if (text) {
          return {
            ok: true as const,
            reply: text,
            provider: model,
            fileNames: items.map((i) => i.name),
            dropped: [...unsupported, ...overQuota, ...dropped],
          };
        }
        lastError = `${model}: ${json.promptFeedback?.blockReason ?? "trả lời rỗng"}`;
      } catch (err) {
        lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    console.error(`[fileChat] không đọc được tệp: ${lastError}`);
    return {
      ok: false as const,
      code: "ai_unavailable" as const,
      message:
        "Máy chủ đang bận (hết hạn mức đọc tệp của gói). Vui lòng thử lại sau 1–2 phút.",
    };
  },
});
