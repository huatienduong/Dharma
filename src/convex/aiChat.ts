import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Pháp" — trợ lý Phật pháp chuyên ngành của ứng dụng Dhamma Stream, trả lời câu hỏi về Phật giáo theo truyền thống Theravāda (Nguyên thủy / Pāli Canon).

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

/**
 * Gửi hội thoại tới AI trực tuyến và trả về câu trả lời.
 * Dùng AI Gateway của dự án (VLY_INTEGRATION_KEY trên môi trường Convex) —
 * không cần người dùng tự cấu hình khóa nào.
 */
export const ask = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (ctx, { messages }) => {
    // Khách chưa đăng nhập vẫn hỏi được (chỉ không lưu lịch sử —
    // việc lưu do mutation appendMessages tự kiểm tra đăng nhập).
    const userId = await getAuthUserId(ctx);
    void userId;

    if (messages.length === 0) {
      throw new Error("Câu hỏi trống.");
    }

    // Chỉ lấy những lượt gần nhất để giữ ngữ cảnh, luôn bắt đầu bằng system.
    const recent: ChatMessage[] = messages.slice(-HISTORY_LIMIT);
    const payload = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...recent,
    ];

    // Ưu tiên khóa OpenAI riêng (đặt qua tab Keys/API keys). Nếu chưa có,
    // fallback về cổng AI tích hợp sẵn của nền tảng.
    const openaiKey = process.env.OPENAI_API_KEY;
    const vlyKey = process.env.VLY_INTEGRATION_KEY;

    const provider = openaiKey
      ? createOpenAICompatible({
          name: "openai",
          baseURL: "https://api.openai.com/v1",
          apiKey: openaiKey,
        })
      : createOpenAICompatible({
          name: "vly-gateway",
          baseURL: "https://integrations.vly.ai/v1/llm",
          headers: { Authorization: `Bearer ${vlyKey ?? ""}` },
        });

    try {
      const result = await generateText({
        model: provider("gpt-4.1-mini"),
        messages: payload,
        temperature: 0.6,
        maxOutputTokens: 1200,
      });

      const reply = result.text.trim();
      if (!reply) {
        throw new Error(
          "Trợ lý chưa trả lời được. Vui lòng thử gửi lại câu hỏi.",
        );
      }
      return reply;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Lỗi kết nối tới AI.";
      const hint = openaiKey
        ? ""
        : " (Ứng dụng chưa có khóa AI riêng — chủ ứng dụng có thể thêm khóa OPENAI_API_KEY qua tab Keys/API keys để kích hoạt Trợ lý Pháp.)";
      throw new Error(`Không kết nối được trợ lý AI: ${msg}${hint}`);
    }
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
