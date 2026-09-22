import { query } from "./_generated/server";

/**
 * Logo ứng dụng chính thức — chủ app tải ảnh lên qua tab Files của Convex
 * dashboard (vào thư mục Storage). Module này trả về URL của ảnh mới nhất
 * (theo thời gian tải lên) để toàn ứng dụng dùng làm logo thống nhất.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.system.query("_storage").order("desc").take(50);
    // Ưu tiên ảnh — nếu không có thì lấy tệp mới nhất (logo thường là tệp
    // duy nhất chủ app tải lên).
    const images = files.filter(
      (f) => f.contentType?.startsWith("image/") ?? false,
    );
    const pick = images[0] ?? files[0];
    if (!pick) return null;

    const url = await ctx.storage.getUrl(pick._id);
    if (!url) return null;
    return { url };
  },
});
