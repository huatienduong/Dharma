import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
      model: "gemini-3.6-flash",
    },
  ];
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
3b. BẮT BUỘC kèm CHỮ PĀLI: mỗi tiêu đề mục ghi kèm thuật ngữ Pāli trong ngoặc, vd "## Bối cảnh (Nidāna)"; khi trích lời Phật phải đưa NGUYÊN VĂN PĀLI trong dấu «...» rồi mới đến dòng dịch nghĩa tiếng Việt ngay dưới. Nếu không chắc nguyên văn, chỉ ghi thuật ngữ Pāli, tuyệt đối không bịa câu Pāli.
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
      "Chưa kết nối được máy chủ AI. Vui lòng thử lại sau ít phút.",
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

/**
 * ĐỀ XUẤT TOÀN BỘ KINH ĐIỂN — AI tự nạp danh sách cho từng mục học liệu.
 * Danh sách được cache dùng chung (aiDocs, kind = "index-*") và thay thế
 * dữ liệu cứng cũ: người dùng mở mục nào là AI nạp đề xuất mục đó.
 */
export const generateIndex = action({
  args: { indexKind: v.string() },
  handler: async (_ctx, { indexKind }) => {

    const guides: Record<string, string> = {
      suttas:
        `Liệt kê 80 bài kinh QUAN TRỌNG NHẤT và PHỔ BIẾN NHẤT của Kinh tạng Pāli (Sutta Piṭaka) theo truyền thống Theravāda mà người Phật tử Việt Nam nên đọc: trải đều Đại bộ (DN), Trung bộ (MN), Tương Ưng (SN), Tăng Chi (AN) và Tiểu bộ (Khuddaka: Dhammapada, Sutta Nipāta, Udāna, Itivuttaka, Theragāthā, Therīgāthā, Khuddakapāṭha...). Phải có đủ các kinh nền tảng: Chuyển pháp luân (SN 56.11), Vô ngã tướng (SN 22.59), Đại niệm xứ (MN 10 / DN 22), Niệm hơi thở (MN 118), Tiểu kinh Khổ uẩn, Kinh Lửa Cháy (SN 35.28), Kinh Kalama (AN 3.65), Nhân duyên (SN 12.2), Đại kinh Bốn mươi (MN 117), Kinh Ví dụ cái cưa (MN 21), Tiểu Mã Luân (MN 63), Kinh Gia chủ Sigāla (DN 31), Maṅgala, Raṭana, Mettā (Karaṇīyamettā), Pháp Cú (các phẩm Song Yếu, Tâm, Hoa...), Kinh Vô ngã tướng, Cūḷa- và Mahā-parinibbāna, Kinh dạy Rāhula, Kinh Từ bi (Mettā), Abhayarājakumāra, Kinh An trú suối (AN 11.16)... Rải đều các nhóm: giáo lý nền tảng, thực hành thiền, đạo đức tại gia, xã hội-Tăng già.`,
      vinaya:
        `Liệt kê 20 văn bản/thành phần chính của Luật tạng Pāli (Vinaya Piṭaka): Pārājika, Pācittiya, Mahāvagga, Cūḷavagga, Parivāra, Pātimokkha... với mô tả nội dung và số điều luật nếu có.`,
      dictionary:
        `Liệt kê 50 thuật ngữ Phật học Pāli CỐT LÕI theo truyền thống Theravāda mà người học cần tra cứu nhiều nhất: Tứ diệu đế, Bát chánh đạo, ngũ uẩn, thập nhị nhân duyên, thiền quán, thiền chỉ, các trạng thái tâm...`,
      commentary:
        `Liệt kê 20 bài chú giải (Aṭṭhakathā) quan trọng nhất cho các kinh nền tảng Theravāda (Chú giải Chuyển pháp luân, chú giải Đại niệm xứ, Dhammapada Aṭṭhakathā...).`,
      abhidhamma:
        `Liệt kê 30 văn bản/thành phần quan trọng nhất của LUẬN TẠNG Pāli (Abhidhamma Piṭaka) theo truyền thống Theravāda: 7 bộ luận chính (Dhammasaṅgaṇī, Vibhaṅga, Dhātukathā, Puggalapaññatti, Kathāvatthu, Yamaka, Paṭṭhāna), các luận thư Thượng Tọa Bộ (Abhidhammattha-saṅgaha, Visuddhimagga, Abhidhammāvatāra, Nāmarūpapariccheda...), cùng các phạm trù cốt lõi nên có bài riêng: 4 pháp siêu lý (citta, cetasika, rūpa, nibbāna), 89/121 tâm, 52 tâm sở, 24 duyên (Paṭṭhāna), ngũ uẩn–thập nhị xứ–thập bát giới, tiến trình tâm (citta-vīthi), tái tục (paṭisandhi), nghiệp và 31 cõi. Mỗi mục có mô tả 1 câu nêu rõ vị trí trong Luận tạng Theravāda.`,
    };
    const guide = guides[indexKind];
    if (!guide) throw new Error("Loại danh sách không hợp lệ.");

    const { text } = await generateWithFallback(
      `${guide}

TRẢ VỀ DUY NHẤT một mảng JSON hợp lệ (không thêm chữ nào ngoài JSON), mỗi phần tử:
{"id":"ma-kinh-hoac-thuat-ngu-ky-tu-latin","title":"tên tiếng Việt","pali":"tên Pāli","desc":"mô tả 1 câu"}`,
      6000,
    );

    // Trích mảng JSON từ phản hồi (AI có thể bọc ```json)
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Trợ lý Phật học trả về danh sách không hợp lệ, thử lại.");
    }
    return text.slice(start, end + 1);
  },
});

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
  handler: async (_ctx, { refId, title, extra }) => {
    const prompt = `Hãy biên soạn BÀI KINH PHẬT GIÁO đầy đủ, có thể đọc trực tiếp và thực hành chiêm nghiệm, theo yêu cầu sau:
- Mã kinh: ${refId}
- Tên gợi ý: ${title ?? "(tự xác định theo mã kinh)"}
${extra ? `- Ghi chú thêm: ${extra}` : ""}

Yêu cầu cấu trúc:
1. "## Danh xưng" — câu mở đầu đúng chuẩn Pāli (Namo Tassa... nếu phù hợp) hoặc bối cảnh (Như vầy tôi nghe...).
2. "## Bối cảnh" — Đức Phật thuyết tại đâu, cho ai.
3. "## Kinh văn (Pāli & dịch nghĩa)" — đưa NGUYÊN VĂN PĀLI các đoạn then chốt trong dấu «...», mỗi đoạn Pāli theo sau ngay bởi một dòng dịch nghĩa tiếng Việt; chia đoạn ngắn dễ đọc, mỗi đoạn trước có "• Đoạn n:" hoặc đánh số.
4. "## Ý nghĩa" — luận giải cốt lõi theo truyền thống Theravāda (nêu tên Pāli trong ngoặc cho mỗi mục).
5. "## Thực hành" — gợi ý ứng dụng tu tập.
6. "## Thuật ngữ Pāli then chốt" — liệt kê các thuật ngữ Pāli trong kinh kèm nghĩa ngắn.
7. Kết thúc bằng dòng "Nguồn: ..." (nikāya + số hiệu + tham chiếu ATī/BU nếu rõ).`;
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
  handler: async (_ctx, { refId, title, extra }) => {
    const prompt = `Hãy biên soạn NỘI DUNG LUẬT TẠNG (Vinaya Piṭaka) đầy đủ, đọc trực tiếp được:
- Mã văn bản: ${refId}
- Tên gợi ý: ${title ?? "(tự xác định)"}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc:
1. "## Tổng quan (Pāli)" — văn bản này thuộc Piṭaka nào (Pārājika, Pācittiya, Mahāvagga...), nêu tên Pāli của văn bản trong ngoặc, phạm vi áp dụng.
2. "## Nội dung điều luật (Sikkhāpada)" — các điều chính, mỗi điều "• Điều n — …", nêu tên Pāli của điều, ý nghĩa và trường hợp vi phạm.
3. "## Pāli & dịch nghĩa" — trích nguyên văn câu Pāli chuẩn của các điều chính (trong dấu «...») rồi dịch nghĩa tiếng Việt ngay dưới.
4. "## Thuật ngữ Pāli then chốt" — liệt kê thuật ngữ kèm nghĩa ngắn.
5. "## Ý nghĩa kỷ luật" — mục đích của giới luật theo lời Đức Phật (svakkhāto bhagavatā dhammo...).
6. Kết thúc bằng "Nguồn: ...".`;
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
  handler: async (_ctx, { refId, title, extra }) => {
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

export const generateAbhidhamma = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (_ctx, { refId, title, extra }) => {
    const prompt = `Hãy biên soạn NỘI DUNG LUẬN TẠNG (Abhidhamma Piṭaka) đầy đủ theo truyền thống Theravāda Mahāvihāra, đọc trực tiếp được:
- Mã văn bản / phạm trù: ${refId}
- Tên gợi ý: ${title ?? "(tự xác định theo mã)"}
${extra ? `- Ghi chú: ${extra}` : ""}

Cấu trúc bắt buộc:
1. "## Tổng quan" — văn bản/phạm trù này thuộc bộ luận nào trong 7 bộ Abhidhamma (Dhammasaṅgaṇī, Vibhaṅga, Dhātukathā, Puggalapaññatti, Kathāvatthu, Yamaka, Paṭṭhāna), hoặc thuộc luận thư Thượng Tọa Bộ nào; nêu vị trí và phạm vi.
2. "## Phân tích pháp" — trình bày theo phương pháp siêu lý (paramattha): nêu đúng số lượng pháp (tâm, tâm sở, sắc pháp, Niết-bàn), định nghĩa Pāli chuẩn và phân loại. Dùng liệt kê "• " cho từng pháp/phạm trù.
3. "## Liên hệ Kinh tạng" — đối chiếu phạm trù luận với các kinh Pāli tương ứng (đúng số hiệu nikāya).
4. "## Ứng dụng tu tập" — ý nghĩa thực hành: quán danh-sắc, thấy rõ vô thường–khổ–vô ngã ở mức vi tế, hỗ trợ thiền quán.
5. "## Thuật ngữ then chốt" — liệt kê thuật ngữ Pāli quan trọng kèm nghĩa ngắn.
6. Kết thúc bằng một dòng riêng "Nguồn: ..." nêu rõ bộ luận + chương/phần + tham chiếu (vd "Abhidhammattha-saṅgaha, ch. I", "Dhammasaṅgaṇī, Cittuppādakaṇḍa").

Tuyệt đối không bịa số hiệu hay trích dẫn; chính xác theo Luận tạng Pāli và luận thư Thượng Tọa Bộ.`;
    const { text } = await generateWithFallback(prompt, 4500);
    return text;
  },
});

export const generateCommentary = action({
  args: {
    refId: v.string(),
    title: v.optional(v.string()),
    extra: v.optional(v.string()),
  },
  handler: async (_ctx, { refId, title, extra }) => {
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
  handler: async (_ctx, { refId, title, extra }) => {
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

/**
 * BÀI THIỀN CHI TIẾT AI TỰ BIÊN SOẠN — bổ sung cho mục Thiền.
 * Trả về JSON: tên, pāli, mô tả, các bước, lợi ích, lời khuyên, kinh nguồn.
 * Dùng để đề xuất thêm kỹ thuật thiền mới ngoài 4 kỹ thuật cốt lõi.
 */
export const generateMeditationLesson = action({
  args: { topic: v.string() },
  handler: async (_ctx, { topic }) => {
    const prompt = `Hãy biên soạn MỘT BÀI HƯỚNG DẪN THIỀN chi tiết theo truyền thống Theravāda cho chủ đề:
"${topic}"

Yêu cầu: trả về DUY NHẤT một JSON hợp lệ (không bọc markdown, không thêm chữ ngoài JSON) với cấu trúc:
{
  "name": "tên kỹ thuật tiếng Việt (ngắn gọn)",
  "pali": "tên Pāli",
  "tagline": "mô tả 1 câu ngắn",
  "source": "kinh nguồn gốc (nikāya + số hiệu nếu rõ)",
  "suggestedMin": 15,
  "difficulty": "Cơ bản" | "Trung cấp" | "Nâng cao",
  "benefits": ["lợi ích 1", "lợi ích 2", "lợi ích 3"],
  "steps": [{"title": "1. Tên bước", "text": "hướng dẫn chi tiết 2-4 câu để thực hành NGAY"}],
  "tips": ["lời khuyên thực hành 1", "lời khuyên 2", "lời khuyên 3"],
  "body": "giải thích sâu về nền tảng giáo lý của kỹ thuật này (3-4 đoạn, có thể dùng '## ' cho tiêu đề con)"
}

Số bước: 5-7. Văn phong trang nghiêm, rõ ràng, người mới đọc cũng thực hành được ngay. Nếu chủ đề chung chung (vd "thiền cho người mới"), hãy chọn kỹ thuật phù hợp nhất tự biên soạn.`;
    const { text } = await generateWithFallback(prompt, 3000);
    // Trích JSON từ phản hồi (AI có thể bọc ```json)
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Bài thiền trả về không hợp lệ, thử lại.");
    }
    return text.slice(start, end + 1);
  },
});

/** Danh sách chủ đề thiền AI gợi ý (dùng cho nút "Khám phá thêm"). */
export const generateMeditationTopics = action({
  args: {},
  handler: async (_ctx) => {
    const prompt = `Liệt kê 8 chủ đề thiền Theravāda HAY NHẤT để người Phật tử tại gia khám phá tiếp (ngoài 4 kỹ thuật cốt lõi: niệm hơi thở, Mettā, Maranasati, thiền hành).

Trả về DUY NHẤT mảng JSON (không thêm chữ ngoài JSON), mỗi phần tử:
{"id":"chu-de-ky-tu-latin","title":"tên tiếng Việt ngắn gọn","desc":"mô tả 1 câu"}`;
    const { text } = await generateWithFallback(prompt, 1200);
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Danh sách chủ đề không hợp lệ, thử lại.");
    }
    return text.slice(start, end + 1);
  },
});
