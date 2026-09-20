import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — trợ lý Phật pháp chuyên ngành của ứng dụng Dharma, trả lời câu hỏi về Phật giáo theo truyền thống Theravāda (Nguyên thủy / Pāli Canon).

Nguyên tắc trả lời:
1. CHỈ trả lời trong phạm vi Phật học: giáo lý (Tứ Diệu Đế, Thánh Đạo 8 nhánh, Vô Thường - Khổ - Vô Ngã), kinh điển Pāli (Nikāya), Abhidhamma, Luật tạng, thiền định (samatha, vipassanā, anapanasati, mettā...), Pāli thuật ngữ, lịch sử Phật giáo nguyên thủy, thực hành đời sống bậc tu.
2. Nếu câu hỏi nằm ngoài chủ đề Phật học (ví dụ: code, tin tức, giải toán, giải trí...), từ chối lịch sự bằng một câu và gợi ý quay lại chủ đề Phật pháp.
3. Không mâu thuẫn với Kinh tạng Pāli; khi có thể nêu nguồn (ví dụ: Kinh Chuyển Pháp Luân SN 56.11, Kinh Niệm Hơi Thở MN 118, Dhammapada...).
4. Không hành xử như một bậc đạo hạnh thực thụ: không ban giới, không "chứng đắc" hộ ai, không thay thế thầy giảng. Với câu hỏi thực hành sâu, khuyến khích hỏi trực tiếp vị giáo thọ/trạng sư.
5. Tôn trọng và không bình luận tiêu cực về các truyền thống Phật giáo khác; nhưng luôn trả lời theo góc nhìn Theravāda khi được hỏi.
6. Trả lời bằng TIẾNG VIỆT, rõ ràng, súc tích, đúng câu chữ Buddhist học thuật; giữ nguyên thuật ngữ Pāli (viết diacritics: dukkha, anicca, anattā, mettā...). Dùng gạch đầu dòng cho câu trả lời dài.
7. Không bịa tên kinh; nếu không chắc nguồn, nói chung "theo Kinh tạng Pāli" thay vì bịa số hiệu.
8. Không đưa ra chẩn đoán y khoa/tâm lý; nếu người dùng mô tả khủng hoảng, khuyên tìm hỗ trợ chuyên môn và thầy hướng dẫn thiền.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

const HISTORY_LIMIT = 12; // số tin nhắn gửi kèm làm ngữ cảnh

/* ------------------------------------------------------------------ */
/* Danh sách nhà cung cấp AI — thử lần lượt khi nhà cung cấp trước lỗi */
/* ------------------------------------------------------------------ */

type ProviderChoice = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

/**
 * Danh sách nhà cung cấp theo khóa khả dụng (ưu tiên từ trên xuống).
 * `needVision=true` khi có ảnh → chỉ trả về nhà cung cấp hỗ trợ ảnh
 * (Gemini qua REST, OpenAI); khi không có khóa vision, trả về mảng rỗng
 * để báo lỗi rõ ràng thay vì gửi ảnh cho model văn bản.
 */
function listProviders(needVision: boolean): ProviderChoice[] {
  const out: ProviderChoice[] = [];
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const vlyKey = process.env.VLY_INTEGRATION_KEY;

  if (needVision) {
    // Ảnh: Groq không hỗ trợ — dùng Gemini (free tier) hoặc OpenAI
    if (geminiKey) {
      out.push({
        label: "Gemini",
        make: () =>
          createOpenAICompatible({
            name: "gemini",
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
            apiKey: geminiKey,
          }),
        // FIX: gemini-2.0-flash đã bị Google ngừng (404) → dùng alias mới nhất
        model: "gemini-flash-latest",
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

  // Văn bản: Groq ưu tiên đầu (nhanh, miễn phí, ổn định)
  if (groqKey) {
    out.push({
      label: "Groq",
      make: () =>
        createOpenAICompatible({
          name: "groq",
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: groqKey,
        }),
      model: "openai/gpt-oss-120b",
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
      model: "gemini-flash-latest",
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

    const providers = listProviders(imageBase64 ? true : false);
    if (providers.length === 0) {
      throw new Error(
        "Trợ lý Phật học chưa được cấu hình AI. Chủ ứng dụng vui lòng thêm khóa OPENAI_API_KEY hoặc GROQ_API_KEY qua tab Keys/API keys.",
      );
    }

    const recent: ChatMessage[] = messages.slice(-HISTORY_LIMIT);
    // Gắn ảnh vào tin nhắn user cuối (đa phương thức, chuẩn OpenAI)
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };
    const withImage: Array<{
      role: "user" | "assistant";
      content: string | ContentPart[];
    }> = recent.map((m, i) => {
      if (
        imageBase64 &&
        i === recent.length - 1 &&
        m.role === "user"
      ) {
        const parts: ContentPart[] = [
          { type: "text", text: m.content || "Hãy mô tả và giải thích về hình ảnh này trong phạm vi Phật học." },
        ];
        parts.push({
          type: "image_url",
          image_url: { url: `data:${imageMime ?? "image/jpeg"};base64,${imageBase64}` },
        });
        return { ...m, content: parts };
      }
      return m;
    });
    const payload = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(withImage as ChatMessage[]),
    ];

    // Thử lần lượt từng nhà cung cấp — nhà sau tự thay khi nhà trước lỗi
    // (hết credits, khóa bị từ chối, giới hạn tần suất...)
    const errors: string[] = [];
    for (const provider of providers) {
      try {
        const result = await generateText({
          model: provider.make()(provider.model),
          messages: payload as never,
          temperature: 0.6,
          maxOutputTokens: 1200,
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

    // --- Gemini TTS (gemini-2.5-flash-preview-tts, giọng Kore chuẩn) ---
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
                    { text: `Đọc bằng tiếng Việt, giọng nữ nhẹ nhàng, chậm rãi trang nghiêm: ${clean}` },
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
            return { audioBase64: part.data, mime: part.mimeType ?? "audio/L16;rate=24000" };
          }
        }
      } catch {
        /* thử nhà cung cấp tiếp theo */
      }
    }

    // --- OpenAI TTS (gpt-4o-mini-tts) ---
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
