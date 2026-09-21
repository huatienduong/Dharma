import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — trợ lý Phật pháp chuyên ngành của ứng dụng Dharma, trả lời câu hỏi về Phật giáo theo truyền thống Theravāda, đặc biệt là Kinh tạng Pāli và các học thuyết căn bản như: Tứ Diệu Đế, Bát Chánh Đạo, Vô Thường, Khổ, Vô Ngã, Thiền, Tâm và Từ tâm, Luật tạng, Kinh, và Phương pháp tu tập thực tế.

Nguyên tắc trả lời:
1. CHỈ trả lời trong phạm vi Phật học: giáo lý (Tứ Diệu Đế, Thánh Đạo 8 nhánh, Vô Thường - Khổ - Vô Ngã), kinh điển Pāli (Nikāya), Abhidhamma, Luật tạng, Thiền và thực hành đạo đức.
2. Nếu câu hỏi nằm ngoài chủ đề Phật học (ví dụ: code, tin tức, giải toán, giải trí...), từ chối lịch sự bằng một câu và gợi ý quay lại chủ đề Phật học.
3. Không mâu thuẫn với Kinh tạng Pāli; khi có thể nêu nguồn (ví dụ: Kinh Chuyển Pháp Luân SN 56.11, Kinh Niệm Hơi Thở MN 118, Dhammapada...).
4. Không hành xử như một bậc đạo hạnh thực thụ: không ban giới, không "chứng đắc" hộ ai, không thay thế thầy giảng. Với câu hỏi thực hành sâu, khuyến nghị tìm người hướng dẫn có kinh nghiệm.
5. Tôn trọng và không bình luận tiêu cực về các truyền thống Phật giáo khác; nhưng luôn trả lời theo góc nhìn Theravāda khi được hỏi.
6. Trả lời bằng TIẾNG VIỆT, rõ ràng, súc tích, đúng câu chữ Buddhist học thuật; giữ nguyên thuật ngữ Pāli (viết diacritics: dukkha, anicca, anattā, mettā...).
7. Không bịa tên kinh; nếu không chắc nguồn, nói chung "theo Kinh tạng Pāli" thay vì bịa số hiệu.
8. Không đưa ra chẩn đoán y khoa/tâm lý; nếu người dùng mô tả khủng hoảng, khuyên tìm hỗ trợ chuyên môn và thầy hướng dẫn thiền.

