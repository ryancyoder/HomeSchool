import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseLessons, getSchoolDays, getViewer } from "@/lib/data";
import { formatShort, todayISO } from "@/lib/dates";
import { swatch } from "@/lib/theme";
import Linkify from "@/components/Linkify";
import { EmptyPlan, ProgressBar } from "@/components/Progress";
import type { Course } from "@/lib/types";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);
  if (!viewer.student) return <EmptyPlan message="No students on the roster yet." />;

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("hs_courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) notFound();
  const c = course as Course;

  const { lessons, completions } = await getCourseLessons(c.id, viewer.student.id);
  const days = await getSchoolDays(viewer.year.id);
  const dayInfo = new Map(days.map((d) => [d.day_number, d]));
  const s = swatch(c.color);
  const done = lessons.filter((l) => completions.get(l.id)?.done).length;
  const today = todayISO();

  // Group the whole year into weeks so 180 days stays scannable.
  const byWeek = new Map<number, typeof lessons>();
  for (const lesson of lessons) {
    const week = dayInfo.get(lesson.day_number)?.week_number ?? 0;
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week)!.push(lesson);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses${sp.student ? `?student=${sp.student}` : ""}`}
          className="no-print text-sm text-muted transition hover:text-foreground"
        >
          &larr; All subjects
        </Link>
        <div className="mt-2 flex items-start gap-2">
          <span className={`mt-2.5 size-3 shrink-0 rounded-full ${s.dot}`} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <p className="text-sm text-muted">
              {viewer.student.name}
              {c.textbook ? ` · ${c.textbook}` : ""}
              {c.credits != null
                ? ` · ${c.credits} credit${Number(c.credits) === 1 ? "" : "s"}`
                : ""}
              {c.last_day - c.first_day + 1 < viewer.year.total_days &&
                ` · days ${c.first_day}–${c.last_day}`}
            </p>
          </div>
        </div>
      </div>

      {lessons.length === 0 ? (
        <EmptyPlan message="No lessons have been planned for this course yet." />
      ) : (
        <>
          <div className="rounded-xl border border-line bg-card p-4">
            <ProgressBar done={done} total={lessons.length} color={c.color} />
          </div>

          <div className="space-y-8">
            {[...byWeek.entries()].map(([week, items]) => (
              <section key={week}>
                <h2 className="sticky top-28 z-10 -mx-1 bg-background/90 px-1 py-1 text-sm font-semibold text-muted backdrop-blur">
                  Week {week}
                </h2>

                <div className="mt-2 overflow-hidden rounded-xl border border-line">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {items.map((lesson) => {
                        const info = dayInfo.get(lesson.day_number);
                        const isDone = completions.get(lesson.id)?.done ?? false;
                        return (
                          <tr
                            key={lesson.id}
                            className={`border-b border-line last:border-0 ${
                              isDone ? "bg-emerald-50/60 dark:bg-emerald-500/5" : "bg-card"
                            } ${info?.day_date === today ? "ring-1 ring-inset ring-sky-500/40" : ""}`}
                          >
                            <td className="w-24 whitespace-nowrap px-3 py-3 align-top">
                              <Link
                                href={`/today?day=${lesson.day_number}${sp.student ? `&student=${sp.student}` : ""}`}
                                className="block"
                              >
                                <span className="font-medium">Day {lesson.day_number}</span>
                                {info && (
                                  <span className="block text-xs text-muted">
                                    {formatShort(info.day_date)}
                                  </span>
                                )}
                              </Link>
                            </td>

                            <td className="px-3 py-3 align-top">
                              <p className={`font-medium ${isDone ? "line-through decoration-stone-400" : ""}`}>
                                {lesson.title}
                              </p>
                              {lesson.description && (
                                <p className="mt-0.5 text-muted">
                                  <Linkify text={lesson.description} />
                                </p>
                              )}
                              {lesson.reading && (
                                <p className="mt-1">
                                  <span className="font-medium text-muted">Read:</span>{" "}
                                  <Linkify text={lesson.reading} />
                                </p>
                              )}
                              {lesson.assignment && (
                                <p className="mt-0.5">
                                  <span className="font-medium text-muted">Do:</span>{" "}
                                  <Linkify text={lesson.assignment} />
                                </p>
                              )}
                            </td>

                            <td className="w-16 px-3 py-3 text-right align-top">
                              {isDone ? (
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                  Done
                                </span>
                              ) : (
                                <span className="text-xs text-muted">&mdash;</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
