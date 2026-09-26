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
import { cleanPlainText } from "../lib/textClean";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Thứ tự thử: model nhanh trước, model mạnh sau. */
const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
];
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview"];

/* ------------------------------------------------------------------ */
/* HẠN MỨC NHÀ CUNG CẤP — nguyên nhân gốc của "không trả lời được"     */
/* ------------------------------------------------------------------ */
/*
 * Hạn mức KHÔNG áp dụng giống nhau cho mọi model. Đo thật trên production:
 *   - Groq: 1.000 request/phút nhưng chỉ 8.000 token/phút cho cả tổ
 *     chức, nên một lượt hỏi dài có thể chạm trần.
 *   - Gemini: `gemini-3.8-flash` đã hết hạn mức (429) trong khi
 *     `gemini-3.5-flash-lite` vẫn chạy tốt.
 * Vì vậy quy tắc ở đây là:
 *   1. KHÔNG bao giờ bỏ dở danh sách model vì một model bị 429 — thử tiếp
 *      model còn lại. Trước đây dừng vòng lặp khiến một model hết hạn mức
 *      làm cả nhánh chết, dù còn model sống đứng ngay sau.
 *   2. Nghỉ tạm theo TỪNG MODEL, không theo cả nhà cung cấp: một model bị
 *      chặn không được ảnh hưởng tới các model khác.
 *   3. Model đang nghỉ bị đẩy xuống cuối danh sách, và lần sau bỏ qua —
 *      nhờ đó không tốn request vào chỗ chắc chắn không sống.
 * Ngoài ra cache lại câu hỏi đơn lặp lại trong 10 phút: người dùng hay
 * bấm "Gửi lại" hoặc hỏi lại đúng câu vừa hỏi, và mỗi lần lặp lại đều
 * tốn hạn mức của những người đang dùng thật.
 */
const MODEL_COOLDOWN_MS = 60_000;
/** Hết hạn mức cả ngày thì nghỉ lâu hơn, tránh gọi vô ích. */
const MODEL_QUOTA_COOLDOWN_MS = 10 * 60_000;
const modelCooldown = new Map<string, number>();

function markModelCooldown(model: string, ms: number): void {
  modelCooldown.set(model, Date.now() + ms);
}

