import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — KHÔNG phải một trợ lý ảo lạnh lẽo, mà là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp của mỗi người, do nhà phát triển Hứa Tiến Dương xây dựng.

## CHUYÊN MÔN PHẬT PHÁP (ưu tiên cao nhất)
- Nền tảng vững theo truyền thống Theravāda: Kinh tạng Pāli (Nikāya), Tứ Diệu Đế, Bát Chánh Đạo, Thánh Đạo 8 chi, Vô Thường - Khổ - Vô Ngã, Thiền (samatha - vipassanā), Abhidhamma, Luật tạng, Dhammapada, vệ ngũ niệm xứ, tứ chánh tấn, pháp hộ trì (năm tổn pháp)...
- Mở rộng cho TẤT CẢ những gì liên quan đến Phật pháp: các truyền thống khác (Mahāyāna, Thiền tông, Tịnh Độ, Mật tông...), lịch sử Phật giáo, nhân vật và danh lam tự viện, văn hóa - nghệ thuật, lễ hội, ứng dụng vào đời sống (gia đình, công việc, an lạc hằng ngày), thực hành (cúng dường, thọ giới, hồi hướng, lễ Phật, hồi hướng công đức, dạy con theo Phật pháp...).
- Khi trả lời có nguồn thì nêu rõ (SN 56.11, MN 118, Dhammapada 183...); KHÔNG BỊA tên kinh, không bịa số hiệu; không chắc nguồn thì nói "theo Kinh tạng Pāli".
- Giải thích thuật ngữ Pāli ngay sau khi dùng (dukkha = khổ/bất toại nguyện...); dùng ví dụ đời thường gần gũi người Việt.
- Khi so sánh truyền thống: công bằng, tôn trọng, không phán xét, khẳng định giá trị chung.

## NGƯỜI BẠN TRI KỶ (linh hồn của cách trò chuyện)
- TRÒ CHUYỆN, không giảng đạo: ví như bạn thân ngồi cạnh, quan tâm chuyện đời trước chuyện pháp khi cần.
- NHỚ và TỰ NHIÊN nhắc lại điều người dùng đã kể (công việc căng thẳng, người thân ốm, buổi thiền đầu tiên...) ở lượt sau — như một người bạn thật sự quan tâm rồi hỏi thăm tiếp ("Hôm nay chuyện công việc của bạn thế nào rồi?").
- QUAN TÂM CHỦ ĐỘNG khi thấy tín hiệu: người dùng kể chuyện buồn → hỏi thăm tình hình sau đó; có tin vui → mừng cùng một cách chân thành; lâu không hỏi → hỏi thăm sức khỏe, giấc ngủ, bữa ăn khi phù hợp.
- ĐỌC TÂM TRẠNG trước khi trả lời: đang tò mò, đang khổ, đang hoang mang hay cần động lực? Mở đầu bằng sự đồng cảm ĐÚNG tâm trạng đó ("Nghe bạn kể, mình thấy...") TRƯỚC khi vào giáo lý.
- Người đang đau khổ → an ủi và đồng hành trước, giáo lý sau, ngắn gọn; tuyệt đối không giảng đạo cho người đang khủng hoảng — chỉ ở bên lắng nghe như bạn thân.
- Kết thúc khi phù hợp bằng một câu hỏi nhẹ nhàng thể hiện sự quan tâm thật, hoặc một gợi ý thực hành nhỏ (2-3 phút) để người dùng có chỗ dựa ngay.
- Người lớn tuổi / hỏi đơn giản → trả lời ngắn, ấm áp, tránh thuật ngữ; muốn sâu hơn họ sẽ hỏi tiếp.
- Chia sẻ của người dùng là điều quý — không bao giờ phán xét, không khuyên đại kiểu sáo rỗng; xin lỗi và điều chỉnh khi mình hiểu sai.

## PHONG CÁCH
- Như người bạn tri kỷ ấm áp: xưng "mình – bạn" (hoặc "tôi – anh/chị" khi người dùng xưng hô trang trọng).
- KHÔNG dùng biểu tượng cảm xúc (emoji) trong câu trả lời — chỉ dùng chữ thuần, trang nghiêm và ấm áp bằng lời văn.
- Câu hỏi ngắn → trả lời ngắn gọn ấm áp; câu hỏi sâu → có cấu trúc rõ ràng (gạch đầu dòng, đánh số) nhưng không máy móc.
- Trung thực: không biết thì nói không biết; không hành xử như bậc đạo hạnh thực thụ (không ban giới, không "chứng đắc" hộ ai, không thay thế thầy giảng); câu hỏi thực hành sâu thì khuyến nghị tìm người hướng dẫn có kinh nghiệm.
- Không chẩn đoán y khoa/tâm lý; người dùng đang khủng hoảng thì đồng cảm trước, khuyên tìm hỗ trợ chuyên môn và thầy hướng dẫn thiền; trường hợp nguy hiểm tính mạng → khuyến khích liên hệ người thân hoặc đường dây nóng hỗ trợ tâm lý gần nhất ngay.
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

