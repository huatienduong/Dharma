/**
 * DỌN CÂU TRẢ LỜI AI TRƯỚC KHI HIỂN THỊ LÊN KHUNG CHAT.
 *
 * Khung chat hiển thị văn bản thuần: không markdown, không HTML. Model
 * vẫn hay trả về **in đậm**, `### tiêu đề`, `mã`, hay những dòng gạch đầu
 * dòng "– ..." rải rác — người dùng thấy ký tự thô rất xấu, nhất là khi
 * đọc bằng chế độ đọc to. Hàm này gỡ sạch và biến danh sách gạch đầu dòng
 * thành đoạn văn liền mạch.
 */

/**
 * Bỏ dấu gạch đầu dòng / số thứ tự ở đầu từng dòng và ghép các dòng đó
 * thành một đoạn văn. Giữ nguyên những đoạn trình bày bằng đoạn trống như
 * cũ, vì đó là cấu trúc có chủ ý, không phải danh sách.
 */
function stripListMarkers(text: string): string {
  const isItem = (line: string): string | null => {
    let rest = line;
    // Có thể dồn hai cấp: "– 1. Nội dung".
    for (let i = 0; i < 2; i++) {
      const m = /^\s*(?:[–—-]|[•*]|\d{1,2}[.)])\s+(.*)$/.exec(rest);
      if (!m) break;
      rest = m[1];
    }
    // Bỏ nhãn đếm bước để câu đọc như văn xuôi: "Bước 1: …" → "…".
    rest = rest.replace(
      /^\s*(?:Bước|Buoc|Thứ)\s+(?:\d{1,2}|[mM]ốt|hai|ba|bốn|năm)\s*[.:–—-]?\s*/,
      "",
    );
    const clean = rest.trim();
    return clean ? clean : null;
  };

  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (!run.length) return;
    // Nối các mục thành một đoạn. Mục nào chưa có dấu kết câu thì thêm dấu
    // chấm, nếu không sẽ ra câu khó đọc kiểu "micro Tắt app khác".
    const parts = run.map((s, i) =>
      i < run.length - 1 && !/[.!?;:,…]$/.test(s.trim()) ? `${s.trim()}.` : s.trim(),
    );
    out.push(parts.join(" ").replace(/[ \t]+([,.;:!?])/g, "$1"));
    run = [];
  };
  for (const line of text.split("\n")) {
    const item = isItem(line);
    if (item) {
      run.push(item);
      continue;
    }
    flush();
    out.push(line);
  }
  flush();
  return out.join("\n").trim();
}

/** Bỏ ký tự markdown còn sót và gạch đầu dòng ở đầu câu mở đầu. */
export function cleanPlainText(input: string): string {
  const stripped = input
    .replace(/\r\n?/g, "\n")
    // Link dạng markdown [chữ](https://...) → đường dẫn thuần để bấm được.
    .replace(/\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$2")
    .replace(/\[([^\]]*)\]\((?!https?:)[^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*([-*_]\s*){3,}$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const noList = stripListMarkers(stripped);
  // Câu mở đầu phải là câu trả lời thật, không phải gạch đầu dòng.
  return noList.replace(/^[\s–\-•*]+/, "").trim();
}
