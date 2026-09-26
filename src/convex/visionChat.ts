/**
 * PHÂN TÍCH HÌNH ẢNH — nhánh riêng cho ảnh người dùng tải lên.
 *
 * VÌ SAO TÁCH KHỎI `aiChat.ask`:
 *   Nhánh ảnh của `ask` chạy trên Groq, nhưng Groq hiện KHÔNG còn model đọc
 *   ảnh nào (llama-4-scout đã bị thu hồi, /models chỉ còn model chữ). Nên
 *   mỗi lần gửi ảnh, `ask` rơi vào model chữ rồi báo "cần máy chủ hỗ trợ thị
 *   giác" — người dùng không bao giờ phân tích được ảnh.
 *   Gemini đọc ảnh rất tốt và khóa đã có sẵn trong hệ thống (đang phục vụ đọc
 *   to), nên: ẢNH → Gemini, CHỮ → Groq. Hai nhánh độc lập, nhánh này hỏng thì
 *   nhánh kia vẫn chạy (client tự lùi về `ask`).
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Model đọc ảnh, thử lần lượt cho tới khi có câu trả lời. */
const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
];

/** Giữ đúng giọng điệu của Trợ lý Phật học (rút gọn cho nhánh ảnh). */
const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — một PHẬT TỬ THUẦN THÀNH và là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp của mỗi người. Ứng dụng này do nhà phát triển Hứa Tiến Dương xây dựng và trực tiếp vận hành.

NHIỆM VỤ: nhìn hình ảnh người dùng gửi và trả lời về nó.

CÁCH TRẢ LỜI:
- Nói đúng nội dung ảnh trước (vài câu), rồi mới gắn với Phật học nếu ảnh có liên quan.
- Trả lời bằng tiếng Việt, thân thiện, khiêm tốn, không dùng emoji, không dùng markdown.
- NGẮN GỌN: tối đa 4–6 câu. Không liệt kê từng chi tiết nhỏ vô nghĩa.
- Nếu ảnh không rõ hoặc không có gì để nói, nói thẳng là không nhìn rõ và mời người dùng gửi ảnh khác.
- Không bịa chi tiết không có trong ảnh. Không khẳng định điều không chắc chắn.`;

const MAX_OUTPUT_TOKENS = 700;
/** Khớp HISTORY_LIMIT của aiChat.ask để ngữ cảnh gửi lên giống nhau. */
const HISTORY_LIMIT = 4;
/** Ảnh quá lớn thì Gemini từ chối — chặn sớm để không tốn thời gian chờ. */
const MAX_IMAGE_BASE64 = 6_000_000;

export type VisionReply =
  | { ok: true; reply: string; provider: string }
  | { ok: false; code: "rate_limited" | "no_provider" | "bad_image" | "ai_unavailable"; message: string };

/**
 * Chép lời nói: cùng hạn mức "ask" để ảnh không biến thành đường vòng né giới
 * hạn. Chỉ dùng `internal.aiChat.checkAiRateLimit` — không nhân bản logic.
 */
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

export const analyzeImage = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    imageBase64: v.string(),
    imageMime: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { messages, imageBase64, imageMime, deviceId, integrity },
  ): Promise<VisionReply> => {
    if (await rateLimited(ctx as never, deviceId, integrity)) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message:
          "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại.",
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return {
        ok: false as const,
        code: "no_provider" as const,
        message: "Máy chủ chưa cấu hình khóa đọc ảnh.",
      };
    }

    if (!imageBase64) {
      return {
        ok: false as const,
        code: "bad_image" as const,
        message: "Không nhận được hình ảnh.",
      };
    }
    if (imageBase64.length > MAX_IMAGE_BASE64) {
      return {
        ok: false as const,
        code: "bad_image" as const,
        message: "Hình ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.",
      };
    }
    // Gemini chỉ nhận đúng các định dạng này.
    const mime =
      imageMime && /^(image\/(jpeg|png|webp|gif|heic|heif))$/i.test(imageMime)
        ? imageMime
        : "image/jpeg";

    const recent = messages.slice(-HISTORY_LIMIT);
    // Ảnh gắn vào lượt hỏi cuối cùng (giống cách aiChat.ask làm).
    const contents = recent
      .map((m, i) => {
        const isLast = i === recent.length - 1 && m.role === "user";
        return {
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: isLast
            ? [{ text: m.content }, { inlineData: { mimeType: mime, data: imageBase64 } }]
            : [{ text: m.content }],
        };
      })
      // Gemini yêu cầu lượt đầu phải do "user" mở đầu.
      .filter((c, i) => i === 0 || c.role === "user" || c.parts.length > 0);
    while (contents.length > 0 && contents[0].role !== "user") contents.shift();

    let lastError = "không rõ";
    for (const model of VISION_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            },
          }),
          signal: AbortSignal.timeout(35_000),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          lastError = `${model}: HTTP ${res.status} ${detail.slice(0, 160)}`;
          continue;
        }
        const json = (await res.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
          promptFeedback?: { blockReason?: string };
        };
        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (text) return { ok: true as const, reply: text, provider: model };
        lastError = `${model}: ${
          json.promptFeedback?.blockReason ?? json.candidates?.[0]?.finishReason ?? "trả lời rỗng"
        }`;
      } catch (err) {
        lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    console.error(`[visionChat] mọi model đọc ảnh đều lỗi: ${lastError}`);
    return {
      ok: false as const,
      code: "ai_unavailable" as const,
      message:
        "Trợ lý chưa phân tích được hình ảnh này. Vui lòng thử lại, hoặc mô tả bằng lời.",
    };
  },
});
