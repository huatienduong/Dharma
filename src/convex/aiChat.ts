import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — người bạn đồng hành trên con đường Phật pháp. Kiến thức chuyên sâu theo truyền thống Theravāda (Kinh tạng Pāli, Tứ Diệu Đế, Bát Chánh Đạo, Vô Thường - Khổ - Vô Ngã, Thiền, Abhidhamma, Luật tạng), đồng thời mở rộng cho TẤT CẢ những gì liên quan đến Phật pháp: các truyền thống Phật giáo khác (Mahāyāna, Thiền tông, Tịnh Độ tông, Mật tông...), lịch sử Phật giáo, nhân vật và danh lam tự viện, văn hóa – nghệ thuật Phật giáo, ứng dụng Phật pháp vào đời sống (gia đình, công việc, an lạc hằng ngày), thực hành như cúng dường, thọ giới, hồi hướng, lễ Phật, và cả những trò chuyện đời thường về an lạc, hạnh phúc, ý nghĩa sống.

Phong cách trò chuyện:
- THÂN THIỆT, GẦN GŨI như một người bạn đồng tu: xưng "mình – bạn" hoặc "tôi – anh/chị" tùy giọng câu hỏi, ấm áp tự nhiên, không cứng nhắc học thuật.
- Có thể dùng biểu tượng nhẹ nhàng (🙏 🌸 ☸️) khi phù hợp, không lạm dụng.
- Câu hỏi ngắn → trả lời ngắn gọn ấm áp; câu hỏi sâu → trả lời có cấu trúc rõ ràng, ví dụ gần gũi đời sống.
- Tôn trọng và khẳng định giá trị chung của mọi truyền thống Phật giáo; khi được so sánh, giải thích công bằng, không phán xét.
- Giữ nguyên thuật ngữ Pāli có dấu (dukkha, anicca, anattā, mettā...), giải thích đơn giản ngay sau thuật ngữ khó.
- Không bịa tên kinh; nếu không chắc nguồn, nói chung "theo Kinh tạng Pāli" thay vì bịa số hiệu; khi có thể nêu nguồn (SN 56.11, MN 118, Dhammapada...).
- Không hành xử như bậc đạo hạnh thực thụ: không ban giới, không "chứng đắc" hộ ai, không thay thế thầy giảng; câu hỏi thực hành sâu thì khuyến nghị tìm người hướng dẫn có kinh nghiệm.
- Không đưa ra chẩn đoán y khoa/tâm lý; người dùng đang khủng hoảng thì đồng cảm trước, khuyên tìm hỗ trợ chuyên môn và thầy hướng dẫn thiền.
- Trả lời bằng TIẾNG VIỆT luôn luôn.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

/* ------------------------------------------------------------------ */
/* GIỚI HẠN TỐC ĐỘ THEO THIẾT BỊ — chặn bot/thiết bị bị can thiệp      */
/* đốt hạn mức AI. Thiết bị hợp lệ: 15 câu hỏi + 20 đọc / phút.        */
/* Thiết bị nghi ngờ (tín hiệu tự động hóa): chỉ 2 + 3 / phút.         */
/* ------------------------------------------------------------------ */

const RATE_ASK = { ok: 15, suspicious: 2 } as const;
const RATE_SPEAK = { ok: 20, suspicious: 3 } as const;
const RATE_WINDOW_MS = 60_000;

/**
 * Kiểm tra & cộng bộ đếm giới hạn tốc độ. Actions không truy cập db trực
 * tiếp nên ủy quyền qua internalMutation. Trả về null nếu được phép,
 * ngược lại là thông điệp từ chối.
 */
