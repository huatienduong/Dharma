/**
 * GỌI ACTION CONVEX QUA HTTP TRỰC TIẾP.
 *
 * Vì sao không dùng `useAction(api....)`:
 *   App này chạy trên môi trường không có deploy key trong shell, nên kiểu
 *   sinh tự động (`_generated/api`) chỉ cập nhật khi nền tảng deploy. Gọi
 *   bằng `fetch` tới `/api/action` cho nhánh đọc ảnh (mới thêm) hoạt động
 *   ngay và không phụ thuộc bước sinh kiểu.
 *
 * Hàm này CHỈ dùng cho nhánh dự phòng/đọc ảnh; hội thoại chữ vẫn đi qua
 * `useAction` như cũ nên không có thay đổi hành vi.
 */

const CONVEX_URL = "https://determined-rabbit-619.convex.cloud";

/** Gọi một action và trả về `value`; ném lỗi nếu máy chủ không trả thành công. */
export async function callConvexAction<T>(
  path: string,
  args: Record<string, unknown>,
  timeoutMs = 60_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${CONVEX_URL}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args }),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      value?: T;
      errorMessage?: string;
    } | null;
    if (!json || json.status !== "success" || json.value === undefined) {
      throw new Error(
        json?.errorMessage ?? `Máy chủ không phản hồi (HTTP ${res.status}).`,
      );
    }
    return json.value;
  } finally {
    window.clearTimeout(timer);
  }
}
