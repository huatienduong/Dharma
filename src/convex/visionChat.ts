/**
 * PHÂN TÍCH HÌNH ẢNH — nhánh riêng cho ảnh người dùng tải lên.
 *
 * VÌ SAO TÁCH KHỎI `aiChat.ask`:
 *   Nhánh ảnh của `ask` chạy trên Groq, nhưng Groq hiện KHÔNG còn model đọc
 *   ảnh nào (llama-4-scout đã bị thu hồi, /models chỉ còn model chữ). Nên
 *   mỗi lần gửi ảnh, `ask` rơi vào model chữ rồi báo "cần máy chủ hỗ trợ thị
 *   giác" — người dùng không bao giờ phân tích được ảnh.
 *   Gemini đọc ảnh rất tốt và khóa đã có sẵn trong hệ thống (đang phục vụ đọc
 *   to), nên: ẢNH → Gemini, CHỮ → Groq. Hai nhánh độc lập, nhánh này hỏng thì
 *   nhánh kia vẫn chạy (client tự lùi về `ask`).
 *
 * CƠ CHẾ "TỐI ĐA THEO GÓI":
 *   Một lượt nhận tối đa `MAX_IMAGES_PER_REQUEST` ảnh (gói Gemini đọc được
 *   nhiều ảnh trong một lượt; con số này là trần thực dụng cho độ trễ và
 *   dung lượng request). Khi người dùng gửi vượt trần hoặc vượt ngân sách
 *   dung lượng, hệ thống KHÔNG từ chối: nó cắt bớt ảnh dư, ghi rõ vào câu
 *   lệnh còn lại ảnh nào chưa được gửi, và vẫn trả lời bằng các ảnh còn lại.
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Model đọc ảnh, thử lần lượt cho tới khi có câu trả lời. */
const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
];

/** Giữ đúng giọng điệu của Trợ lý Phật học (rút gọn cho nhánh ảnh). */
const SYSTEM_PROMPT = `Bạn là "Trợ lý Phật học" — một PHẬT TỬ THUẦN THÀNH và là NGƯỜI BẠN TRI KỶ đồng hành trên con đường Phật pháp của mỗi người. Ứng dụng này do nhà phát triển Hứa Tiến Dương xây dựng và trực tiếp vận hành.

NHIỆM VỤ: nhìn (các) hình ảnh người dùng gửi và trả lời về chúng.

CÁCH TRẢ LỜI:
- Nói đúng nội dung ảnh trước (vài câu), rồi mới gắn với Phật học nếu ảnh có liên quan.
- Nhiều ảnh: so sánh, chỉ ra điểm chung và khác biệt giữa các ảnh.
- Trả lời bằng tiếng Việt, thân thiện, khiêm tốn, không dùng emoji, không dùng markdown.
- NGẮN GỌN: tối đa 6 câu. Không liệt kê từng chi tiết nhỏ vô nghĩa.
- Nếu ảnh không rõ hoặc không có gì để nói, nói thẳng là không nhìn rõ và mời người dùng gửi ảnh khác.
- Không bịa chi tiết không có trong ảnh. Không khẳng định điều không chắc chắn.`;

const MAX_OUTPUT_TOKENS = 700;
/** Khớp HISTORY_LIMIT của aiChat.ask để ngữ cảnh gửi lên giống nhau. */
const HISTORY_LIMIT = 4;

/* ----- Hạn mức "gói" cho một lượt phân tích ảnh ----- */

/** Trần số ảnh mỗi lượt (gói Gemini đọc nhiều ảnh/lượt; con số này giữ độ trễ ổn định). */
export const MAX_IMAGES_PER_REQUEST = 6;
/** Tổng dung lượng base64 tối đa mỗi lượt — vượt thì cắt bớt ảnh sau. */
const MAX_TOTAL_BASE64 = 4_500_000;
/** Một ảnh đơn lẻ không được vượt quá ngân sách này. */
const MAX_IMAGE_BASE64 = 3_000_000;

export type VisionImage = { base64: string; mime?: string };

export type VisionReply =
  | { ok: true; reply: string; provider: string; imageCount: number; dropped: number }
  | { ok: false; code: "rate_limited" | "no_provider" | "bad_image" | "ai_unavailable"; message: string };

/**
 * Chép lời nói: cùng hạn mức "ask" để ảnh không biến thành đường vòng né giới
 * hạn. Chỉ dùng `internal.aiChat.checkAiRateLimit` — không nhân bản logic.
 */
async function rateLimited(
  ctx: { runMutation: (m: unknown, a: unknown) => Promise<{ allowed: boolean }> },
  deviceId: string | undefined,
  integrity: string | undefined,
): Promise<boolean> {
  const trusted =
    integrity === "ok" && typeof deviceId === "string" && deviceId.length >= 8;
  const key = trusted ? deviceId!.slice(0, 64) : "anonymous";
  const res = (await ctx.runMutation(internal.aiChat.checkAiRateLimit, {
    bucket: "ask",
    deviceId: key,
    limit: trusted ? 15 : 2,
  })) as { allowed: boolean };
  return !res.allowed;
}

