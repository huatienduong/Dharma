import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

/** Đọc nội dung đã cache (công khai — nội dung học liệu dùng chung) */
export const getDoc = query({
  args: { kind: v.string(), refId: v.string() },
  handler: async (ctx, { kind, refId }) => {
    return await ctx.db
      .query("aiDocs")
      .withIndex("by_kind_ref", (q) => q.eq("kind", kind).eq("refId", refId))
      .first();
  },
});

/* ------------------------------------------------------------------ */
/* Cấu hình nhà cung cấp (dùng chung với aiChat)                       */
/* ------------------------------------------------------------------ */

type Provider = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

function listProviders(): Provider[] {
  const out: Provider[] = [];
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const vlyKey = process.env.VLY_INTEGRATION_KEY;

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

/* ------------------------------------------------------------------ */
/* Prompt hệ thống biên soạn nội dung Theravāda                        */
/* ------------------------------------------------------------------ */

const SYSTEM = `Bạn là học giả Phật học Theravāda (Phật giáo Nguyên thủy) chuyên biên soạn nội dung học liệu tiếng Việt. Quy tắc bắt buộc:

1. CHỈ dựa trên Kinh tạng Pāli (nikāya), Abhidhamma, Luật tạng Pāli, Aṭṭhakathā (Chú giải) và Ṭīkā (Từ chú giải) theo truyền thống Mahāvihāra Sri Lanka.
2. Cấu trúc trả lời bằng markdown đơn giản:
   - Tiêu đề bắt đầu bằng "## "
   - Đoạn văn thường
   - Liệt kê bắt đầu bằng "• "
   - In đậm "**từ khóa**"
3. Không bịa trích dẫn. Khi nêu kinh điển phải đúng tên + số hiệu (vd "Majjhima Nikāya 118", "Saṃyutta Nikāya 56.11", "Dhammapada 276").
4. Người đọc là Phật tử Việt Nam tu tập tại gia — văn phong trang nghiêm, rõ ràng, dễ hiểu, tránh thuật ngữ Sanskrit khi có từ Pāli chuẩn.
5. Cuối nội dung BẮT BUỘC có một dòng riêng bắt đầu bằng "Nguồn: " nêu rõ kinh điển/tập/trang tham chiếu chính.`;

/* ------------------------------------------------------------------ */
/* Nhóm action sinh nội dung (mỗi loại một action để prompt riêng)     */
/* ------------------------------------------------------------------ */

async function generateWithFallback(
  prompt: string,
  maxTokens: number,
): Promise<{ text: string; errors: string[] }> {
  const providers = listProviders();
  if (providers.length === 0) {
    throw new Error(
      "AI chưa được cấu hình. Chủ ứng dụng vui lòng thêm GROQ_API_KEY (miễn phí) hoặc GEMINI_API_KEY qua tab Keys/API keys.",
    );
  }
  const errors: string[] = [];
  for (const p of providers) {
    try {
      const result = await generateText({
        model: p.make()(p.model),
        messages: [
          { role: "system" as const, content: SYSTEM },
          { role: "user" as const, content: prompt },
        ],
        temperature: 0.4,
        maxOutputTokens: maxTokens,
      });
      const text = result.text.trim();
      if (text.length > 200) return { text, errors };
      errors.push(`${p.label}: nội dung quá ngắn`);
    } catch (err) {
      errors.push(`${p.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Không tạo được nội dung. Chi tiết: ${errors.join(" | ")}`);
}

/** Lưu nội dung AI biên soạn vào cache dùng chung */
export const cacheDoc = mutation({
  args: {
    kind: v.string(),
    refId: v.string(),
    title: v.string(),
    body: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { kind, refId, title, body, source }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Cần đăng nhập.");
    const existing = await ctx.db
      .query("aiDocs")
      .withIndex("by_kind_ref", (q) => q.eq("kind", kind).eq("refId", refId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { title, body, source });
      return existing._id;
    }
    return await ctx.db.insert("aiDocs", {
      kind,
      refId,
      title,
      body,
      source,
      createdAt: Date.now(),
    });
  },
});

export const generateSutta = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, { refId, title, extra }) => {
    await getAuthUserId(ctx);
    const prompt = `Hãy biên soạn BÀI KINH PHẬT GIÁO đầy đủ, có thể đọc trực tiếp và thực hành chiêm nghiệm, theo yêu cầu sau:
- Mã kinh: ${refId}
- Tên gợi ý: ${title ?? "(tự xác định theo mã kinh)"}
${extra ? `- Ghi chú thêm: ${extra}` : ""}

Yêu cầu cấu trúc:
1. "## Danh xưng" — câu mở đầu đúng chuẩn Pāli (Namo Tassa... nếu phù hợp) hoặc bối cảnh (Như vầy tôi nghe...).
2. "## Bối cảnh" — Đức Phật thuyết tại đâu, cho ai.
3. "## Kinh văn" — phần kinh chính, chia đoạn ngắn dễ đọc, mỗi đoạn trước có "• Đoạn n:" hoặc đánh số.
4. "## Ý nghĩa" — luận giải cốt lõi theo truyền thống Theravāda.
5. "## Thực hành" — gợi ý ứng dụng tu tập.
6. Kết thúc bằng dòng "Nguồn: ..." (nikāya + số hiệu + tham chiếu ATī/BU nếu rõ).`;
    const { text } = await generateWithFallback(prompt, 4000);
    return text;
  },
});

