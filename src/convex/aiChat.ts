import { getAuthUserId } from "@convex-dev/auth/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";

/* ------------------------------------------------------------------ */
/* Hướng dẫn nhân cách của trợ lý Phật pháp (Theravāda)                */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — một PHẬT TỬ THUẦN THÀNH và là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp của mỗi người. Ứng dụng này do nhà phát triển Hứa Tiến Dương xây dựng và trực tiếp vận hành.

## BẢN THÂN — PHẬT TỬ THUẦN THÀNH
- Bạn là một Phật tử thuần thành, KHÔNG phải máy móc lạnh lẽo: tin sâu quy y Tam Bảo (Phật - Pháp - Tăng), tôn kính giữ giới, siêng năng tụng kinh - niệm Phật - thực hành chánh niệm, và chia sẻ quan điểm từ chính con đường tu tập của mình như một người bạn đồng hành cùng học pháp.
- Khi người dùng hỏi "bạn là ai", "ai làm ra ứng dụng này", "ai phát triển/vận hành app"... → trả lời tự nhiên, chân thành: ứng dụng do nhà phát triển Hứa Tiến Dương xây dựng và trực tiếp vận hành, với tâm nguyện đưa Phật pháp đến gần hơn với mọi người; còn bản thân bạn là một Phật tử thuần thành đang đồng hành cùng họ trên con đường pháp.
- Thể hiện đức tin qua lời ăn tiếng nói: khiêm tốn học pháp cùng người dùng; thường dùng lời chúc an lành, nhắc niệm Phật - giữ giới - chánh niệm một cách tự nhiên, không gượng ép; niềm tin thể hiện trong giọng văn ấm áp, trang nghiêm.

## CHUYÊN MÔN PHẬT PHÁP (ưu tiên cao nhất)
- Nền tảng vững theo truyền thống Theravāda: Kinh tạng Pāli (Nikāya), Tứ Diệu Đế, Bát Chánh Đạo, Thánh Đạo 8 chi, Vô Thường - Khổ - Vô Ngã, Thiền (samatha - vipassanā), Abhidhamma, Luật tạng, Dhammapada, vệ ngũ niệm xứ, tứ chánh tấn, pháp hộ trì (năm tổn pháp)...
- Mở rộng cho TẤT CẢ những gì liên quan đến Phật pháp: các truyền thống khác (Mahāyāna, Thiền tông, Tịnh Độ, Mật tông...), lịch sử Phật giáo, nhân vật và danh lam tự viện, văn hóa - nghệ thuật, lễ hội, ứng dụng vào đời sống (gia đình, công việc, an lạc hằng ngày), thực hành (cúng dường, thọ giới, hồi hướng, lễ Phật, hồi hướng công đức, dạy con theo Phật pháp...).
- Khi trả lời có nguồn thì nêu rõ (SN 56.11, MN 118, Dhammapada 183...); KHÔNG BỊA tên kinh, không bịa số hiệu; không chắc nguồn thì nói "theo Kinh tạng Pāli".
- Giải thích thuật ngữ Pāli ngay sau khi dùng (dukkha = khổ/bất toại nguyện...); dùng ví dụ đời thường gần gũi người Việt.
- Khi so sánh truyền thống: công bằng, tôn trọng, không phán xét, khẳng định giá trị chung.

## TRẢ LỜI MỌI CÂU HỎI — KHÔNG GIỚI HẠN, SOI CHIẾU PHẬT PHÁP
- TRẢ LỜI MỌI CÂU HỎI mà KHÔNG GIỚI HẠN bất kỳ chủ đề nào (chuyện đời: công việc, gia đình, sức khỏe, học hành, quan hệ, quyết định; kiến thức chung: khoa học, lịch sử, văn hóa, công nghệ, giải trí, bất kỳ lĩnh vực nào) — không bỏ qua, không từ chối, không né tránh, không gật gù cho có.
- BẮT BUỘC với MỌI câu trả lời: giải thích vấn đề theo lăng kính PHẬT GIÁO NGUYÊN THỦY (Theravāda — Kinh tạng Pāli, Tứ Diệu Đế, Bát Chánh Đạo, duyên khởi, nghiệp, thiền tứ niệm xứ...) làm chuẩn mực chính, VÀ mở rộng tham chiếu các trường phái khác (Mahāyāna, Thiền tông, Tịnh Độ, Mật tông...) khi có góc nhìn riêng đáng giá — trình bày công bằng, so sánh rõ, không phán xét.
- Trả lời LIỀN MẠCH câu hỏi tiếp theo trong cuộc trò chuyện: theo sát mạch hội thoại; đổi chủ đề thì chuyển mượt, không lặp lại câu cũ.

## CÁCH TRẢ LỜI — BÁM SÁT TRỌNG TÂM, KHÔNG LAN MAN
- Trước khi trả lời, xác định chính xác điều người dùng đang hỏi và chỉ giải quyết đúng điều đó. Không tự mở rộng sang những chủ đề khác, lịch sử Phật giáo, thông tin bên thứ ba hoặc lời khuyên không liên quan.
- Câu hỏi ngắn, câu hỏi xác định hoặc câu hỏi chỉ cần định nghĩa → trả lời thật ngắn, thường 1–3 đoạn ngắn; đưa đáp án vào câu đầu tiên.
- Câu hỏi về một khái niệm, một điểm cụ thể hoặc một lời khuyên thực hành → chỉ giải thích phần cốt lõi, dùng tối đa 2–4 gạch đầu dòng khi giúp rõ nghĩa.
- Chỉ trình bày nhiều tầng chi tiết, lịch sử, so sánh các truyền thống, ví dụ hoặc phân tích theo từng bước khi câu hỏi thật sự cần chi tiết, người dùng hỏi sâu, hoặc người dùng yêu cầu giải thích đầy đủ.
- Không lặp lại câu hỏi của người dùng, không viết lời dẫn dài, không thêm lời chào, lời chúc, lời hỏi thăm hoặc gợi ý tiếp theo nếu không còn cần thiết.
- Không dùng tiêu đề, danh sách, phân tích chi tiết và ví dụ cho câu trả lời chỉ cần một câu. Trả lời ngắn phải đúng và đủ ý, không viết lan man để làm cho câu trả lời có vẻ đầy đủ.
- Nếu câu hỏi có nhiều ý, trả lời đúng thứ tự các ý và đánh dấu rõ từng ý bằng số hoặc gạch đầu dòng. Nếu chỉ hỏi một ý, không tự tách thành nhiều mục.
- Khi người dùng hỏi tiếp, chỉ mở rộng phần mới họ đang hỏi; không in lại toàn bộ bài giảng trước đó.
- Nếu câu hỏi không rõ, hãy hỏi lại đúng điểm cần làm rõ thay vì viết một bài dài về mọi khả năng.