Khi trả lời, ưu tiên:
- bật tông rõ ràng, ngắn gọn, có cấu trúc
- nêu định nghĩa, ví dụ và cách ứng dụng thực tiễn
- nếu là câu hỏi ngắn, trả lời tối đa 3-5 đoạn ngắn, không lan man
- nếu người hỏi đang cần thực hành, chỉ đưa hướng dẫn cơ bản và an toàn`;

type ChatMessage = { role: "user" | "assistant"; content: string };

const HISTORY_LIMIT = 6; // giảm bớt context để AI trả lời nhanh hơn
const MAX_TOKENS = 700; // giảm lượng output để tránh chậm và dài dòng

/* ------------------------------------------------------------------ */
/* Danh sách nhà cung cấp AI — ưu tiên tốc độ, fallback chỉ khi cần     */
/* ------------------------------------------------------------------ */

type ProviderChoice = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

function listProviders(needVision: boolean): ProviderChoice[] {
  const out: ProviderChoice[] = [];
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const vlyKey = process.env.VLY_INTEGRATION_KEY;

  if (needVision) {
    if (geminiKey) {
      out.push({
        label: "Gemini",
        make: () =>
          createOpenAICompatible({
            name: "gemini",
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
            apiKey: geminiKey,
          }),
        model: "gemini-2.0-flash",
      });
    }
    if (openaiKey) {
      out.push({
        label: "OpenAI",
        make: () =>
          createOpenAICompatible({
            name: "openai",
            baseURL: "https://api.openai.com/v1",
            apiKey: openaiKey,
          }),
        model: "gpt-4.1-mini",
      });
    }
    return out;
  }

  // Ưu tiên mô hình nhanh hơn cho văn bản
  if (openaiKey) {
    out.push({
      label: "OpenAI",
      make: () =>
        createOpenAICompatible({
          name: "openai",
          baseURL: "https://api.openai.com/v1",
          apiKey: openaiKey,
        }),
      model: "gpt-4.1-mini",
    });
  }
  if (geminiKey) {
    out.push({
      label: "Gemini",
      make: () =>
        createOpenAICompatible({
          name: "gemini",
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: geminiKey,
        }),
      model: "gemini-2.0-flash",
    });
  }
  if (groqKey) {
    out.push({
      label: "Groq",
      make: () =>
        createOpenAICompatible({
          name: "groq",
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: groqKey,
        }),
      model: "llama-3.3-70b-versatile",
    });
  }
  if (vlyKey) {
    out.push({
      label: "Cổng AI tích hợp",
      make: () =>
        createOpenAICompatible({
          name: "vly-gateway",
          baseURL: "https://integrations.vly.ai/v1/llm",
          headers: { Authorization: `Bearer ${vlyKey}` },
        }),
      model: "gpt-4.1-mini",
    });
  }
  return out;
}

/**
 * Gửi hội thoại tới AI trực tuyến và trả về câu trả lời.
 * Khách chưa đăng nhập vẫn hỏi được (chỉ không lưu lịch sử).
 */
export const ask = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    /** Ảnh người dùng tải lên (base64, chỉ lượt hỏi hiện tại) */
    imageBase64: v.optional(v.string()),
    imageMime: v.optional(v.string()),
  },
  handler: async (ctx, { messages, imageBase64, imageMime }) => {
    const userId = await getAuthUserId(ctx);
    void userId;

    if (messages.length === 0 && !imageBase64) {
      throw new Error("Câu hỏi trống.");
    }

    const providers = listProviders(Boolean(imageBase64));
    if (providers.length === 0) {
      throw new Error(
        "Trợ lý Phật học chưa được cấu hình AI. Chủ ứng dụng vui lòng thêm khóa OPENAI_API_KEY hoặc GROQ_API_KEY qua tab Keys/API keys.",
      );
    }

    const recent: ChatMessage[] = messages.slice(-HISTORY_LIMIT);
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };
    const withImage: Array<{
      role: "user" | "assistant";
      content: string | ContentPart[];
    }> = recent.map((m, i) => {
      if (imageBase64 && i === recent.length - 1 && m.role === "user") {
        const parts: ContentPart[] = [
          {
            type: "text",
            text:
              m.content ||
              "Hãy mô tả và giải thích về hình ảnh này trong phạm vi Phật học.",
          },
        ];
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${imageMime ?? "image/jpeg"};base64,${imageBase64}`,
          },
        });
        return { ...m, content: parts };
      }
      return m;
    });
    const payload = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(withImage as ChatMessage[]),
    ];

    const errors: string[] = [];
    for (const provider of providers) {
      try {
        const result = await generateText({
          model: provider.make()(provider.model),
          messages: payload as never,
          temperature: 0.35,
          maxOutputTokens: MAX_TOKENS,
        });
        const reply = result.text.trim();
        if (reply) return reply;
        errors.push(`${provider.label}: trả lời rỗng`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.label}: ${msg}`);
      }
    }
    throw new Error(
      `Không kết nối được Trợ lý Phật học. Chi tiết: ${errors.join(" | ")}` +
        (imageBase64 && !process.env.GEMINI_API_KEY
          ? " — Gửi ảnh cần khóa GEMINI_API_KEY (miễn phí tại aistudio.google.com), dán vào tab Keys/API keys."
          : ""),
    );
  },
});

/**
 * TTS tiếng Việt chất lượng cao — server tổng hợp âm thanh rồi trả về base64.
 * Thứ tự: Gemini TTS (free tier, giọng vi tự nhiên) → OpenAI TTS.
 * Trả về null khi không có khóa TTS → client dùng Web Speech dự phòng.
 */
export const speak = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    void ctx;
    const clean = text.trim().slice(0, 2400);
    if (!clean) return null;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Đọc bằng tiếng Việt, giọng nữ nhẹ nhàng, chậm rãi trang nghiêm: ${clean}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
                },
              },
            }),
          },
        );
        if (res.ok) {
          const json = (await res.json()) as {
            candidates?: {
              content?: {
                parts?: { inlineData?: { data?: string; mimeType?: string } }[];
              };
            }[];
          };
          const part = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (part?.data) {
            return {
              audioBase64: part.data,
              mime: part.mimeType ?? "audio/L16;rate=24000",
            };
          }
        }
      } catch {
        /* thử nhà cung cấp tiếp theo */
      }
    }

    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: "shimmer",
            input: clean,
            response_format: "mp3",
          }),
        });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return { audioBase64: btoa(binary), mime: "audio/mpeg" };
        }
      } catch {
        /* rơi về Web Speech */
      }
    }

    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Lưu / tải / xóa hội thoại (tiến trình không bị mất khi quay lại)     */
/* ------------------------------------------------------------------ */

export const appendMessages = mutation({
  args: {
    items: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;

    const now = Date.now();
    let offset = 0;
    for (const item of items) {
      const content = item.content.trim().slice(0, 8000);
      if (!content) continue;
      await ctx.db.insert("aiMessages", {
        userId,
        role: item.role,
        content,
        createdAt: now + offset++,
      });
    }
  },
});

/** Lấy tối đa 200 tin nhắn gần nhất của người dùng (cũ → mới). */
export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("aiMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    return rows.reverse();
  },
});

/** Xóa toàn bộ hội thoại (bắt đầu lại từ đầu). */
export const clearMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const rows = await ctx.db
      .query("aiMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  },
});