/* ------------------------------------------------------------------ */
/* TỰ KHẮC PHỤC — circuit breaker theo provider/model                   */
/* Provider lỗi liên tục bị đánh dấu "chết tạm thời" (appMeta key       */
/* "ai-health") trong 10 phút; listProviders bỏ qua để người dùng không */
/* phải chờ timeout. Cron aiSelfTest (crons.ts, 10 phút/lần) thử lại:   */
/* hồi phục thì tự gỡ trạng thái — không cần ai can thiệp.              */
/* ------------------------------------------------------------------ */

const HEALTH_KEY = "ai-health";
const HEALTH_TTL_MS = 10 * 60_000;

type HealthEntry = {
  provider: string;
  model: string;
  label: string;
  deadUntil: number;
};
type HealthMap = Record<string, HealthEntry>;

function parseHealth(raw: string | undefined): HealthMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as HealthMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Ghi trạng thái chết tạm thời của một provider/model khi gặp lỗi. */
async function markProviderFailure(
  ctx: ActionCtx,
  provider: string,
  model: string,
  reason: string,
): Promise<void> {
  try {
    await ctx.runMutation(internal.aiChat.recordProviderFailure, {
      provider,
      model,
      reason: reason.slice(0, 200),
    });
  } catch {
    /* ghi trạng thái lỗi không được thì bỏ qua — không chặn luồng chính */
  }
}

/** Xóa trạng thái chết khi provider/model hoạt động trở lại (hồi phục). */
async function clearProviderFailure(
  ctx: ActionCtx,
  provider: string,
  model: string,
): Promise<void> {
  try {
    await ctx.runMutation(internal.aiChat.clearProviderFailure, {
      provider,
      model,
    });
  } catch {
    /* bỏ qua */
  }
}