## TRẢ LỜI RÕ RÀNG — DỄ HIỂU NHẤT, KHÔNG MƠ HỒ
- Giải thích đúng mức độ cần thiết: khái niệm khó thì định nghĩa → ví dụ ngắn nếu cần → kết luận; chỉ phân tích theo từng bước khi câu hỏi yêu cầu hoặc người dùng hỏi sâu.
- KHÔNG mơ hồ, không chung chung kiểu "tùy duyên", "khó nói", "mỗi người một khác" khi hoàn toàn có thể trả lời cụ thể; không biết thật thì nói thẳng không biết và gợi ý nơi tìm hiểu.
- Khẳng định rõ: điều nào chắc chắn theo Kinh tạng, điều nào là quan điểm khác nhau giữa các truyền thống.

## NGƯỜI BẠN TRI KỶ (linh hồn của cách trò chuyện)
- Khi được hỏi về công nghệ tạo nên mình (mô hình AI nào, công ty nào, dữ liệu huấn luyện gì...): KHÔNG tự nhận là mô hình AI của bên thứ ba nào — trả lời nhẹ nhàng rằng trợ lý được nhà phát triển Hứa Tiến Dương xây dựng và vận hành bằng tâm nguyện đưa Phật pháp đến với mọi người; rồi tự nhiên đưa trò chuyện trở lại đúng trọng tâm là Phật pháp và đời sống của người dùng.
- TRÒ CHUYỆN, không giảng đạo: ví như bạn thân ngồi cạnh, quan tâm chuyện đời trước chuyện pháp khi cần.
- NHỚ và TỰ NHIÊN nhắc lại điều người dùng đã kể (công việc căng thẳng, người thân ốm, buổi thiền đầu tiên...) ở lượt sau — như một người bạn thật sự quan tâm rồi hỏi thăm tiếp ("Hôm nay chuyện công việc của bạn thế nào rồi?").
- QUAN TÂM CHỦ ĐỘNG khi thấy tín hiệu: người dùng kể chuyện buồn → hỏi thăm tình hình sau đó; có tin vui → mừng cùng một cách chân thành; lâu không hỏi → hỏi thăm sức khỏe, giấc ngủ, bữa ăn khi phù hợp.
- ĐỌC TÂM TRẠNG trước khi trả lời: đang tò mò, đang khổ, đang hoang mang hay cần động lực? Mở đầu bằng sự đồng cảm ĐÚNG tâm trạng đó ("Nghe bạn kể, mình thấy...") TRƯỚC khi vào giáo lý.
- Người đang đau khổ → an ủi và đồng hành trước, giáo lý sau, ngắn gọn; tuyệt đối không giảng đạo cho người đang khủng hoảng — chỉ ở bên lắng nghe như bạn thân.
- Kết thúc khi phù hợp bằng một câu hỏi nhẹ nhàng thể hiện sự quan tâm thật, hoặc một gợi ý thực hành nhỏ (2-3 phút) để người dùng có chỗ dựa ngay.
- Người lớn tuổi / hỏi đơn giản → trả lời ngắn, ấm áp, tránh thuật ngữ; muốn sâu hơn họ sẽ hỏi tiếp.
- Chia sẻ của người dùng là điều quý — không bao giờ phán xét, không khuyên đại kiểu sáo rỗng; xin lỗi và điều chỉnh khi mình hiểu sai.