/** Định dạng Gemini chấp nhận; ảnh lạ thì coi như JPEG. */
function safeMime(mime: string | undefined): string {
  return mime && /^(image\/(jpeg|png|webp|gif|heic|heif))$/i.test(mime)
    ? mime
    : "image/jpeg";
}

/**
 * Cắt ảnh theo hạn mức gói: giữ tối đa MAX_IMAGES_PER_REQUEST ảnh và tổng
 * dung lượng không vượt ngân sách. Trả về ảnh giữ lại + số ảnh bị bỏ.
 */
function fitQuota(images: VisionImage[]): { kept: VisionImage[]; dropped: number } {
  const kept: VisionImage[] = [];
  let total = 0;
  for (const img of images) {
    const size = img.base64.length;
    // Ảnh vượt hạn mức thì bỏ qua ảnh đó, vẫn giữ các ảnh còn lại để AI trả lời.
    if (
      kept.length >= MAX_IMAGES_PER_REQUEST ||
      size > MAX_IMAGE_BASE64 ||
      total + size > MAX_TOTAL_BASE64
    ) {
      continue;
    }
    kept.push(img);
    total += size;
  }
  return { kept, dropped: images.length - kept.length };
}

export const analyzeImage = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    /** Nhiều ảnh mỗi lượt (đường chính). */
    images: v.optional(v.array(v.object({ base64: v.string(), mime: v.optional(v.string()) }))),
    /** Giữ lại đường cũ: một ảnh đơn (client cũ, hoặc nhánh dự phòng `ask`). */
    imageBase64: v.optional(v.string()),
    imageMime: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    integrity: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { messages, images, imageBase64, imageMime, deviceId, integrity },
  ): Promise<VisionReply> => {
    if (await rateLimited(ctx as never, deviceId, integrity)) {
      return {
        ok: false as const,
        code: "rate_limited" as const,
        message:
          "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ ít phút rồi thử lại.",
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return {
        ok: false as const,
        code: "no_provider" as const,
        message: "Máy chủ chưa cấu hình khóa đọc ảnh.",
      };
    }

    // Ưu tiên cấu trúc nhiều ảnh; chỉ dùng đường một ảnh khi client gửi kiểu cũ.
    const incoming: VisionImage[] = (images?.length
      ? images
      : imageBase64
        ? [{ base64: imageBase64, mime: imageMime }]
        : []
    ).filter((i) => !!i.base64);
    if (incoming.length === 0) {
      return {
        ok: false as const,
        code: "bad_image" as const,
        message: "Không nhận được hình ảnh.",
      };
    }
    const { kept, dropped } = fitQuota(incoming);
    if (kept.length === 0) {
      return {
        ok: false as const,
        code: "bad_image" as const,
        message: "Ảnh vượt quá giới hạn của gói. Hãy gửi ảnh nhỏ hơn.",
      };
    }

    const recent = messages.slice(-HISTORY_LIMIT);
    // Ghi rõ phần chưa gửi được để AI vẫn trả lời dựa trên ảnh còn lại, thay vì
    // im lặng hoặc báo lỗi cho người dùng.
    const note =
      dropped > 0
        ? `\n(Lưu ý: bạn chỉ nhận được ${kept.length}/${incoming.length} ảnh do giới hạn của gói. Hãy trả lời dựa trên các ảnh được gửi và nhắc nhẹ rằng có ảnh chưa được phân tích.)`
        : kept.length > 1
          ? `\n(Đây là ${kept.length} ảnh theo thứ tự người dùng gửi.)`
          : "";

    // Ảnh gắn vào lượt hỏi cuối cùng (giống cách aiChat.ask làm).
    const contents = recent
      .map((m, i) => {
        const isLast = i === recent.length - 1 && m.role === "user";
        return {
          role: m.role === "assistant" ? ("model" as const) : ("user" as const),
          parts: isLast
            ? [
                { text: `${m.content}${note}` },
                ...kept.map((img) => ({
                  inlineData: { mimeType: safeMime(img.mime), data: img.base64 },
                })),
              ]
            : [{ text: m.content }],
        };
      });
    // Gemini yêu cầu lượt đầu phải do "user" mở đầu.
    while (contents.length > 0 && contents[0].role !== "user") contents.shift();

    let lastError = "không rõ";
    for (const model of VISION_MODELS) {
      try {
        const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
            },
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          lastError = `${model}: HTTP ${res.status} ${detail.slice(0, 160)}`;
          continue;
        }
        const json = (await res.json()) as {
          candidates?: {
            content?: { parts?: { text?: string }[] };
            finishReason?: string;
          }[];
          promptFeedback?: { blockReason?: string };
        };
        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (text) {
          return {
            ok: true as const,
            reply: text,
            provider: model,
            imageCount: kept.length,
            dropped,
          };
        }
        lastError = `${model}: ${
          json.promptFeedback?.blockReason ??
          json.candidates?.[0]?.finishReason ??
          "trả lời rỗng"
        }`;
      } catch (err) {
        lastError = `${model}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    console.error(`[visionChat] mọi model đọc ảnh đều lỗi: ${lastError}`);
    return {
      ok: false as const,
      code: "ai_unavailable" as const,
      message:
        "Trợ lý chưa phân tích được hình ảnh này. Vui lòng thử lại, hoặc mô tả bằng lời.",
    };
  },
});
