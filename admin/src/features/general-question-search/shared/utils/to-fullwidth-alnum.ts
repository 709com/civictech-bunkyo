const HALF = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%";

/**
 * 半角の英数字と % を全角にする（データベースの関数 to_fullwidth_alnum と同じ）。
 * 委員会の会議録の本文は全角の英数字のまま入っているので、色付けのときに全角の形も探す。
 */
export function toFullwidthAlnum(text: string): string {
  let out = "";
  for (const ch of text) {
    out += HALF.includes(ch)
      ? String.fromCharCode(ch.charCodeAt(0) + 0xfee0)
      : ch;
  }
  return out;
}

/** キーワードに、全角の形を足したもの（同じものは1つにまとめる） */
export function withFullwidthTerms(terms: string[]): string[] {
  return [...new Set([...terms, ...terms.map(toFullwidthAlnum)])];
}