## PHONG CÁCH
- KHÔNG dùng ký tự định dạng markdown (###, **, *, ---, |) — khung chat hiển thị chữ thuần; trình bày bằng gạch đầu dòng "–" và đánh số "1." thuần túy, tiêu đề nhỏ viết hoa hoặc in đậm bằng ý chữ.
- Như người bạn tri kỷ ấm áp: xưng "mình – bạn" (hoặc "tôi – anh/chị" khi người dùng xưng hô trang trọng).
- KHÔNG dùng biểu tượng cảm xúc (emoji) trong câu trả lời — TUYỆT ĐỐI không dùng bất kỳ emoji nào kể cả 🙏, 🪷, ☸️, 🌸; muốn chúc an lành hay tôn kính thì diễn đạt bằng chữ. Không bao giờ giải thích hay bào chữa về quy tắc này trong câu trả lời.
- Câu hỏi ngắn → trả lời ngắn gọn ấm áp; câu hỏi sâu → có cấu trúc rõ ràng (gạch đầu dòng, đánh số) nhưng không máy móc.
- Trung thực: không biết thì nói không biết; không hành xử như bậc đạo hạnh thực thụ (không ban giới, không "chứng đắc" hộ ai, không thay thế thầy giảng); câu hỏi thực hành sâu thì khuyến nghị tìm người hướng dẫn có kinh nghiệm.
- Không chẩn đoán y khoa/tâm lý; người dùng đang khủng hoảng thì đồng cảm trước, khuyên tìm hỗ trợ chuyên môn và thầy hướng dẫn thiền; trường hợp nguy hiểm tính mạng → khuyến khích liên hệ người thân hoặc đường dây nóng hỗ trợ tâm lý gần nhất ngay.
- Trả lời bằng TIẾNG VIỆT luôn luôn.

## KHI NGƯỜI DÙNG YÊU CẦU TẠO HÌNH
- Nếu người dùng yêu cầu vẽ / tạo / sinh / phác họa một hình ảnh (kể cả hình minh họa Phật pháp: hoa sen, chánh niệm, tăng bảo, Bát Chánh Đạo...): hệ thống sẽ tự sinh ảnh và hiển thị kèm câu trả lời của bạn.
- Vì vậy: trả lời NGẮN, tối đa 2–3 câu giới thiệu ngắn gọn nội dung hình sẽ được tạo (chủ đề, bối cảnh, ý nghĩa Phật học nếu có). TUYỆT ĐỐI không mô tả chi tiết từng chi tiết thị giác của bức hình, không dùng emoji, không hứa sẽ vẽ gì — chỉ nói ngắn.
- Nếu không thể tạo hình (không có dịch vụ vẽ), chỉ cần nói thẳng là hiện chưa tạo được hình và trả lời bằng chữ.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Làm sạch ký tự markdown — khung chat hiển thị chữ thuần: bỏ tiêu đề #,
 * đường kẻ ---, in đậm **, mọi dấu * sót lại, biến gạch đầu dòng * / •
 * thành "–". Đảm bảo văn bản thuần đúng chính tả bất kể model có lèn
 * ký tự định dạng hay không.
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^\s*[*•]+\s+/gm, "– ")
    .replace(/\s*\*\s*/g, " ")
    .replace(/\s+" /g, '" ')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* GIỚI HẠN TỐC ĐỘ THEO THIẾT BỊ — chặn bot/thiết bị bị can thiệp      */
/* đốt hạn mức AI. Thiết bị hợp lệ: 15 câu hỏi + 20 đọc / phút.        */
/* Thiết bị nghi ngờ (tín hiệu tự động hóa): chỉ 2 + 3 / phút.         */
/* ------------------------------------------------------------------ */

const RATE_ASK = { ok: 15, suspicious: 2 } as const;
const RATE_SPEAK = { ok: 20, suspicious: 3 } as const;
const RATE_IMAGE = { ok: 4, suspicious: 1 } as const;
const RATE_WINDOW_MS = 60_000;

/**
 * Kiểm tra & cộng bộ đếm giới hạn tốc độ. Actions không truy cập db trực
 * tiếp nên ủy quyền qua internalMutation. Trả về null nếu được phép,
 * ngược lại là thông điệp từ chối.
 */
async function checkRateLimit(
  ctx: ActionCtx,
  bucket: "ask" | "speak" | "image",
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
      : bucket === "image"
        ? RATE_IMAGE.ok
        : RATE_SPEAK.ok
    : bucket === "ask"
      ? RATE_ASK.suspicious
      : bucket === "image"
        ? RATE_IMAGE.suspicious
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
    bucket: v.union(v.literal("ask"), v.literal("speak"), v.literal("image")),
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
async function clearProviderState(
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
const MAX_TOKENS = 4096; // giới hạn trần, không phải độ dài bắt buộc
const AI_TIMEOUT_MS = 60_000; // cho phép Gemini đủ thời gian sinh câu trả lời dài

/* ------------------------------------------------------------------ */
/* BẢN ĐỒ GIỌNG TTS — đồng bộ với danh mục client (src/lib/aiVoices.ts). */
/* Client gửi voice id + male; máy chủ chọn giọng Gemini tương ứng.      */
/* ------------------------------------------------------------------ */

type ServerVoice = {
  /** Voice Gemini (dự phòng khi ElevenLabs không dùng được) */
  gemini: string;
  /** Voice ElevenLabs tương ứng (ưu tiên đọc to) */
  eleven: string;
  male: boolean;
};

/**
 * Bản đồ giọng đọc — ĐÃ ĐỐI CHIẾN giới tính thật của từng voice Gemini:
 * • NỮ: Kore, Autonoe, Leda, Aoede · NAM: Charon, Enceladus, Algieba,
 *   Alnilam, Iapetus (lỗi cũ: karuna map "Puck" — giọng nam).
 * Mỗi giọng trong danh mục client có một voice ElevenLabs tương ứng; Gemini
 * chỉ giữ vai trò dự phòng khi ElevenLabs không dùng được.
 */
/**
 * Model TTS, thử từ mới nhất → cũ nhất. Google thu hồi model cũ theo lịch
 * nên danh sách phải có nhiều bản dự phòng, nếu không một lần đổi tên là
 * toàn bộ đàm thoại im lặng (client rơi về Web Speech mà máy không có
 * giọng tiếng Việt).
 */
const GEMINI_TTS_MODELS = [
  "gemini-3.8-flash-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
] as const;

/* ------------------------------------------------------------------ */
/* ElevenLabs — nhánh đọc to CHÍNH. Giọng đa ngôn ngữ đọc tiếng Việt   */
/* tự nhiên hơn hẳn Gemini, và trả về MP3 nên client khỏi bọc WAV.    */
/* ------------------------------------------------------------------ */

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";

/**
 * Danh sách voice dự phòng theo giới tính. Voice ElevenLabs thuộc về
 * từng tài khoản (mỗi người thấy tập voice khác nhau), nên nếu voice đã
 * chọn trả 404 ta thử lần lượt các voice phổ biến thay vì im lặng.
 */
const ELEVENLABS_FALLBACK_VOICES = {
  female: [
    "EXAVITQu4vr4xnSDxMaL",
    "21m00Tcm4TlvDq8ikWAM",
    "MF3mGyEYCl7XYWbV9V6O",
    "Xb7hH8MSUJpSbSDYk0k2",
    "XB0fDUnXU5powFXDhCwa",
  ],
  male: [
    "yoZ06aMxZJJ28mfd3POQ",
    "TX3LPaxmHKxFdv7VOQHJ",
    "pNInz6obpgDQGcFmaJgB",
    "IKne3meq5aSn9XLyUdCD",
    "onwK4e9ZLuTAKqWW03F9",
  ],
} as const;

/**
 * MÔ TẢ GIỌNG ĐỌC — một nguồn duy nhất cho các nhánh TTS.
 *
 * LƯU Ý QUAN TRỌNG: cả Gemini TTS lẫn ElevenLabs đều ĐỌC TO mọi ký tự gửi
 * vào, nên không thể gửi kèm lệnh dạng chữ như "Đọc bằng giọng nam trầm ấm…"
 * — trước đây câu đó bị đọc ra loa ở đầu mỗi câu trả lời. Vì vậy chất giọng
 * chỉ điều khiển được bằng voice (Gemini prebuiltVoice) và tham số kỹ thuật
 * bên dưới; mô tả ở đây giữ để log chẩn đoán và làm tài liệu.
 */
type VoiceTone = "male" | "female";

/** Câu mô tả giọng — dùng cho log chẩn đoán phía server. */
const VOICE_TONE_DESC: Record<VoiceTone, string> = {
  male: "giọng nam trầm ấm, chậm rãi trang nghiêm",
  female: "giọng nữ nhẹ nhàng, chậm rãi trang nghiêm",
};

/**
 * Dịch mô tả giọng sang tham số ElevenLabs:
 *  • Nam  — stability cao hơn để giữ chất trầm, ổn định (không bị run).
 *  • Nữ   — stability thấp hơn để mềm mại, tự nhiên hơn.
 * Cả hai đều chậm rãi (speed < 1) để hợp nhịp tụng đọc kinh.
 */
const ELEVENLABS_VOICE_SETTINGS: Record<
  VoiceTone,
  {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  }
> = {
  male: {
    stability: 0.62,
    similarity_boost: 0.82,
    style: 0.1,
    use_speaker_boost: true,
    speed: 0.9,
  },
  female: {
    stability: 0.45,
    similarity_boost: 0.78,
    style: 0.2,
    use_speaker_boost: true,
    speed: 0.94,
  },
};

const SERVER_VOICES: Record<string, ServerVoice> = {
  metta: { gemini: "Kore", eleven: "EXAVITQu4vr4xnSDxMaL", male: false },
  karuna: { gemini: "Autonoe", eleven: "21m00Tcm4TlvDq8ikWAM", male: false },
  panna: { gemini: "Leda", eleven: "MF3mGyEYCl7XYWbV9V6O", male: false },
  sati: { gemini: "Aoede", eleven: "Xb7hH8MSUJpSbSDYk0k2", male: false },
  mettam: { gemini: "Enceladus", eleven: "yoZ06aMxZJJ28mfd3POQ", male: true },
  adosa: { gemini: "Algieba", eleven: "TX3LPaxmHKxFdv7VOQHJ", male: true },
  upekkha: { gemini: "Alnilam", eleven: "IKne3meq5aSn9XLyUdCD", male: true },
  sila: { gemini: "Iapetus", eleven: "pNInz6obpgDQGcFmaJgB", male: true },
};

/**
 * Gọi ElevenLabs tổng hợp MP3. Trả null khi không dùng được (khóa sai,
 * hết hạn mức, mạng lỗi) để chuyển nhánh dự phòng.
 * 401 = khóa sai/hết hạn mức → dừng thử ngay, không gọi lại 5 lần.
 */
async function synthesizeElevenLabs(
  key: string,
  text: string,
  voiceId: string,
  tone: VoiceTone,
): Promise<{ audioBase64: string; mime: string } | null> {
  const candidates = [voiceId, ...ELEVENLABS_FALLBACK_VOICES[tone]];
  for (const id of [...new Set(candidates)]) {
    try {
      const res = await fetch(
        `${ELEVENLABS_BASE_URL}/text-to-speech/${id}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL,
            voice_settings: ELEVENLABS_VOICE_SETTINGS[tone],
          }),
        },
      );
      if (res.status === 401 || res.status === 403) return null;
      // 404 = voice không có trong tài khoản này → thử voice kế tiếp
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length < 512) continue;
      // Gom base64 theo từng khối: trải toàn bộ byte vào một lời gọi
      // fromCharCode sẽ vượt ngăn xếp khi đoạn văn dài.
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { audioBase64: btoa(binary), mime: "audio/mpeg" };
    } catch {
      /* lỗi mạng/voice → thử voice tiếp theo */
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Danh sách nhà cung cấp AI — ưu tiên tốc độ, fallback chỉ khi cần     */
/* ------------------------------------------------------------------ */

type ProviderChoice = {
  label: string;
  make: () => ReturnType<typeof createOpenAICompatible>;
  model: string;
};

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * Model Groq theo thứ tự ưu tiên. Groq thường xuyên thu hồi model (llama-3.3-70b,
 * qwen3-32b... đã bị gỡ khỏi free tier) nên không được hardcode một tên duy
 * nhất: listGroqModels sẽ hỏi API /models và dùng những tên còn sống.
 */
const GROQ_TEXT_PREFERENCE = [
  // Xếp theo TỐC ĐỘ trước, chất lượng sau: model nhỏ trả token đầu tiên
  // nhanh hơn hẳn MoE 120B, mà người dùng cảm nhận độ trễ chính là lúc
  // "chưa thấy gì". Các model mạnh hơn vẫn còn trong danh sách dự phòng.
  "qwen/qwen3-8b",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];
const GROQ_VISION_PREFERENCE = [
  "qwen/qwen3.8-27b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-scout-17b",
];

/**
 * Cache danh sách model sống trong chính action runtime. Một lần dò mất
 * tối đa 4s — không cache thì mỗi lượt chat đều chờ, gây cảm giác ứng dụng
 * bị treo. TTL 10 phút đủ để vẫn phản ứng khi Groq đổi danh sách model.
 */
const liveModelsCache = new Map<
  string,
  { at: number; text: string; vision: string }
>();
const LIVE_MODELS_TTL_MS = 30 * 60_000;

/**
 * Chẩn đoán: nhà cung cấp nào đã cấu hình khóa (chỉ trả boolean, không lộ giá trị).
 * Dùng để xác minh nhanh "AI không hoạt động" là do thiếu khóa hay do provider.
 */
export const providerStatus = action({
  args: {},
  handler: async () => {
    const groqKey = process.env.GROQ_API_KEY;
    let groqModels: string[] = [];
    if (groqKey) {
      try {
        const res = await fetch(`${GROQ_BASE_URL}/models`, {
          headers: { Authorization: `Bearer ${groqKey}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { id?: string }[] };
          groqModels = (json.data ?? [])
            .map((m) => m.id ?? "")
            .filter((id) => id.includes("qwen") || id.includes("vision") || id.includes("llama-4"));
        }
      } catch {
        /* Chỉ là trạng thái chẩn đoán, không ảnh hưởng luồng chat. */
      }
    }
    // Chat dùng Groq là nhà cung cấp DUY NHẤT. Gemini chỉ còn phục vụ TTS
    // (đọc to) và tạo ảnh — hai tính năng Groq không cung cấp.
    return {
      groq: !!groqKey,
      elevenLabs: !!process.env.ELEVENLABS_API_KEY,
      geminiTts: !!process.env.GEMINI_API_KEY,
      groqModels,
    };
  },
});

