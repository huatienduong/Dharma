/**
 * DỌN CÂU TRẢ LỜI AI TRƯỚC KHI HIỆN LÊN KHUNG CHAT.
 *
 * Khung chat hiển thị văn bản thuần: không có markdown, không phải HTML.
 * Model vẫn thỉnh thoảng trả về **in đậm**, `### tiêu đề`, `* in nghiêng`
 * hoặc mở đầu bằng gạch đầu dòng — người dùng thấy nguyên ký tự thô rất
 * xấu. Hàm này làm sạch một lần, tập trung vào những lỗi thấy thường xuyên;
 * không cố bắt mọi trường hợp biên vì sẽ dễ làm méo nội dung.
 */

/** Bỏ ký tự markdown còn sót và gạch đầu dòng ở đầu câu mở đầu. */
export function cleanPlainText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    // Link dạng markdown [chữ](https://...) → đường dẫn thuần để bấm được.
    .replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$2")
    .replace(/\[([^\]]*)\]\((?!https?:)[^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^\s*[*•]+\s+/gm, "– ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    // Câu mở đầu phải là câu trả lời thật, không phải gạch đầu dòng.
    .replace(/^[\s–\-•*]+/, "")
    .trim();
}
