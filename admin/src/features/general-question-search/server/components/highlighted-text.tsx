import { splitHighlight } from "../../shared/utils/split-highlight";

type HighlightedTextProps = {
  text: string;
  terms: string[];
};

/** 文章の中のキーワードに色を付けて表示する */
export function HighlightedText({ text, terms }: HighlightedTextProps) {
  const segments = splitHighlight(text, terms);
  let offset = 0;

  return (
    <>
      {segments.map((segment) => {
        const key = offset;
        offset += segment.text.length;
        return segment.hit ? (
          <mark
            key={key}
            className="rounded-sm bg-yellow-200 px-0.5 font-semibold text-gray-900"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={key}>{segment.text}</span>
        );
      })}
    </>
  );
}