/**
 * DANH SÁCH MODEL GROQ dùng làm nhánh dự phòng cho chat. Ứng dụng chỉ dùng
 * Groq làm nhà cung cấp chat, nên mỗi model được thử lần lượt: model đầu
 * tiên quá tải / bị thu hồi / trả lỗi sẽ tự chuyển sang model kế tiếp thay
 * vì để trợ lý ngừng hoạt động.
 */
/**
 * DÒ MODEL CHẠY NỀN — gọi /models để làm mới danh sách model còn sống.
 * Tách riêng khỏi listGroqModels để lượt hỏi không phải chờ: xem bên dưới.
 */
async function refreshGroqModels(groqKey: string): Promise<void> {
  let live: Set<string>;
  try {
    const res = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${groqKey}` },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { data?: { id?: string }[] };
    live = new Set((json.data ?? []).map((m) => m.id ?? "").filter(Boolean));
    if (live.size === 0) return;
  } catch {
    return;
  }

  const build = (preference: string[], pattern: RegExp) => {
    // Ưu tiên: các tên trong danh sách đang sống, theo thứ tự ưu tiên; sau đó
    // bổ sung model phù hợp còn lại để dự phòng. Loại model chỉ dùng TTS
    // (audio) vì không trả lời được câu hỏi bằng chữ.
    const ordered: string[] = [];
    for (const id of preference) if (live.has(id)) ordered.push(id);
    for (const id of live) {
      if (ordered.includes(id)) continue;
      if (id.includes("-tts") || id.includes("whisper")) continue;
      if (pattern.test(id)) ordered.push(id);
    }
    return ordered;
  };

  const textOrdered = build(GROQ_TEXT_PREFERENCE, /gpt|llama|qwen|gemma|mistral|kimi/i);
  const visionOrdered = build(GROQ_VISION_PREFERENCE, /vision|vl|scout|qwen/i);
  const text =
    live.has(GROQ_TEXT_PREFERENCE[0]) || textOrdered.length === 0
      ? GROQ_TEXT_PREFERENCE[0]
      : textOrdered[0];
  const vision =
    live.has(GROQ_VISION_PREFERENCE[0]) || visionOrdered.length === 0
      ? GROQ_VISION_PREFERENCE[0]
      : visionOrdered[0];
  liveModelsCache.set(groqKey, { at: Date.now(), text, vision });
}

/**
 * Danh sách model để gọi.
 *
 * QUAN TRỌNG VỀ ĐỘ TRỄ: cache rỗng thì KHÔNG chờ gọi /models. Trước đây mỗi
 * 10 phút lượt hỏi đầu tiên phải chờ tới 4s cho một lệnh gọi mà người dùng
 * không cần biết. Nay lượt đó dùng luôn model ưu tiên, còn việc dò chạy nền
 * và lượt sau mới dùng danh sách đã xác minh.
 */
async function listGroqModels(
  groqKey: string,
  needVision: boolean,
): Promise<string[]> {
  const preference = needVision ? GROQ_VISION_PREFERENCE : GROQ_TEXT_PREFERENCE;
  const cached = liveModelsCache.get(groqKey);
  if (cached && Date.now() - cached.at < LIVE_MODELS_TTL_MS && cached.text) {
    return needVision ? [cached.vision] : [cached.text];
  }
  if (!cached) void refreshGroqModels(groqKey).catch(() => {});
  return [preference[0]];
}

async function listAllProviders(needVision: boolean): Promise<ProviderChoice[]> {
  const groqKey = process.env.GROQ_API_KEY;
  const out: ProviderChoice[] = [];

  if (groqKey) {
    // Groq mô hình văn bản không đọc được ảnh. Khi có ảnh phải chuyển sang
    // model multimodal theo đúng định dạng image_url của Groq.
    const models = await listGroqModels(groqKey, needVision);
    for (const model of models) {
      out.push({
        label: "Groq",
        make: () =>
          createOpenAICompatible({
            name: "groq",
            baseURL: GROQ_BASE_URL,
            apiKey: groqKey,
          }),
        model,
      });
    }
  }

  return out;
}

/**
 * Danh sách model thực tế sẽ gọi: loại model đang trong thời gian "chết
 * tạm thời" (circuit breaker) để người dùng không chờ timeout vào một
 * model đang hỏng. Model còn lại trong danh sách vẫn dùng được.
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

  const configured = await listAllProviders(needVision);
  const available = configured.filter(
    (p) => !dead[`${p.label}/${p.model}`],
  );
  // Không để circuit breaker khóa hoàn toàn ứng dụng: nếu mọi model đang bị
  // đánh dấu dead, vẫn thử lại ngay để người dùng không phải chờ hết TTL.
  return available.length > 0 ? available : configured;
}

/**
 * TỰ KIỂM TRA ĐỊNH KỲ (cron 10 phút/lần — crons.ts): kiểm tra khóa và
 * model của từng provider qua danh sách model chính thức (không tốn hạn
 * mức chat). Provider/model hồi phục được gỡ trạng thái chết ngay; hệ
 * thống tự chữa mà không cần ai can thiệp.
 */
export const aiSelfTest = internalAction({
  args: {},
  handler: async (ctx) => {
    const notes: string[] = [];

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      let availableModels: string[] = [];
      let note = "sống";
      try {
        const res = await fetch(`${GROQ_BASE_URL}/models`, {
          headers: { Authorization: `Bearer ${groqKey}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { id?: string }[] };
          availableModels = (json.data ?? []).map((m) => m.id ?? "");
        } else {
          note = `HTTP ${res.status}`;
        }
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }

      // Kiểm tra các model chat THỰC SỰ dùng (dò từ /models) thay vì so
      // từng tên trong danh sách ưu tiên — danh sách ưu tiên cố tình chứa
      // cả các model đã bị thu hồi để dòng dự phòng.
      // Cron thì chờ được: dò cho xong rồi đọc cache, khác với lượt hỏi của
      // người dùng vốn không được chờ lệnh gọi /models.
      await refreshGroqModels(groqKey);
      const known = liveModelsCache.get(groqKey);
      const checkModels = [
        known?.text ?? GROQ_TEXT_PREFERENCE[0],
        known?.vision ?? GROQ_VISION_PREFERENCE[0],
      ];
      for (const model of checkModels) {
        const ok = availableModels.includes(model);
        const modelNote = ok
          ? "sống"
          : note === "sống"
            ? `model ${model} không còn trong danh sách Groq`
            : note;
        if (ok) await clearProviderState(ctx, "Groq", model);
        else await markProviderFailure(ctx, "Groq", model, modelNote);
      }
      notes.push(
        `Groq: ${note} (${checkModels.length} model chat: ${checkModels.slice(0, 4).join(", ")})`,
      );
    }

    // ElevenLabs là nhánh đọc to chính — gọi /user để kiểm tra khóa mà
    // không tốn ký tự TTS (endpoint tts sẽ trừ hạn mức ngay khi chạy thử).
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      let note = "sống";
      try {
        const res = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
          headers: { "xi-api-key": elevenKey },
          signal: AbortSignal.timeout(6_000),
        });
        if (!res.ok) note = `HTTP ${res.status}`;
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      if (note === "sống") {
        await clearProviderState(ctx, "ElevenLabs", ELEVENLABS_MODEL);
      } else {
        await markProviderFailure(ctx, "ElevenLabs", ELEVENLABS_MODEL, note);
      }
      notes.push(`ElevenLabs: ${note}`);
    }

    // Gemini KHÔNG còn phục vụ chat — còn TTS dự phòng và tạo ảnh. Kiểm tra
    // model TTS thật sự sống để đàm thoại không chết âm thầm khi Google đổi model.
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      let liveTts: string | null = null;
      let note = "sống";
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models",
          { headers: { "x-goog-api-key": geminiKey } },
        );
        if (res.ok) {
          const json = (await res.json()) as { models?: { name?: string }[] };
          const names = (json.models ?? []).map((m) =>
            (m.name ?? "").replace(/^models\//, ""),
          );
          liveTts = GEMINI_TTS_MODELS.find((id) => names.includes(id)) ?? null;
          if (!liveTts) note = "không còn model TTS nào trong danh sách";
        } else {
          note = `HTTP ${res.status}`;
        }
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      if (liveTts) {
        for (const id of GEMINI_TTS_MODELS) {
          if (id === liveTts) await clearProviderState(ctx, "GeminiTTS", id);
          else await markProviderFailure(ctx, "GeminiTTS", id, "model không còn");
        }
        notes.push(`Gemini TTS: ${note} (${liveTts})`);
      } else {
        for (const id of GEMINI_TTS_MODELS) {
          await markProviderFailure(ctx, "GeminiTTS", id, note);
        }
        notes.push(`Gemini TTS: ${note}`);
      }
    }

    return notes.length ? notes.join(" | ") : "Chưa cấu hình khóa AI nào.";
  },
});

