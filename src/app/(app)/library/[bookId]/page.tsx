import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBookWithNarrations, getViewer } from "@/lib/data";
import { formatShort } from "@/lib/dates";
import { swatch } from "@/lib/theme";
import BookCover from "@/components/BookCover";
import Linkify from "@/components/Linkify";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { bookId } = await params;
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);
  if (!viewer.student) notFound();

  const { book, narrations } = await getBookWithNarrations(
    bookId,
    viewer.student.id,
  );
  if (!book) notFound();

  const s = swatch(book.course_color);
  const pct =
    book.reading_days === 0
      ? 0
      : Math.round((book.days_done / book.reading_days) * 100);
  const studentQs = sp.student ? `?student=${sp.student}` : "";

  async function saveBook(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase
      .from("hs_books")
      .update({
        author: String(formData.get("author")).trim() || null,
        cover_url: String(formData.get("cover_url")).trim() || null,
      })
      .eq("id", String(formData.get("book_id")));
    if (error) redirect(`/library/${bookId}?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect(`/library/${bookId}`);
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/library${studentQs}`}
        className="text-sm text-muted transition hover:text-foreground"
      >
        &larr; Library
      </Link>

      <div className="flex flex-wrap gap-6">
        <div className="w-32 shrink-0 sm:w-40">
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.cover_url}
            color={book.course_color}
            size="detail"
          />
        </div>

        <div className="min-w-56 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{book.title}</h1>
          {book.author && <p className="text-muted">{book.author}</p>}
          <p className="mt-1 text-sm text-muted">
            {viewer.student.name} &middot; {book.course_name}
            {book.first_day && book.last_day
              ? ` · days ${book.first_day}–${book.last_day}`
              : ""}
          </p>

          <div className="mt-4 max-w-sm">
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className={`h-full rounded-full ${s.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {book.days_done} of {book.reading_days} reading days &middot;{" "}
              {book.narrations}{" "}
              {book.narrations === 1 ? "narration" : "narrations"} written
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted">
          {book.notes_label}s for this book
        </h2>

        {narrations.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            Nothing written yet. {book.notes_label}s appear here as they are
            added on each reading day.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {narrations.map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/today?day=${n.day_number}${
                      sp.student ? `&student=${sp.student}` : ""
                    }`}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Day {n.day_number}
                  </Link>
                  <span className="text-xs text-muted">
                    {formatShort(n.note_written_at.slice(0, 10))}
                  </span>
                </div>

                {n.reading && (
                  <p className="mt-1 text-xs text-muted">
                    <Linkify text={n.reading} />
                  </p>
                )}

                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {n.student_note}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {viewer.isParent && (
        <details className="rounded-xl border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Edit this book
          </summary>
          <form action={saveBook} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="book_id" value={book.id} />
            <label className="block min-w-48 flex-1">
              <span className="text-xs font-medium text-muted">Author</span>
              <input
                name="author"
                defaultValue={book.author ?? ""}
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <label className="block min-w-64 flex-[2]">
              <span className="text-xs font-medium text-muted">Cover image URL</span>
              <input
                name="cover_url"
                defaultValue={book.cover_url ?? ""}
                placeholder="https://covers.openlibrary.org/b/isbn/…-L.jpg"
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
            >
              Save
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Leave the cover blank to keep the printed-title placeholder.
          </p>
        </details>
      )}
    </div>
  );
}
