import { swatch } from "@/lib/theme";

/**
 * A real cover when one has been set, otherwise a typographic stand-in so the
 * shelf still reads as a shelf. Plain <img> rather than next/image: covers come
 * from arbitrary hosts, which next/image would require configuring one by one.
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
  const s = swatch(color);
  const detail = size === "detail";

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        loading="lazy"
        className={`aspect-[2/3] w-full rounded-lg object-cover shadow-sm ring-1 ring-black/10 ${
          detail ? "max-w-48" : ""
        }`}
      />
    );
  }

  return (
    <div
      aria-label={`${title}${author ? ` by ${author}` : ""}`}
      className={`relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-lg p-3 shadow-sm ring-1 ring-black/10 ${s.soft} ${
        detail ? "max-w-48" : ""
      }`}
    >
      {/* spine */}
      <span className={`absolute inset-y-0 left-0 w-1.5 ${s.bar}`} />
      <p
        className={`ml-2 font-serif leading-tight ${
          detail ? "text-base" : "text-sm"
        } ${s.text}`}
      >
        {title}
      </p>
      {author && (
        <p className="ml-2 text-[11px] leading-tight text-muted">{author}</p>
      )}
    </div>
  );
}
