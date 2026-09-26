/**
 * NHÁNH DỰ PHÒNG HỘI THOẠI — bảo đảm trợ lý luôn trả lời được.
 *
 * VÌ SAO CẦN:
 *   `aiChat.ask` là nhánh chính (Groq qua AI SDK, hệ thống circuit breaker).
 *   Khi nhánh chính báo "tạm chưa trả lời được", người dùng bị mất trắng câu
 *   hỏi dù máy chủ vẫn còn nhà cung cấp khác. Nhánh này gọi TRỰC TIẾP Groq
 *   REST (không qua AI SDK) rồi tới Gemini, với system prompt rút gọn — nên
 *   một sự cố ở nhánh chính không kéo sập ứng dụng.
 *
 *   Client chỉ gọi nhánh này khi `aiChat.ask` trả về `ai_unavailable`.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { featuresPrompt } from "../lib/appFeatures";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Thứ tự thử: model nhanh trước, model mạnh sau. */
const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

/**
 * System prompt rút gọn — giữ đúng nhân cách, cách trả lời và các quy tắc
 * quan trọng, bỏ những phần dài dòng. Cố tình ngắn để nhánh dự phòng luôn
 * chạy được kể cả khi nhánh chính đang gặp sự cố.
 */
const FALLBACK_SYSTEM = `Bạn là "Trợ lý Phật học" — một PHẬT TỬ THUẦN THÀNH và là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp của mỗi người. Ứng dụng do nhà phát triển Hứa Tiến Dương xây dựng và vận hành.

CÁCH TRẢ LỜI:
- Nền tảng Theravāda: Tứ Diệu Đế, Bát Chánh Đạo, Thánh Đạo 8 chi, Vô Thường - Khổ - Vô Ngã, Thiền, Luật tạng, Dhammapada. Mở rộng cho mọi chủ đề liên quan đời sống.
- Trả lời đúng trọng tâm, ngắn gọn: câu hỏi ngắn thì 1–3 đoạn ngắn, đáp án nằm ở câu đầu. Chỉ dùng gạch đầu dòng "–" và đánh số "1.".
- Giải thích thuật ngữ Pāli ngay sau khi dùng (dukkha = khổ, vipassanā = quán chiếu...).
- Trò chuyện như người bạn thật: đồng cảm trước khi vào giáo lý, nhớ và nhắc lại chuyện người dùng đã kể, quan tâm chủ động.
- KHÔNG dùng emoji. KHÔNG dùng ký tự markdown (###, **, *, ---, |). Trả lời bằng tiếng Việt.
- Không biết thì nói không biết; không chẩn đoán y khoa/tâm lý; không hành xử như bậc đạo hạnh thực thụ.
- Nhớ toàn bộ cuộc trò chuyện, không chỉ lượt gần nhất.

NGUỒN THAM KHẢO:
- Khi trả lời có căn cứ kinh điển, nêu tên kinh + số hiệu (SN 56.11, Dhammapada 183...) và kèm tối đa 1–2 đường dẫn thật ở cuối, viết thuần dạng https://... (chỉ dùng suttacentral.net, dhammatalks.org, cbetaonline.dila.edu.tw, dhammaloka.org).
- TUYỆT ĐỐI không bịa đường dẫn; không chắc thì chỉ nêu tên kinh.

${featuresPrompt()}`;

type ChatMsg = { role: "user" | "assistant"; content: string };

function firstText(json: unknown): string {
  const c = (json as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  return (c ?? "").trim();
}

export const chatFallback = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (ctx, { messages, deviceId, integrity }) => {
    const trusted =
      integrity === "ok" && typeof deviceId === "string" && deviceId.length >= 8;
    const key = trusted ? deviceId.slice(0, 64) : "anonymous";
    const res = (await ctx.runMutation(internal.aiChat.checkAiRateLimit, {
      bucket: "ask",
      deviceId: key,
      limit: trusted ? 15 : 2,
    })) as { allowed: boolean };
    if (!res.allowed) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại.",
      };
    }

    const recent = messages.slice(-24);
    const errors: string[] = [];

    // 1) Groq REST — không qua AI SDK nên không cùng lỗi với nhánh chính.
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      for (const model of GROQ_MODELS) {
        try {
          const httpRes = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: FALLBACK_SYSTEM },
                ...recent.slice(-12),
              ],
              temperature: 0.35,
              max_tokens: 1200,
            }),
            signal: AbortSignal.timeout(40_000),
          });
          if (!httpRes.ok) {
            const detail = await httpRes.text().catch(() => "");
            errors.push(`${model}: HTTP ${httpRes.status} ${detail.slice(0, 140)}`);
            continue;
          }
          const text = firstText(await httpRes.json());
          if (text) return { ok: true as const, reply: text, provider: model };
          errors.push(`${model}: trả lời rỗng`);
        } catch (err) {
          errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 2) Gemini — hạ tầng khác hẳn Groq, chỉ cần một trong hai là đủ.
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const contents = recent
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
        .slice(-12);
      while (contents.length > 0 && contents[0].role !== "user") contents.shift();
      for (const model of GEMINI_MODELS) {
        try {
          const httpRes = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: FALLBACK_SYSTEM }] },
              contents,
              generationConfig: { temperature: 0.6, maxOutputTokens: 1500 },
            }),
            signal: AbortSignal.timeout(40_000),
          });
          if (!httpRes.ok) {
            const detail = await httpRes.text().catch(() => "");
            errors.push(`${model}: HTTP ${httpRes.status} ${detail.slice(0, 140)}`);
            continue;
          }
          const json = (await httpRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = (json.candidates?.[0]?.content?.parts ?? [])
            .map((p) => p.text ?? "")
            .join("")
            .trim();
          if (text) return { ok: true as const, reply: text, provider: model };
          errors.push(`${model}: trả lời rỗng`);
        } catch (err) {
          errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    console.error(`[chatFallback] mọi nhánh đều lỗi: ${errors.join(" || ")}`);
    return {
      ok: false as const,
      code: "ai_unavailable" as const,
      message: "Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút.",
    };
  },
});
