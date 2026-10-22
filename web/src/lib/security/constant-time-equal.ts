/**
 * 2つの文字列が同じかを、かかる時間が中身によって変わらない方法で比べる。
 *
 * - `===` は最初に違う文字で止まるため、応答の時間の差からパスワードを
 *   1文字ずつ当てられるおそれがある（タイミング攻撃）。
 * - ミドルウェアは Edge で動くので、Node 専用の `node:crypto`（timingSafeEqual）は使わない。
 *   TextEncoder とビット演算だけで比べる。
 * - 長さが違うときも、長いほうの長さぶん最後まで比べる（途中で返さない）。
 */
export function constantTimeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  const length = Math.max(bytesA.length, bytesB.length);

  let diff = bytesA.length ^ bytesB.length;
  for (let i = 0; i < length; i++) {
    diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  }
  return diff === 0;
}