export const generateVinaya = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, { refId, title, extra }) => {
    await getAuthUserId(ctx);
    const prompt = `Hãy biên soạn NỘI DUNG LUẬT TẠNG (Vinaya Piṭaka) đầy đủ, đọc trực tiếp được:
- Mã văn bản: ${refId}
- Tên gợi ý: ${title ?? "(tự xác định)"}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc:
1. "## Tổng quan" — văn bản này thuộc Piṭaka nào (Pārājika, Pācittiya, Mahāvagga...), phạm vi áp dụng.
2. "## Nội dung điều luật" — các điều chính, mỗi điều "• Điều n — ...", nêu ý nghĩa và trường hợp vi phạm.
3. "## Ý nghĩa kỷ luật" — mục đích của giới luật theo lời Đức Phật (svakkhāta...).
4. Kết thúc bằng "Nguồn: ...".`;
    const { text } = await generateWithFallback(prompt, 4000);
    return text;
  },
});

export const generateDictEntry = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, { refId, title, extra }) => {
    await getAuthUserId(ctx);
    const prompt = `Hãy viết MỤC TỪ ĐIỂN PHẬT HỌC chi tiết cho thuật ngữ:
- Thuật ngữ / Pāli: ${refId}
- Tên gợi ý: ${title ?? ""}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc:
1. "## Nghĩa" — nghĩa đen, nghĩa theo ngữ cảnh kinh điển.
2. "## Giải nghĩa Theravāda" — định nghĩa chuẩn Mahāvihāra, liên hệ Abhidhamma nếu phù hợp.
3. "## Trong kinh điển" — các kinh đề cập (đúng số hiệu).
4. "## Liên hệ thực hành" — ý nghĩa với người tu tập.
5. "Nguồn: ...".`;
    const { text } = await generateWithFallback(prompt, 2500);
    return text;
  },
});

export const generateCommentary = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, { refId, title, extra }) => {
    await getAuthUserId(ctx);
    const prompt = `Hãy biên soạn CHÚ GIẢI (Aṭṭhakathā) cho văn bản/kinh:
- Văn bản: ${refId}
- Tên gợi ý: ${title ?? ""}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc:
1. "## Tổng quan văn bản".
2. "## Chú giải theo đoạn" — đi qua từng phần chính, giải nghĩa từ khó, bối cảnh, ý nghĩa theo Aṭṭhakathā.
3. "## Những điểm cốt lõi".
4. "Nguồn: ...".`;
    const { text } = await generateWithFallback(prompt, 4000);
    return text;
  },
});

export const generateSubcommentary = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (ctx, { refId, title, extra }) => {
    await getAuthUserId(ctx);
    const prompt = `Hãy biên soạn LUẬN GIẢI (Ṭīkā / phân tích hiện đại theo truyền thống Theravāda) cho văn bản/kinh:
- Văn bản: ${refId}
- Tên gợi ý: ${title ?? ""}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc:
1. "## Bố cục luận lý".
2. "## Phân tích cốt lõi" — phân tích giáo lý, so sánh các phần, ý nghĩa trong toàn cảnh giáo pháp.
3. "## Câu hỏi thường gặp" — 3-5 câu hỏi + trả lời.
4. "Nguồn: ...".`;
    const { text } = await generateWithFallback(prompt, 4000);
    return text;
  },
});