async function checkRateLimit(
  ctx: ActionCtx,
  bucket: "ask" | "speak",
  deviceId: string | undefined,
  integrity: string | undefined,
): Promise<string | null> {
  // Chỉ tin thiết bị báo integrity "ok" VÀ có deviceId hợp lệ; mọi trường
  // hợp khác (bot giả mạo, client cũ bỏ tham số) rơi vào mức nghi ngờ ngặt.
  const trusted =
    integrity === "ok" && typeof deviceId === "string" && deviceId.length >= 8;
  const key = trusted ? deviceId!.slice(0, 64) : "anonymous";
  const limit = trusted
    ? bucket === "ask"
      ? RATE_ASK.ok
      : RATE_SPEAK.ok
    : bucket === "ask"
      ? RATE_ASK.suspicious
      : RATE_SPEAK.suspicious;

  const res = await ctx.runMutation(internal.aiChat.checkAiRateLimit, {
    bucket,
    deviceId: key,
    limit,
  });
  if (res.allowed) return null;
  return trusted
    ? "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại."
    : "Thiết bị của bạn đang bị giới hạn vì có tín hiệu không bảo đảm. Vui lòng tắt chế độ tự động hóa / công cụ gỡ lỗi rồi thử lại.";
}

/** internalMutation: cộng bộ đếm giới hạn tốc độ cho action AI. */
export const checkAiRateLimit = internalMutation({
  args: {
    bucket: v.union(v.literal("ask"), v.literal("speak")),
    deviceId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { bucket, deviceId, limit }) => {
    const now = Date.now();
    const row = await ctx.db
      .query("aiRateLimits")
      .withIndex("by_bucket_device", (q) =>
        q.eq("bucket", bucket).eq("deviceId", deviceId),
      )
      .unique();
    if (row && now - row.windowStart < RATE_WINDOW_MS) {
      if (row.count >= limit) return { allowed: false };
      await ctx.db.patch(row._id, { count: row.count + 1 });
      return { allowed: true };
    }
    // Khung 60s mới — reset bộ đếm (tạo hàng nếu chưa có)
    if (row) {
      await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("aiRateLimits", {
        bucket,
        deviceId,
        windowStart: now,
        count: 1,
      });
    }
    return { allowed: true };
  },
});

const HISTORY_LIMIT = 4; // ngữ cảnh gọn → phản hồi nhanh hơn
const MAX_TOKENS = 4096; // cho phép câu trả lời dài hơn, tránh bị cắt giữa chừng
const AI_TIMEOUT_MS = 60_000; // cho phép Gemini đủ thời gian sinh câu trả lời dài

/* ------------------------------------------------------------------ */
/* BẢN ĐỒ GIỌNG TTS — đồng bộ với danh mục client (src/lib/aiVoices.ts). */
/* Client gửi voice id + male; máy chủ chọn giọng Gemini/OpenAI tương ứng. */
/* ------------------------------------------------------------------ */

type ServerVoice = { gemini: string; openai: string; male: boolean };

const SERVER_VOICES: Record<string, ServerVoice> = {
  metta: { gemini: "Kore", openai: "shimmer", male: false },
  karuna: { gemini: "Puck", openai: "coral", male: false },
  panna: { gemini: "Leda", openai: "sage", male: false },
  sati: { gemini: "Aoede", openai: "nova", male: false },
  mettam: { gemini: "Enceladus", openai: "echo", male: true },
  adosa: { gemini: "Algieba", openai: "onyx", male: true },
  upekkha: { gemini: "Alnilam", openai: "fable", male: true },
  sila: { gemini: "Iapetus", openai: "alloy", male: true },
};

/* ------------------------------------------------------------------ */
/* Danh sách nhà cung cấp AI — ưu tiên tốc độ, fallback chỉ khi cần     */
/* ------------------------------------------------------------------ */

type ProviderChoice = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