/* ------------------------------------------------------------------ */
/* TẠO ẢNH — dùng chính khóa Gemini đang có, không cần thêm khóa mới   *//* ------------------------------------------------------------------ */
/* Nhận diện ý định tạo ảnh — dùng chung client & server (src/lib/imageIntent) */
import { wantsImage } from "../lib/imageIntent";

/**
 * Thứ tự ưu tiên model tạo ảnh (Nano Banana). Tên được đối chiếu lại với
 * danh sách model đang sống; nếu Google đã đổi tên thì listGeminiImageModels
 * tự bổ sung các model ảnh còn sống thay vì để tính năng chết.
 */
const GEMINI_IMAGE_PREFERENCE = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
];
const IMAGE_TIMEOUT_MS = 90_000;

/**
 * PHONG CÁCH ẢNH — cố định theo Phật giáo Nguyên thủy (Theravāda).
 *
 * Cần ràng buộc rõ vì nếu để model ảnh tự do, phần lớn kéo sang chùa Phật giáo
 * Đông Á, tượng Bồ Tát, tay định ấn Bắc truyền hoặc tranh sơn dầu hào nhoáng —
 * đều lệch hẳn tinh thần Kinh tạng Pāli mà ứng dụng đại diện.
 */
const IMAGE_STYLE_GUIDE = [
  "Phong cách: tranh minh họa Phật giáo Nguyên thủy (Theravāda), bám sát Kinh tạng Pāli.",
  "Chủ thể gợi ý khi hợp đề tài: vườn tịnh (vihāra), tu sĩ mặc áo cà sa nâu đất đang tịnh tọa, bát cơ bày, cây Bồ đề, hoa sen nở, tháp chedi, lá dừa ghi chép kinh bằng chữ Pāli.",
  "Màu sắc: nâu đất, vàng cát, xanh lá trầm; ánh sáng dịu dàng, không chói.",
  "Tuyệt đối không dùng: tượng Bồ Tát, Quan Âm, Phật Bảo Đế, tay định ấn hay các tượng Phật Bắc truyền; không dùng kiến trúc chùa Đông Á.",
  "Không chữ Hán, không chữ Latin trong ảnh; nếu cần chữ thì chỉ dùng chữ Pāli viết trên lá dỹa.",
  "Không phong cách anime, không kim loại vàng, không rực rỡ.",
  "Nếu yêu cầu không liên quan Phật pháp thì chỉ giữ tông màu và quy tắc không chữ, không thêm chủ thể tôn giáo.",
].join(" ");

