import Link from "next/link";
import { getLibrary, getViewer } from "@/lib/data";
import { swatch } from "@/lib/theme";
import { EmptyPlan } from "@/components/Progress";
import BookCover from "@/components/BookCover";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);
  if (!viewer.student) return <EmptyPlan message="No students on the roster yet." />;

  const books = await getLibrary(viewer.student.id, viewer.year.id);
  const totalNarrations = books.reduce((n, b) => n + b.narrations, 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">
          {viewer.student.name} &middot; {viewer.year.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        {books.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {books.length} {books.length === 1 ? "book" : "books"} &middot;{" "}
            {totalNarrations} {totalNarrations === 1 ? "narration" : "narrations"}{" "}
            written
          </p>
        )}
      </div>

      {books.length === 0 ? (
        <EmptyPlan message="No books on the shelf yet. A parent can add them from School settings." />
      ) : (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => {
            const s = swatch(book.course_color);
            const pct =
              book.reading_days === 0
                ? 0
                : Math.round((book.days_done / book.reading_days) * 100);
            return (
              <li key={book.id}>
                <Link
                  href={`/library/${book.id}${sp.student ? `?student=${sp.student}` : ""}`}
                  className="group block"
                >
                  <div className="transition group-hover:-translate-y-0.5">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.cover_url}
                      color={book.course_color}
                    />
                  </div>

                  <p className="mt-2 text-sm font-medium leading-snug">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="text-xs text-muted">{book.author}</p>
                  )}

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                    <div
                      className={`h-full rounded-full ${s.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {book.days_done}/{book.reading_days} days
                    {book.narrations > 0 && ` · ${book.narrations} written`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