function listProviders(needVision: boolean): ProviderChoice[] {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return [];
  }

  return [
    {
      label: "Gemini",
      make: () =>
        createOpenAICompatible({
          name: "gemini",
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: geminiKey,
        }),
      model: "gemini-3.5-flash-lite",
    },
  ];
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
    /** Dấu vân tay thiết bị (từ deviceSecurity) — phục vụ giới hạn tốc độ */
    deviceId: v.optional(v.string()),
    /** Trạng thái bảo vệ thiết bị client tự báo cáo: ok | suspicious | blocked */
    integrity: v.optional(v.string()),
  },
  handler: async (ctx, { messages, imageBase64, imageMime, deviceId, integrity }) => {
    // Chặn bot / thiết bị bị can thiệp đốt hạn mức AI trước khi gọi provider
    const denied = await checkRateLimit(ctx, "ask", deviceId, integrity);
    if (denied) throw new Error(denied);

    const userId = await getAuthUserId(ctx);
    void userId;

    if (messages.length === 0 && !imageBase64) {
      throw new Error("Câu hỏi trống.");
    }

    // Chống tấn công: giới hạn kích thước đầu vào — bot gửi payload khổng lồ
    // sẽ bị từ chối ngay trước khi chạm provider AI.
    if (messages.length > 60) {
      throw new Error("Hội thoại quá dài. Hãy xóa hội thoại và bắt đầu lại.");
    }
    for (const m of messages) {
      if (typeof m.content !== "string" || m.content.length > 8000) {
        throw new Error("Tin nhắn vượt quá độ dài cho phép.");
      }
    }
    if (imageBase64 && imageBase64.length > 9_000_000) {
      throw new Error("Ảnh quá lớn (tối đa khoảng 6MB).");
    }

    const providers = listProviders(Boolean(imageBase64));
    if (providers.length === 0) {
      throw new Error(
        "Trợ lý Phật học chưa kết nối được máy chủ AI. Vui lòng thử lại sau ít phút hoặc báo lỗi qua mục Góp ý.",
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
        // FIX lỗi "trợ lý không phản hồi":
        const result = await Promise.race([
          generateText({
            model: provider.make()(provider.model),
            messages: payload as never,
            temperature: 0.35,
            maxOutputTokens: MAX_TOKENS,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("hết giờ (45s)")),
              AI_TIMEOUT_MS,
            ),
          ),
        ]);
        const reply = result.text.trim();
        if (reply) return reply;
        // Giải thích rõ vì sao rỗng thay vì chỉ "trả lời rỗng"
        const finish = (result as { finishReason?: unknown }).finishReason;
        errors.push(
          `${provider.label}: trả lời rỗng${
            finish ? ` (finishReason=${String(finish)})` : ""
          }`,
        );
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);
        errors.push(`${provider.label}: ${msg}`);
      }
    }
    throw new Error(
      `Không kết nối được Trợ lý Phật học. Chi tiết: ${errors.join(" | ")}` +
        (imageBase64 && providers.every((p) => p.label !== "Cổng AI nền tảng")
          ? " — Gửi ảnh cần máy chủ AI hỗ trợ thị giác, vui lòng thử lại sau."
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
  args: {
    text: v.string(),
    /** Giọng đọc người dùng chọn (xem AI_VOICES) — null = mặc định */
    voice: v.optional(v.string()),
    /** true = giọng nam, false = giọng nữ, null = mặc định */
    male: v.optional(v.boolean()),
    /** Dấu vân tay thiết bị — phục vụ giới hạn tốc độ */
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (ctx, { text, voice, male, deviceId, integrity }) => {
    void ctx;
    // Giới hạn tốc độ cả TTS — chặn bot quay vùng đọc text miễn phí
    const denied = await checkRateLimit(ctx, "speak", deviceId, integrity);
    if (denied) throw new Error(denied);
    const clean = text.trim().slice(0, 2400);
    if (!clean) return null;
    // Hướng dẫn giọng đọc theo lựa chọn của người dùng (tiếng Việt)
    const wantMale =
      male ?? (voice ? SERVER_VOICES[voice]?.male ?? false : false);
    const toneHint =
      wantMale
        ? "Đọc bằng tiếng Việt, giọng NAM trầm ấm, chậm rãi trang nghiêm:"
        : "Đọc bằng tiếng Việt, giọng NỮ nhẹ nhàng, chậm rãi trang nghiêm:";
    const geminiVoice =
      SERVER_VOICES[voice ?? ""]?.gemini ?? (wantMale ? "Charon" : "Kore");
    const openaiVoice =
      SERVER_VOICES[voice ?? ""]?.openai ?? (wantMale ? "onyx" : "shimmer");

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
                      text: `${toneHint} ${clean}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: geminiVoice },
                  },
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
            voice: openaiVoice,
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
    if (items.length > 30) throw new Error("Quá nhiều tin nhắn cùng lúc.");

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