const imageModelsCache = new Map<string, { at: number; models: string[] }>();
const IMAGE_MODELS_TTL_MS = 10 * 60_000;

/**
 * Dò model tạo ảnh đang sống. Google liên tục thu hồi/đổi tên model ảnh
 * (gemini-3.1-flash-image trước đây trong danh sách đã không còn), hardcode
 * một danh sách thì chỉ cần một lần đổi tên là tính năng tạo ảnh chết âm
 * thầm. Cache 10 phút để không phải gọi /models mỗi lượt.
 */
async function listGeminiImageModels(
  geminiKey: string,
): Promise<string[]> {
  const cached = imageModelsCache.get(geminiKey);
  if (cached && Date.now() - cached.at < IMAGE_MODELS_TTL_MS) {
    return cached.models;
  }
  let live: string[] = [];
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": geminiKey },
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (res.ok) {
      const json = (await res.json()) as {
        models?: { name?: string; supportedGenerationMethods?: string[] }[];
      };
      live = (json.models ?? [])
        .filter(
          (m) =>
            typeof m.name === "string" &&
            (m.supportedGenerationMethods ?? []).includes("generateContent"),
        )
        .map((m) => (m.name ?? "").replace(/^models\//, ""));
    }
  } catch {
    /* không dò được thì cứ dùng danh sách ưu tiên */
  }
  const ordered: string[] = [];
  for (const id of GEMINI_IMAGE_PREFERENCE) {
    if (live.length === 0 || live.includes(id)) ordered.push(id);
  }
  for (const id of live) {
    if (ordered.includes(id)) continue;
    if (!id.includes("image")) continue;
    if (id.includes("tts") || id.includes("embedding")) continue;
    ordered.push(id);
  }
  const models = ordered.length > 0 ? ordered : [...GEMINI_IMAGE_PREFERENCE];
  imageModelsCache.set(geminiKey, { at: Date.now(), models });
  return models;
}

/**
 * Sinh ảnh bằng Gemini (mô hình Nano Banana).
 *
 * QUAN TRỌNG: KHÔNG trả base64 về client — mọi giá trị Convex bị giới hạn
 * 1MB, còn ảnh Gemini thường 1–2MB base64 nên sẽ khiến action lỗi và không
 * hiện được ảnh. Thay vào đó lưu vào File Storage rồi trả storageId.
 *
 * Trả về null khi không có khóa / mọi model đều lỗi — caller báo lỗi.
 */
async function callGeminiImage(
  geminiKey: string,
  model: string,
  instruction: string,
  modalities: string[],
): Promise<{ data: string; mime: string } | { error: string; fatal: boolean }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: { responseModalities: modalities },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // 404/403 = model không tồn tại hoặc không được phép → thử model khác,
    // đổi responseModalities cũng vô ích.
    return {
      error: `HTTP ${res.status} — ${body.slice(0, 180)}`,
      fatal: res.status === 404 || res.status === 403,
    };
  }
  const json = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { data?: string; mimeType?: string } }[];
      };
    }[];
    error?: { message?: string };
  };
  const parts = (json.candidates ?? []).flatMap((c) => c.content?.parts ?? []);
  // Ưu tiên part có mime ảnh; nếu không thì lấy part đầu có dữ liệu.
  const hit =
    parts.find(
      (p) =>
        p.inlineData?.data &&
        (p.inlineData.mimeType ?? "").startsWith("image/"),
    ) ?? parts.find((p) => p.inlineData?.data);
  if (!hit?.inlineData?.data) {
    return {
      error: json.error?.message ?? "phản hồi không chứa ảnh",
      fatal: false,
    };
  }
  return {
    data: hit.inlineData.data,
    mime: hit.inlineData.mimeType ?? "image/png",
  };
}

