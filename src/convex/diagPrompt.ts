/**
 * CHẨN ĐOÁN NHÁNH CHAT — tìm lý do `aiChat:ask` trả về lỗi trong khi model
 * vẫn sống (probe `diagChat` gọi thẳng vẫn OK).
 *
 * So sánh ba biến thể cùng một request:
 *   1. systemPrompt ngắn, maxOutputTokens nhỏ  → đường chuẩn
 *   2. systemPrompt dài ~12.000 ký tự           → kiểm tra giới hạn độ dài
 *   3. đúng systemPrompt của ứng dụng          → tái hiện lỗi thật
 * Mọi lỗi đều được trả về nguyên văn để không phải đoán.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { featuresPrompt } from "../lib/appFeatures";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
];

async function probe(
  groqKey: string,
  model: string,
  system: string,
  maxTokens: number,
): Promise<{ model: string; ok: boolean; ms: number; note: string }> {
  const started = Date.now();
  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Ứng dụng này có những tính năng gì?" },
        ],
        temperature: 0.35,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        model,
        ok: false,
        ms: Date.now() - started,
        note: `HTTP ${res.status} ${text.slice(0, 220)}`,
      };
    }
    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content ?? "";
    return {
      model,
      ok: reply.trim().length > 0,
      ms: Date.now() - started,
      note: reply.trim() ? reply.slice(0, 120) : "trả vời rỗng",
    };
  } catch (err) {
    return {
      model,
      ok: false,
      ms: Date.now() - started,
      note: err instanceof Error ? err.message : String(err),
    };
  }
}

export const diagPrompt = action({
  args: {},
  handler: async () => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return { ok: false, message: "Thiếu GROQ_API_KEY." };
    const features = featuresPrompt();
    const long = features.repeat(6);
    const results: Record<string, unknown>[] = [];
    for (const model of GROQ_MODELS) {
      results.push({
        case: "system ngắn, max_tokens 512",
        ...(await probe(groqKey, model, "Bạn là trợ lý Phật học, trả lời ngắn gọn.", 512)),
      });
      results.push({
        case: `system dài ${long.length} ký tự, max_tokens 512`,
        ...(await probe(groqKey, model, long, 512)),
      });
      results.push({
        case: `system tính năng ${features.length} ký tự, max_tokens 4096`,
        ...(await probe(groqKey, model, features, 4096)),
      });
    }
    return { ok: true, results };
  },
});

/**
 * ĐO HẠN MỨC THẬT của nhà cung cấp.
 *
 * Lỗi "không trả lời được" gần đây không phải do model chết mà do HẠN MỨC:
 * Groq trả 429 sau khoảng chục lượt/phút, Gemini cũng vậy. Action này gọi
 * đúng một lượt mỗi nhà cung cấp rồi trả về nguyên header hạn mức
 * (`x-ratelimit-*`, `retry-after`) cùng mã lỗi — để biết chính xác trần
 * mỗi phút thay vì suy đoán từ số lần gọi.
 */
/**
 * CHẨN ĐOÁN NHÁNH ĐỌC ẢNH — trả về nguyên văn lỗi HTTP của từng model.
 *
 * Nhánh ảnh chỉ log lỗi ở máy chủ nên người dùng chỉ thấy "chưa phân tích
 * được". Action này dựng đúng một yêu cầu như `analyzeImage` (kèm ảnh 1x1
 * thật) rồi trả về mã lỗi + nội dung phản hồi, để biết chính xác model nào
 * chết và vì lý do gì thay vì đoán.
 */
export const diagVision = action({
  args: {},
  handler: async () => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return { ok: false, message: "Thiếu GEMINI_API_KEY." };
    // Ảnh PNG 1x1, đủ nhỏ để gọi nhanh nhưng là ảnh thật.
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3-flash-preview",
    ];
    const results: Record<string, unknown>[] = [];
    for (const model of models) {
      // Thử cả hai cách gửi tham số: có temperature (như code cũ) và không.
      for (const withTemp of [true, false]) {
        const started = Date.now();
        try {
          const res = await fetch(
            `${GEMINI_BASE}/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey,
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: "Bạn mô tả hình ảnh bằng tiếng Việt, ngắn gọn." }],
                },
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: "Ảnh này có gì?" },
                      { inlineData: { mimeType: "image/png", data: png } },
                    ],
                  },
                ],
                generationConfig: {
                  ...(withTemp ? { temperature: 0.5 } : {}),
                  maxOutputTokens: 2048,
                },
              }),
              signal: AbortSignal.timeout(60_000),
            },
          );
          const body = await res.text();
          results.push({
            model,
            withTemp,
            status: res.status,
            ok: res.ok,
            ms: Date.now() - started,
            body: body.slice(0, 260),
          });
        } catch (err) {
          results.push({
            model,
            withTemp,
            ms: Date.now() - started,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    return { ok: true, results };
  },
});

export const diagProviders = action({
  args: {},
  handler: async () => {
    const out: Record<string, unknown> = {};
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const started = Date.now();
      try {
        const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages: [{ role: "user", content: "Trả lời đúng một chữ: ok" }],
            max_tokens: 16,
          }),
          signal: AbortSignal.timeout(30_000),
        });
        const body = await res.text();
        out.groq = {
          status: res.status,
          ok: res.ok,
          ms: Date.now() - started,
          headers: {
            limitRequests: res.headers.get("x-ratelimit-limit-requests"),
            remainingRequests: res.headers.get("x-ratelimit-remaining-requests"),
            limitTokens: res.headers.get("x-ratelimit-limit-tokens"),
            remainingTokens: res.headers.get("x-ratelimit-remaining-tokens"),
            retryAfter: res.headers.get("retry-after"),
          },
          body: body.slice(0, 240),
        };
      } catch (err) {
        out.groq = { error: err instanceof Error ? err.message : String(err) };
      }
    } else {
      out.groq = { error: "Thiếu GROQ_API_KEY" };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiOut: Record<string, unknown> = {};
    if (geminiKey) {
      for (const model of [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
      ]) {
        const started = Date.now();
        try {
          const res = await fetch(
            `${GEMINI_BASE}/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": geminiKey,
              },
              body: JSON.stringify({
                contents: [
                  { role: "user", parts: [{ text: "Trả lời đúng một chữ: ok" }] },
                ],
                generationConfig: { maxOutputTokens: 16 },
              }),
              signal: AbortSignal.timeout(30_000),
            },
          );
          const body = await res.text();
          geminiOut[model] = {
            status: res.status,
            ok: res.ok,
            ms: Date.now() - started,
            retryAfter: res.headers.get("retry-after"),
            body: body.slice(0, 240),
          };
        } catch (err) {
          geminiOut[model] = {
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }
    } else {
      geminiOut.error = "Thiếu GEMINI_API_KEY";
    }
    out.gemini = geminiOut;
    return out;
  },
});