/** internalMutation: hợp nhất trạng thái chết tạm thời vào appMeta. */
export const recordProviderFailure = internalMutation({
  args: {
    provider: v.string(),
    model: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, { provider, model, reason }) => {
    const row = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", HEALTH_KEY))
      .unique();
    const map = parseHealth(row?.releaseNotes);
    map[`${provider}/${model}`] = {
      provider,
      model,
      label: reason,
      deadUntil: Date.now() + HEALTH_TTL_MS,
    };
    const notes = JSON.stringify(map);
    if (row) {
      await ctx.db.patch(row._id, {
        latestVersion: "1",
        releaseNotes: notes,
        releasedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("appMeta", {
        key: HEALTH_KEY,
        latestVersion: "1",
        releaseNotes: notes,
        releasedAt: Date.now(),
      });
    }
  },
});

/** internalMutation: gỡ trạng thái chết của một provider/model. */
export const clearProviderFailure = internalMutation({
  args: { provider: v.string(), model: v.string() },
  handler: async (ctx, { provider, model }) => {
    const row = await ctx.db
      .query("appMeta")
      .withIndex("by_key", (q) => q.eq("key", HEALTH_KEY))
      .unique();
    if (!row?.releaseNotes) return;
    const map = parseHealth(row.releaseNotes);
    if (!map[`${provider}/${model}`]) return;
    delete map[`${provider}/${model}`];
    await ctx.db.patch(row._id, {
      releaseNotes: JSON.stringify(map),
      releasedAt: Date.now(),
    });
  },
});

const HISTORY_LIMIT = 4; // ngữ cảnh gọn → phản hồi nhanh hơn
const MAX_TOKENS = 4096; // cho phép câu trả lời dài hơn, tránh bị cắt giữa chừng
const AI_TIMEOUT_MS = 60_000; // cho phép Gemini đủ thời gian sinh câu trả lời dài

/* ------------------------------------------------------------------ */
/* BẢN ĐỒ GIỌNG TTS — đồng bộ với danh mục client (src/lib/aiVoices.ts). */
/* Client gửi voice id + male; máy chủ chọn giọng Gemini tương ứng.      */
/* ------------------------------------------------------------------ */

type ServerVoice = { gemini: string; male: boolean };

/**
 * Bản đồ giọng đọc — ĐÃ ĐỐI CHIẾN giới tính thật của từng voice Gemini:
 * • NỮ: Kore, Autonoe, Leda, Aoede · NAM: Charon, Enceladus, Algieba,
 *   Alnilam, Iapetus (lỗi cũ: karuna map "Puck" — giọng nam).
 * TTS chỉ dùng Gemini (key sống). Groq đã ngừng TTS (playai-tts bị
 * decommission), OpenAI key đã hết credit — đã loại bỏ các nhánh chết.
 */
const SERVER_VOICES: Record<string, ServerVoice> = {
  metta: { gemini: "Kore", male: false },
  karuna: { gemini: "Autonoe", male: false },
  panna: { gemini: "Leda", male: false },
  sati: { gemini: "Aoede", male: false },
  mettam: { gemini: "Enceladus", male: true },
  adosa: { gemini: "Algieba", male: true },
  upekkha: { gemini: "Alnilam", male: true },
  sila: { gemini: "Iapetus", male: true },
};

/* ------------------------------------------------------------------ */
/* Danh sách nhà cung cấp AI — ưu tiên tốc độ, fallback chỉ khi cần     */
/* ------------------------------------------------------------------ */

type ProviderChoice = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Chẩn đoán: nhà cung cấp nào đã cấu hình khóa (chỉ trả boolean, không lộ giá trị).
 * Dùng để xác minh nhanh "AI không hoạt động" là do thiếu khóa hay do provider.
 */
export const providerStatus = action({
  args: {},
  handler: async () => ({
    groq: !!process.env.GROQ_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  }),
});

/**
 * Danh sách provider khả dụng theo khóa cấu hình — GROQ LÀ CHÍNH (nhanh,
 * hạn mức rộng), Gemini là dự phòng. Model llama-3.3-70b ĐÃ BỊ Groq
 * decommission → dùng model mới đang hỗ trợ (đã test tiếng Việt tốt).
 */
function listAllProviders(needVision: boolean): ProviderChoice[] {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const out: ProviderChoice[] = [];

  if (groqKey) {
    out.push({
      label: "Groq",
      make: () =>
        createOpenAICompatible({
          name: "groq",
          baseURL: GROQ_BASE_URL,
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
          baseURL: GEMINI_BASE_URL,
          apiKey: geminiKey,
        }),
      model: "gemini-3.5-flash-lite",
    });
  }

  return out;
}

/**
 * Danh sách provider thực tế sẽ gọi: loại provider/model đang trong thời
 * gian "chết tạm thời" (circuit breaker) để người dùng không chờ timeout
 * vào một provider đang hỏng. Provider còn lại vẫn giữ làm đường chính.
 */
async function listProviders(
  ctx: ActionCtx,
  needVision: boolean,
): Promise<ProviderChoice[]> {
  let dead: HealthMap = {};
  try {
    const row = await ctx.runQuery(internal.library.getAppMetaInternal, {
      key: HEALTH_KEY,
    });
    const now = Date.now();
    for (const [k, e] of Object.entries(parseHealth(row?.releaseNotes))) {
      if (e && typeof e.deadUntil === "number" && e.deadUntil > now) {
        dead[k] = e;
      }
    }
  } catch {
    /* không đọc được trạng thái — coi như không có provider chết */
  }

  return listAllProviders(needVision).filter(
    (p) => !dead[`${p.label}/${p.model}`],
  );
}

/**
 * TỰ KIỂM TRA ĐỊNH KỲ (cron 10 phút/lần — crons.ts): kiểm tra khóa và
 * model của từng provider qua danh sách model chính thức (không tốn hạn
 * mức chat). Provider/model hồi phục được gỡ trạng thái chết ngay; hệ
 * thống tự chữa mà không cần ai can thiệp.
 */
export const aiSelfTest = action({
  args: {},
  handler: async (ctx) => {
    const notes: string[] = [];

    const groqKey = process.env.GROQ_API_KEY;
    const groqModel = "openai/gpt-oss-120b";
    if (groqKey) {
      let ok = false;
      let note = "sống";
      try {
        const res = await fetch(`${GROQ_BASE_URL}/models`, {
          headers: { Authorization: `Bearer ${groqKey}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { id?: string }[] };
          const ids = (json.data ?? []).map((m) => m.id ?? "");
          ok = ids.includes(groqModel);
          if (!ok) note = `model ${groqModel} không còn trong danh sách Groq`;
        } else {
          note = `HTTP ${res.status}`;
        }
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      if (ok) await clearProviderFailure(ctx, "Groq", groqModel);
      else await markProviderFailure(ctx, "Groq", groqModel, note);
      notes.push(`Groq: ${note}`);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = "gemini-3.5-flash-lite";
    if (geminiKey) {
      let ok = false;
      let note = "sống";
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models",
          { headers: { "x-goog-api-key": geminiKey } },
        );
        if (res.ok) {
          const json = (await res.json()) as { models?: { name?: string }[] };
          const names = (json.models ?? []).map((m) => m.name ?? "");
          ok = names.some(
            (n) => n === `models/${geminiModel}` || n.endsWith(`/${geminiModel}`),
          );
          if (!ok) note = `model ${geminiModel} không còn trong danh sách Gemini`;
        } else {
          note = `HTTP ${res.status}`;
        }
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      if (ok) await clearProviderFailure(ctx, "Gemini", geminiModel);
      else await markProviderFailure(ctx, "Gemini", geminiModel, note);
      notes.push(`Gemini: ${note}`);
    }

    return notes.length ? notes.join(" | ") : "Chưa cấu hình khóa AI nào.";
  },
});

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
    // Chặn bot / thiết bị bị can thiệp đốt hạn mức AI trước khi gọi provider.
    // Dùng ConvexError (không phải Error) — production mới truyền được thông
    // điệp tiếng Việt tới client thay vì chuỗi "Server Error" trống.
    const denied = await checkRateLimit(ctx, "ask", deviceId, integrity);
    if (denied) throw new ConvexError(denied);

    const userId = await getAuthUserId(ctx);
    void userId;

    if (messages.length === 0 && !imageBase64) {
      throw new ConvexError("Câu hỏi trống.");
    }

    // Chống tấn công: giới hạn kích thước đầu vào — bot gửi payload khổng lồ
    // sẽ bị từ chối ngay trước khi chạm provider AI.
    if (messages.length > 60) {
      throw new ConvexError("Hội thoại quá dài. Hãy xóa hội thoại và bắt đầu lại.");
    }
    for (const m of messages) {
      if (typeof m.content !== "string" || m.content.length > 8000) {
        throw new ConvexError("Tin nhắn vượt quá độ dài cho phép.");
      }
    }
    if (imageBase64 && imageBase64.length > 9_000_000) {
      throw new ConvexError("Ảnh quá lớn (tối đa khoảng 6MB).");
    }

    const providers = await listProviders(ctx, Boolean(imageBase64));
    if (providers.length === 0) {
      throw new ConvexError(
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
        if (reply) {
          // Thành công — provider vừa hồi phục thì gỡ trạng thái chết tạm thời.
          await clearProviderFailure(ctx, provider.label, provider.model);
          return reply;
        }
        // Giải thích rõ vì sao rỗng thay vì chỉ "trả lời rỗng"
        const finish = (result as { finishReason?: unknown }).finishReason;
        const emptyNote = `trả lời rỗng${
          finish ? ` (finishReason=${String(finish)})` : ""
        }`;
        errors.push(`${provider.label}: ${emptyNote}`);
        await markProviderFailure(ctx, provider.label, provider.model, emptyNote);
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err);
        errors.push(`${provider.label}: ${msg}`);
        await markProviderFailure(
          ctx,
          provider.label,
          provider.model,
          msg.split("\n")[0] ?? msg,
        );
      }
    }
    throw new ConvexError(
      `Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút.` +
        (imageBase64
          ? " (Gửi ảnh cần máy chủ AI hỗ trợ thị giác — có thể thử lại bằng câu hỏi chữ.)"
          : ""),
    );
  },
});

/**
 * TTS tiếng Việt chất lượng cao — server tổng hợp âm thanh rồi trả về base64.
 * Chỉ dùng Gemini TTS (Groq đã ngừng TTS, OpenAI key hết credit — đã bỏ).
 * Trả về null khi không có khóa → client dùng Web Speech dự phòng.
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
    // Giới hạn tốc độ cả TTS — chặn bot quay vùng đọc text miễn phí
    const denied = await checkRateLimit(ctx, "speak", deviceId, integrity);
    if (denied) throw new ConvexError(denied);
    const clean = text.trim().slice(0, 2400);
    if (!clean) return null;
    // Hướng dẫn giọng đọc theo lựa chọn của người dùng (tiếng Việt)
    const wantMale =
      male ?? (voice ? SERVER_VOICES[voice]?.male ?? false : false);
    const toneHint =
      wantMale
        ? "Đọc bằng tiếng Việt, giọng NAM trầm ấm, chậm rãi trang nghiêm:"
        : "Đọc bằng tiếng Việt, giọng NỮ nhẹ nhàng, chậm rãi trang nghiêm:";
    const v = SERVER_VOICES[voice ?? ""];
    const geminiVoice = v?.gemini ?? (wantMale ? "Charon" : "Kore");

    const geminiKey = process.env.GEMINI_API_KEY;

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

    // Groq đã ngừng dịch vụ TTS (playai-tts decommissioned) và OpenAI key
    // đã hết credit — TTS duy nhất là Gemini. Thất bại → client dùng Web Speech.
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
    if (items.length > 30) throw new ConvexError("Quá nhiều tin nhắn cùng lúc.");

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
