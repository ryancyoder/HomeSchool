import { Fragment } from "react";

// Deliberately only http(s): anything else (javascript:, data:) must never
// become an anchor, since this text is typed into the planner.
// Built per call rather than shared, so no lastIndex is carried between renders.
const urlPattern = () => /\bhttps?:\/\/[^\s<>"']+/gi;

// A URL that ends a sentence picks up its punctuation; a closing bracket is
// only trimmed when it has no opener inside the match.
function trimTrailing(url: string): string {
  let out = url.replace(/[.,;:!?]+$/, "");
  while (/[)\]}]$/.test(out)) {
    const close = out.slice(-1);
    const open = close === ")" ? "(" : close === "]" ? "[" : "{";
    const balanced = out.split(open).length - 1 >= out.split(close).length - 1;
    if (balanced) break;
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Renders text with any bare URLs turned into links. Everything is emitted as
 * React children rather than markup, so the surrounding text stays escaped.
 */
export default function Linkify({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(urlPattern())) {
    const start = match.index ?? 0;
    const href = trimTrailing(match[0]);

    if (start > cursor) parts.push(text.slice(cursor, start));

    parts.push(
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
      >
        {href}
      </a>,
    );

    cursor = start + href.length;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
