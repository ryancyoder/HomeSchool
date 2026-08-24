import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getNarrationWatermark,
  getNarrations,
  getViewer,
} from "@/lib/data";
import { swatch } from "@/lib/theme";
import { EmptyPlan } from "@/components/Progress";

function whenWritten(iso: string): string {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export default async function NarrationsPage() {
  const viewer = await getViewer();
  if (!viewer.isParent) redirect("/today");

  // Read before marking, so this render still shows what was new.
  const watermark = await getNarrationWatermark();
  const entries = await getNarrations();
  const unreadCount = entries.filter(
    (e) => !watermark || e.note_written_at > watermark,
  ).length;

  async function markRead() {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.rpc("hs_mark_narrations_read");
    if (error) redirect(`/parent/narrations?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/parent/narrations");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/parent"
            className="text-sm text-muted transition hover:text-foreground"
          >
            &larr; Parent dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Narrations</h1>
          <p className="text-sm text-muted">
            {unreadCount > 0
              ? `${unreadCount} new since you last looked`
              : "Nothing new since you last looked"}
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markRead}>
            <button
              type="submit"
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyPlan message="No narrations have been written yet." />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            const isNew = !watermark || entry.note_written_at > watermark;
            const s = swatch(entry.course_color);
            return (
              <li
                key={entry.id}
                className={`rounded-xl border bg-card p-4 ${
                  isNew ? `border-line ring-2 ${s.ring}` : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {isNew && (
                    <span className="size-2 shrink-0 rounded-full bg-rose-600" />
                  )}
                  <span className="font-medium">{entry.student_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}
                  >
                    {entry.course_name}
                  </span>
                  <span className="text-xs text-muted">
                    Day {entry.day_number} &middot; {entry.lesson_title}
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {whenWritten(entry.note_written_at)}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {entry.student_note}
                </p>
                <p className="mt-1 text-xs text-muted">{entry.notes_label}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
