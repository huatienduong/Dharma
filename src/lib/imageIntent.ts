/**
 * Nhận diện ý định “hãy tạo / vẽ hình cho tôi” — dùng chung cho cả máy chủ
 * (Convex) và trình duyệt để hai bên luôn thống nhất. Bỏ dấu tiếng Việt
 * trước khi so khớp nên không bỏ sót “vẽ / tạo / sinh / phác họa”.
 */

/** Bỏ dấu tiếng Việt + hạ chữ thường để so khớp ổn định. */
export function deaccent(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

/**
 * Chỉ bắt câu yêu cầu tạo ảnh rõ ràng: cần CẢ danh từ “ảnh/hình/tranh”
 * lẫn động từ “vẽ/tạo/sinh”. Nhờ vậy không bắt nhầm câu hỏi thường có chữ
 * “anh” — đây là danh từ tự nhiên trong tiếng Việt.
 */
export function wantsImage(text: string): boolean {
  const t = deaccent(text);
  const hasImageNoun =
    /\b(anh|hinh|tranh|tranh ve|buc tranh|anh minh hoa|minh hoa|hoa van|logo|hoc)\b/.test(
      t,
    );
  const hasImageVerb =
    /\b(ve|tao|sinh|dung|hoa|phong hoa|phac hoa|minh hoa|thiet ke|ve ra|tao ra|sinh ra|draw|create|generate|make|design|render|illustrate|paint)\b/.test(
      t,
    );
  return hasImageNoun && hasImageVerb;
}
