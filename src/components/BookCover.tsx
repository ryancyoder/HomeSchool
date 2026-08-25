"use client";

import { useState } from "react";
import { swatch } from "@/lib/theme";

/**
 * A real cover when one loads, otherwise a typographic stand-in so the shelf
 * still reads as a shelf.
 *
 * The fallback is also the error path: cover URLs point at third-party hosts
 * that may 404 for a given edition, and a broken-image icon on every shelf is
 * worse than no artwork at all. Plain <img> rather than next/image because the
 * hosts are arbitrary and next/image would need each one configured.
 */
export default function BookCover({
  title,
  author,
  coverUrl,
  color,
  size = "shelf",
}: {
  title: string;
  author: string | null;
  coverUrl: string | null;
  color: string;
  size?: "shelf" | "detail";
}) {
  const [failed, setFailed] = useState(false);
  const s = swatch(color);
  const detail = size === "detail";
  const frame = `aspect-[2/3] w-full rounded-lg shadow-sm ring-1 ring-black/10 ${
    detail ? "max-w-48" : ""
  }`;

  if (coverUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${frame} bg-card object-cover`}
      />
    );
  }

  return (
    <div
      aria-label={`${title}${author ? ` by ${author}` : ""}`}
      className={`relative flex flex-col justify-between overflow-hidden p-3 ${frame} ${s.soft}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
      <p
        className={`ml-2 font-serif leading-tight ${detail ? "text-base" : "text-sm"} ${s.text}`}
      >
        {title}
      </p>
      {author && (
        <p className="ml-2 text-[11px] leading-tight text-muted">{author}</p>
      )}
    </div>
  );
}