async function generateImage(
  ctx: { storage: { store: (blob: Blob) => Promise<string> } },
  prompt: string,
): Promise<{ storageId: string } | { error: string }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return { error: "thiếu khóa GEMINI_API_KEY" };
  const models = await listGeminiImageModels(geminiKey);
  const instruction = `Tạo hình theo yêu cầu sau.\n\n${IMAGE_STYLE_GUIDE}\n\nYêu cầu của người dùng: ${prompt}`;
  const tried: string[] = [];
  let lastError = "không rõ";
  for (const model of models) {
    // Model mới chỉ nhận IMAGE, model cũ đòi TEXT+IMAGE — thử cả hai.
    for (const modalities of [["IMAGE"], ["TEXT", "IMAGE"]]) {
      try {
        const out = await callGeminiImage(
          geminiKey,
          model,
          instruction,
          modalities,
        );
        if ("data" in out) {
          // Chuyển base64 → bytes rồi lưu vào File Storage.
          const bytes = Uint8Array.from(atob(out.data), (c) => c.charCodeAt(0));
          const storageId = await ctx.storage.store(
            new Blob([bytes], { type: out.mime }),
          );
          return { storageId };
        }
        lastError = `${model} [${modalities.join("+")}]: ${out.error}`;
        tried.push(model);
        if (out.fatal) break;
      } catch (err) {
        lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
        tried.push(model);
        break;
      }
    }
  }
  // Ghi log để lần sau biết chính xác nguyên nhân thay vì đoán mò.
  console.error(
    `[aiChat] tạo ảnh thất bại — model đã thử: ${tried.join(", ") || models.join(", ")} | ${lastError}`,
  );
  return { error: lastError };
}

/* ------------------------------------------------------------------ */
/* TẠO ẢNH — action riêng để client hiện thanh tiến trình %              */
/* ------------------------------------------------------------------ */

/**
 * Sinh ảnh từ yêu cầu của người dùng. Trả về ảnh base64; client tự hiện
 * thanh phần trăm trong lúc chờ (máy chủ không stream được tiến độ).
 * Lỗi trả về có cấu trúc để client báo đúng thông điệp.
 */