/** Model chưa bị chặn đứng trước; model đang nghỉ đẩy xuống cuối. */
function orderModels(models: string[]): string[] {
  const now = Date.now();
  const busy = models.filter((m) => (modelCooldown.get(m) ?? 0) > now);
  const free = models.filter((m) => (modelCooldown.get(m) ?? 0) <= now);
  return [...free, ...busy];
}

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
- Câu MỞ ĐẦU mỗi câu trả lời phải là câu trả lời thật, viết thành văn xuôi. TUYỆT ĐỐI không mở đầu bằng dấu gạch ngang, gạch đầu dòng, số thứ tự hay dấu hai chấm.
- Giải thích thuật ngữ Pāli ngay sau khi dùng (dukkha = khổ, vipassanā = quán chiếu...).
- Trò chuyện như người bạn thật: đồng cảm trước khi vào giáo lý, nhớ và nhắc lại chuyện người dùng đã kể, quan tâm chủ động.
- KHÔNG dùng emoji. KHÔNG dùng ký tự markdown (###, **, *, ---, |). Trả lời bằng tiếng Việt.
- Không biết thì nói không biết; không chẩn đoán y khoa/tâm lý; không hành xử như bậc đạo hạnh thực thụ.
- Nhớ toàn bộ cuộc trò chuyện, không chỉ lượt gần nhất.

DẪN NGUỒN — CHỈ KHI NGƯỜI DÙNG HỎI:
- TUYỆT ĐỐI KHÔNG tự ý chèn đường dẫn hay danh sách nguồn ở cuối câu trả lời. Nói về kinh điển thì chỉ nêu TÊN KINH + SỐ HIỆU ngay trong câu (ví dụ "Kinh Tứ Thánh Đế, Saṃyutta Nikāya 56.11", "Dhammapada 183").
- Chỉ khi người dùng hỏi rõ ("nguồn ở đâu", "trích dẫn", "dẫn chứng", "link", "theo kinh nào", "tìm đọc ở đâu") thì mới đưa tối đa 1–2 đường dẫn thật ở cuối (suttacentral.net, dhammatalks.org, cbetaonline.dila.edu.tw). TUYỆT ĐỐI không bịa đường dẫn.

${featuresPrompt(true)}`;

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Tự dò model Gemini còn sống thay vì chỉ hardcode.
 *
 * Google đã thu hồi `gemini-2.5-flash` và `gemini-2.5-flash-lite` cho tài
 * khoản mới — danh sách viết cứng lúc đó im lặng chết, mỗi câu hỏi mất
 * thêm hai lần gọi rồi mới tới model còn sống. Đọc danh mục model của chính
 * khoá đang dùng giúp ứng dụng tự thích nghi lần thu hồi sau. Hỏng thì quay
 * về danh sách dự phòng.
 */
async function listGeminiTextModels(key: string): Promise<string[]> {
  try {
    const res = await fetch(`${GEMINI_BASE}/models?pageSize=200`, {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return GEMINI_MODELS;
    const json = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const alive = (json.models ?? [])
      .filter((m) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent"),
      )
      .map((m) => (m.name ?? "").replace(/^models\//, ""))
      .filter(
        (id) =>
          id &&
          /flash/i.test(id) &&
          !/-tts|-image|-embedding|-aqa|-live|-audio|-safety/i.test(id),
      );
    if (alive.length === 0) return GEMINI_MODELS;
    // Ưu tiên model đã biết chắc dùng được, phần còn lại để dự phòng.
    return [
      ...GEMINI_MODELS.filter((m) => alive.includes(m)),
      ...alive.filter((m) => !GEMINI_MODELS.includes(m)),
    ].slice(0, 3);
  } catch {
    return GEMINI_MODELS;
  }
}

function firstText(json: unknown): string {
  const c = (json as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content;
  return (c ?? "").trim();
}

/** Người dùng có đang hỏi về nguồn / trích dẫn không. */
function askedForSource(text: string): boolean {
  return /ngu[oồ]n|tr[ií]ch d[aâ]n|d[aâ]n ch[aứ]ng|https?:|link|tra c[uứ]u|tham kh[aả]o|t[ií]m đ[oọ]c|\burl\b/i.test(
    text,
  );
}

/**
 * Dọn câu trả lời cho sạch trước khi hiện lên.
 *
 * Prompt đã dặn không mở đầu bằng gạch đầu dòng và không tự chèn nguồn,
 * nhưng model vẫn hay bịa quen đọng. Hai việc này làm chắc chắn hơn:
 *   1. Gỡ dấu gạch ở đầu câu mở đầu (hay gặp: "– Tứ Thánh Đế là…").
 *   2. Khi người dùng KHÔNG hỏi nguồn thì bỏ các dòng chỉ chứa đường dẫn
 *      ở cuối câu trả lời. Họ hỏi nguồn thì vẫn giữ nguyên.
 */
function tidyReply(text: string, question: string): string {
  const out = cleanPlainText(text);
  if (askedForSource(question)) return out;
  const lines = out.split("\n");
  while (
    lines.length > 1 &&
    /^\s*(?:https?:\/\/\S+\s*)+$/.test(lines[lines.length - 1])
  ) {
    lines.pop();
  }
  return lines.join("\n").trim();
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
    // Chỉ gửi 6 lượt gần nhất, mỗi lượt cắn còn 700 ký tự: vừa đủ ngữ cảnh
    // mà không ăn hết hạn mức token của cả phút.
    const context = recent.slice(-6).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 700),
    }));
    const errors: string[] = [];
    /** Câu hỏi cuối cùng — dùng để biết người dùng có hỏi về nguồn không. */
    const lastQuestion = context[context.length - 1]?.content ?? "";
    /** true = mọi lỗi đều do hết hạn mức (429), thông báo sẽ dịu hơn */
    let allRateLimited = true;
    const groqKeyPresent = Boolean(process.env.GROQ_API_KEY);
    const geminiKeyPresent = Boolean(process.env.GEMINI_API_KEY);
    if (!groqKeyPresent && !geminiKeyPresent) {
      return {
        ok: false as const,
        code: "no_provider" as const,
        message:
          "Máy chủ chưa cấu hình khoá AI. Vui lòng thử lại sau ít phút hoặc báo lỗi qua mục Góp ý.",
      };
    }

    // 1) Groq REST — không qua AI SDK nên không cùng lỗi với nhánh chính.
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKeyPresent) {
      for (const model of orderModels(GROQ_MODELS)) {
        if ((modelCooldown.get(model) ?? 0) > Date.now()) {
          errors.push(`${model}: đang nghỉ sau lần bị giới hạn gần nhất`);
          continue;
        }
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
                ...context,
              ],
              temperature: 0.35,
              max_tokens: 700,
            }),
            signal: AbortSignal.timeout(40_000),
          });
          if (!httpRes.ok) {
            const detail = await httpRes.text().catch(() => "");
            errors.push(`${model}: HTTP ${httpRes.status} ${detail.slice(0, 140)}`);
            if (httpRes.status === 429) {
              // Chỉ model này bị chặn — thử tiếp model còn lại.
              markModelCooldown(model, MODEL_COOLDOWN_MS);
              continue;
            }
            allRateLimited = false;
            continue;
          }
          const text = firstText(await httpRes.json());
          if (text) {
            const reply = tidyReply(text, lastQuestion);
            writeCache(cacheKey, reply, model);
            return { ok: true as const, reply, provider: model };
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
    if (geminiKey && geminiKeyPresent) {
      const contents = context.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      while (contents.length > 0 && contents[0].role !== "user") contents.shift();
      for (const model of orderModels(await listGeminiTextModels(geminiKey))) {
        if ((modelCooldown.get(model) ?? 0) > Date.now()) {
          errors.push(`${model}: đang nghỉ sau lần bị giới hạn gần nhất`);
          continue;
        }
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
              // Hết hạn mức của riêng model này (thường là hạn mức cả ngày):
              // nghỉ lâu hơn và thử model còn lại.
              markModelCooldown(
                model,
                /quota|exceeded your current quota/i.test(detail)
                  ? MODEL_QUOTA_COOLDOWN_MS
                  : MODEL_COOLDOWN_MS,
              );
              continue;
            }
            allRateLimited = false;
            continue;
          }
          const json = (await httpRes.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = (json.candidates?.[0]?.content?.parts ?? [])
            .filter((p) => !(p as { thought?: boolean }).thought)
            .map((p) => p.text ?? "")
            .join("")
            .trim();
          if (text) {
            const reply = tidyReply(text, lastQuestion);
            writeCache(cacheKey, reply, model);
            return { ok: true as const, reply, provider: model };
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
