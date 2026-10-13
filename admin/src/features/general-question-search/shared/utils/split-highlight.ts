export type HighlightSegment = {
  text: string;
  /** キーワードに当たっている部分か */
  hit: boolean;
};

/**
 * 文章を「キーワードに当たっている部分」と「それ以外」に切り分ける。
 * 英字の大文字・小文字は区別しない。重なった範囲は1つにまとめる。
 * 文章そのものは1文字も変えない（切り分けた text をつなげると元の文章に戻る）。
 */
export function splitHighlight(
  text: string,
  terms: string[]
): HighlightSegment[] {
  if (text.length === 0) return [];

  const haystack = text.toLowerCase();
  const needles = terms
    .map((term) => term.toLowerCase())
    .filter((term) => term.length > 0);

  // 小文字にすると長さが変わる文字が含まれる場合は、位置がずれるので色付けしない
  if (needles.length === 0 || haystack.length !== text.length) {
    return [{ text, hit: false }];
  }

  const ranges: [number, number][] = [];
  for (const needle of needles) {
    let from = 0;
    while (from <= haystack.length - needle.length) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      ranges.push([index, index + needle.length]);
      from = index + needle.length;
    }
  }
  if (ranges.length === 0) return [{ text, hit: false }];

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), hit: false });
    }
    segments.push({ text: text.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), hit: false });
  }
  return segments;
}