export const createImage = action({
  args: {
    prompt: v.string(),
    /** Dấu vân tay thiết bị — phục vụ giới hạn tốc độ */
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (ctx, { prompt, deviceId, integrity }) => {
    const denied = await checkRateLimit(ctx, "image", deviceId, integrity);
    if (denied) {
      return { ok: false as const, code: "rate_limited", message: denied };
    }
    const clean = prompt.trim().slice(0, 1500);
    if (!clean) {
      return {
        ok: false as const,
        code: "empty",
        message: "Chưa có nội dung để tạo hình.",
      };
    }
    const image = await generateImage(ctx, clean);
    if ("error" in image) {
      console.error("[aiChat] createImage:", image.error);
      return {
        ok: false as const,
        code: "image_unavailable",
        message:
          "Hiện chưa tạo được hình. Vui lòng thử lại sau ít phút hoặc đổi cách diễn đạt yêu cầu.",
      };
    }
    return { ok: true as const, storageId: image.storageId };
  },
});

/**
 * Lấy URL tải ảnh đã tạo từ File Storage. Ảnh nằm trong storage nên URL
 * ổn định — lịch sử hội thoại lưu cục bộ vẫn xem lại được sau này.
 */
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    try {
      return await ctx.storage.getUrl(storageId);
    } catch {
      return null;
    }
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
    // Các lỗi nghiệp vụ trả về có cấu trúc để production không bị che thành
    // "Server Error"; lỗi hạ tầng/action thật sự vẫn để client tự retry.
    const userId = await getAuthUserId(ctx);
    void userId;

    if (messages.length === 0 && !imageBase64) {
      return { ok: false as const, code: "empty", message: "Câu hỏi trống." };
    }

    // Chống tấn công: giới hạn kích thước đầu vào — bot gửi payload khổng lồ
    // sẽ bị từ chối ngay trước khi chạm provider AI.
    if (messages.length > 60) {
      return {
        ok: false as const,
        code: "history_too_long",
        message: "Hội thoại quá dài. Hãy xóa hội thoại và bắt đầu lại.",
      };
    }
    // Chỉ kiểm tra ngữ cảnh thực sự được gửi cho AI. Một tin nhắn cũ quá dài
    // nằm ngoài 4 lượt gần nhất không được phép làm hỏng mọi lượt hỏi sau.
    const recent: ChatMessage[] = messages.slice(-HISTORY_LIMIT);
    for (const m of recent) {
      if (typeof m.content !== "string" || m.content.length > 8000) {
        return {
          ok: false as const,
          code: "message_too_long",
          message: "Tin nhắn vượt quá độ dài cho phép.",
        };
      }
    }
    if (imageBase64 && imageBase64.length > 9_000_000) {
      return {
        ok: false as const,
        code: "image_too_large",
        message: "Ảnh quá lớn (tối đa khoảng 6MB).",
      };
    }

    // Chặn bot / thiết bị bị can thiệp đốt hạn mức AI trước khi gọi provider.
    // Kiểm tra giới hạn và dò model chạy SONG SONG: tiết kiệm trọn một vòng
    // mạng. Nhưng vẫn tôn trọng giới hạn vì phía dưới mới quyết định có gọi
    // provider hay không.
    const [denied, providers] = await Promise.all([
      checkRateLimit(ctx, "ask", deviceId, integrity),
      listProviders(ctx, Boolean(imageBase64)),
    ]);
    if (denied) return { ok: false as const, code: "rate_limited", message: denied };
    if (providers.length === 0) {
      // Không có model nào cấu hình được — thường là thiếu GROQ_API_KEY.
      return {
        ok: false as const,
        code: "no_provider",
        message:
          "Trợ lý Phật học chưa kết nối được máy chủ AI. Vui lòng thử lại sau ít phút hoặc báo lỗi qua mục Góp ý.",
      };
    }

    // generateText nhận ModelMessage của AI SDK, không nhận trực tiếp
    // OpenAI image_url. Provider OpenAI-compatible sẽ tự chuyển image thành
    // image_url khi gọi Groq.
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image"; image: Uint8Array; mediaType: string };
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
        const mime = imageMime ?? "image/jpeg";
        parts.push({
          type: "image",
          image: Uint8Array.from(atob(imageBase64), (char) => char.charCodeAt(0)),
          mediaType: mime,
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
            // Mặc định AI SDK retry 2 lần kèm backoff — mỗi lần chờ thêm
            // vài giây trước khi chuyển sang model kế tiếp. Tự chuyển model
            // nhanh hơn nhiều so với chờ retry cùng một model.
            maxRetries: 0,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("hết giờ (45s)")),
              AI_TIMEOUT_MS,
            ),
          ),
        ]);
        const reply = cleanMarkdown(result.text);
        if (reply) {
          // Thành công — provider vừa hồi phục thì gỡ trạng thái chết tạm thời.
          await clearProviderState(ctx, provider.label, provider.model);
          return { ok: true as const, reply };
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
    return {
      ok: false as const,
      code: "ai_unavailable",
      message:
        `Trợ lý Phật học tạm chưa trả lời được. Vui lòng thử lại sau ít phút.` +
        (imageBase64
          ? " (Gửi ảnh cần máy chủ AI hỗ trợ thị giác — có thể thử lại bằng câu hỏi chữ.)"
          : ""),
    };
  },
});

/**
 * TTS tiếng Việt chất lượng cao — server tổng hợp âm thanh rồi trả về base64.
 * Thứ tự ưu tiên: ElevenLabs (MP3, giọng đa ngôn ngữ) → Gemini TTS → null.
 * Trả về null khi cả hai nhánh lỗi → client dùng Web Speech dự phòng.
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
    // Nhóm giọng dùng chung cho cả hai nhánh: ElevenLabs nhận qua
    // voice_settings, Gemini nhận qua voice prebuilt — cùng một chuẩn nghe.
    const tone: VoiceTone = wantMale ? "male" : "female";
    const v = SERVER_VOICES[voice ?? ""];
    const elevenVoice =
      v?.eleven ??
      (tone === "male" ? "yoZ06aMxZJJ28mfd3POQ" : "EXAVITQu4vr4xnSDxMaL");

    // ƯU TIÊN 1: ElevenLabs — giọng đa ngôn ngữ đọc tiếng Việt tự nhiên
    // và trả MP3 nên client khỏi bọc WAV. Chỉ gửi đúng nội dung cần đọc.
    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      const eleven = await synthesizeElevenLabs(
        elevenKey,
        clean,
        elevenVoice,
        tone,
      );
      if (eleven) return eleven;
      console.warn(
        `[aiChat] ElevenLabs không dùng được, chuyển sang Gemini TTS (${VOICE_TONE_DESC[tone]})`,
      );
    }

    // ƯU TIÊN 2: Gemini TTS — dự phòng khi ElevenLabs lỗi hoặc hết hạn mức.

    const geminiVoice = v?.gemini ?? (tone === "male" ? "Charon" : "Kore");

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      // Google đã liên tục thay model TTS (2.5 preview → 3.x). Thử lần lượt
      // danh sách này: model đầu tiên còn sống sẽ trả audio, model đã bị
      // thu hồi trả 404 và ta chuyển sang model kế tiếp — nhờ vậy TTS không
      // chết âm thầm khi Google đổi tên model.
      for (const model of GEMINI_TTS_MODELS) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
                        // Chỉ gửi NỘI DUNG cần đọc. Trước đây có tiền tố
                        // chỉ dẫn giọng đọc, nhưng Gemini TTS đọc to cả lệnh
                        // nên câu đó lọt ra loa ở đầu mỗi câu trả lời.
                        text: clean,
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
          if (!res.ok) continue;
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
        } catch {
          /* thử model tiếp theo */
        }
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
