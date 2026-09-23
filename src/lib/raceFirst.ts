/* ------------------------------------------------------------------ */
/* RACE-FIRST — bản tương đương Promise.any cho target ES2020.         */
/* Trả về kết quả đầu tiên fulfill; chỉ reject khi TẤT CẢ đều reject.  */
/* ------------------------------------------------------------------ */

export function raceFirst<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let pending = promises.length;
    if (pending === 0) {
      reject(new Error("Không có nguồn nào để truy cập."));
      return;
    }
    let settled = false;
    const errors: unknown[] = [];
    for (const p of promises) {
      p.then(
        (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        },
        (err) => {
          errors.push(err);
          if (--pending === 0 && !settled) {
            reject(errors[0] ?? new Error("Tất cả nguồn đều lỗi."));
          }
        },
      );
    }
  });
}
