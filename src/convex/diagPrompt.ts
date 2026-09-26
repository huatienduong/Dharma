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
const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
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
