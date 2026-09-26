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
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

/* ------------------------------------------------------------------ */
/* HẠN MỨC NHÀ CUNG CẤP — nguyên nhân gốc của "không trả lời được"     */
/* ------------------------------------------------------------------ */
/*
 * Hạn mức Groq tính CHUNG cho cả tổ chức, không riêng từng model: kho
 * vực của gói miễn phí chỉ chịu được khoảng 10 lượt/phút. Khi đã vượt,
 * Groq trả 429 NGAY LẬP TỨ (khoảng 0,4s) — nên nếu cứ thử lần lượt 4
 * model thì mỗi lượt hỏi hỏng lại đốt thêm 4 lượt gọi vô ích, càng làm
 * hạn mức kiệt hơn. Hai việc sửa ở đây:
 *   1. Gặp 429 thì DỪNG ngay vòng lặp của nhà cung cấp đó, chuyển sang
 *      nhà cung cấp kia, thay vì đâm tiếp vào chỗ vừa bị từ chối.
 *   2. Ghi nhớ thời điểm hết hạn mức để các lượt hỏi kế tiếp bỏ qua hẳn
 *      nhà cung cấp đang bị chặn, không đốt thêm request nào.
 * Ngoài ra cache lại câu hỏi đơn lặp lại trong 10 phút: người dùng hay
 * bấm "Gửi lại" hoặc hỏi lại đúng câu vừa hỏi, và mỗi lần lặp lại đều
 * tốn hạn mức của những người đang dùng thật.
 */
const COOLDOWN_MS = 25_000;
let groqCooldownUntil = 0;
let geminiCooldownUntil = 0;

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 40;
const answerCache = new Map<string, { reply: string; provider: string; at: number }>();

/** Chỉ cache câu hỏi đơn lẻ, ngắn gọn — không cache hội thoại nhiều lượt. */
function cacheKeyFor(messages: ChatMsg[]): string | null {
  if (messages.length !== 1) return null;
  const text = (messages[0]?.content ?? "").trim();
  if (!text || text.length > 300) return null;
  return text.toLowerCase().replace(/\s+/g, " ");
}

function readCache(key: string | null): { reply: string; provider: string } | null {
  if (!key) return null;
  const hit = answerCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    answerCache.delete(key);
    return null;
  }
  return { reply: hit.reply, provider: hit.provider };
}

function writeCache(
  key: string | null,
  reply: string,
  provider: string,
): void {
  if (!key) return;
  if (answerCache.size >= CACHE_MAX) {
    const oldest = answerCache.keys().next().value;
    if (oldest !== undefined) answerCache.delete(oldest);
  }
  answerCache.set(key, { reply, provider, at: Date.now() });
}

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

    const cacheKey = cacheKeyFor(messages);
    const cached = readCache(cacheKey);
    if (cached) {
      return {
        ok: true as const,
        reply: cached.reply,
        provider: cached.provider,
        cached: true,
      };
    }

    const recent = messages.slice(-24);
    const errors: string[] = [];
    /** true = mọi lỗi đều do hết hạn mức (429), thông báo sẽ dịu hơn */
    let allRateLimited = true;

    // 1) Groq REST — không qua AI SDK nên không cùng lỗi với nhánh chính.
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && Date.now() < groqCooldownUntil) {
      errors.push("groq: đang nghỉ sau lần bị giới hạn gần nhất");
    } else if (groqKey) {
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
              max_tokens: 900,
            }),
            signal: AbortSignal.timeout(40_000),
          });
          if (!httpRes.ok) {
            const detail = await httpRes.text().catch(() => "");
            errors.push(`${model}: HTTP ${httpRes.status} ${detail.slice(0, 140)}`);
            if (httpRes.status === 429) {
              // Hết hạn mức chung của tổ chức: dừng vòng lặp, nghỉ một nhịp
              // rồi thử nhà cung cấp khác. Gọi tiếp chỉ làm tệ hơn.
              allRateLimited = false;
              groqCooldownUntil = Date.now() + COOLDOWN_MS;
              break;
            }
            continue;
          }
          const text = firstText(await httpRes.json());
          if (text) {
            writeCache(cacheKey, text, model);
            return { ok: true as const, reply: text, provider: model };
          }
          allRateLimited = false;
          errors.push(`${model}: trả lời rỗng`);
        } catch (err) {
          allRateLimited = false;
          errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 2) Gemini — hạ tầng khác hẳn Groq, chỉ cần một trong hai là đủ.
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && Date.now() < geminiCooldownUntil) {
      errors.push("gemini: đang nghỉ sau lần bị giới hạn gần nhất");
    } else if (geminiKey) {
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
            if (httpRes.status === 429 || httpRes.status === 503) {
              allRateLimited = false;
              geminiCooldownUntil = Date.now() + COOLDOWN_MS;
              break;
            }
            continue;
          }
          const json = (await httpRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = (json.candidates?.[0]?.content?.parts ?? [])
            .map((p) => p.text ?? "")
            .join("")
            .trim();
          if (text) {
            writeCache(cacheKey, text, model);
            return { ok: true as const, reply: text, provider: model };
          }
          allRateLimited = false;
          errors.push(`${model}: trả lời rỗng`);
        } catch (err) {
          allRateLimited = false;
          errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    console.error(`[chatFallback] mọi nhánh đều lỗi: ${errors.join(" || ")}`);
    // Hết hạn mức là chuyện tạm thời và người dùng không làm gì sai — nói rõ
    // điều đó thay vì dùng chung một câu "tạm chưa trả lời được" như lỗi hệ thống.
    if (allRateLimited) {
      return {
        ok: false as const,
        code: "provider_busy" as const,
        message:
          "Máy chủ AI đang phục vụ nhiều người nên tạm thời quá tải. Bạn chờ khoảng một phút rồi bấm “Gửi lại” là được nhé.",
      };
    }
    return {
      ok: false as const,
      code: "ai_unavailable" as const,
      message: "Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút.",
    };
  },
});
