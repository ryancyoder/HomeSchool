import Link from "next/link";
import {
  getLessonsForDays,
  getSchoolDays,
  getViewer,
  pickCurrentDay,
} from "@/lib/data";
import { formatShort, formatWeekday, todayISO } from "@/lib/dates";
import { swatch } from "@/lib/theme";
import { EmptyPlan, ProgressBar } from "@/components/Progress";
import LessonCheck from "@/components/LessonCheck";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; week?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);

  if (!viewer.student) return <EmptyPlan message="No students on the roster yet." />;

  const days = await getSchoolDays(viewer.year.id);
  if (days.length === 0)
    return <EmptyPlan message="The school calendar has not been built yet." />;

  const lastWeek = days[days.length - 1].week_number;
  const currentWeek = pickCurrentDay(days, todayISO())?.week_number ?? 1;
  const week = Math.min(
    Math.max(sp.week ? Number(sp.week) : currentWeek, 1),
    lastWeek,
  );

  const weekDays = days.filter((d) => d.week_number === week);
  const lessons = await getLessonsForDays(
    viewer.student.id,
    viewer.year.id,
    weekDays.map((d) => d.day_number),
  );

  const byDay = new Map(weekDays.map((d) => [d.day_number, [] as typeof lessons]));
  for (const l of lessons) byDay.get(l.day_number)?.push(l);

  // Per-subject totals give the "what's coming this week" overview.
  const bySubject = new Map<
    string,
    { name: string; color: string; total: number; done: number }
  >();
  for (const l of lessons) {
    const key = l.course_id;
    const entry =
      bySubject.get(key) ??
      { name: l.course.name, color: l.course.color, total: 0, done: 0 };
    entry.total += 1;
    if (l.completion?.done) entry.done += 1;
    bySubject.set(key, entry);
  }

  const doneCount = lessons.filter((l) => l.completion?.done).length;
  const qs = (n: number) =>
    `/week?week=${n}${sp.student ? `&student=${sp.student}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            Week {week} of {lastWeek}
            {weekDays.length > 0 &&
              ` · ${formatShort(weekDays[0].day_date)} – ${formatShort(
                weekDays[weekDays.length - 1].day_date,
              )}`}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {viewer.student.name}&rsquo;s week at a glance
          </h1>
        </div>

        <nav className="no-print flex gap-2 text-sm">
          {week > 1 && (
            <Link
              href={qs(week - 1)}
              className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
            >
              &larr; Week {week - 1}
            </Link>
          )}
          {week < lastWeek && (
            <Link
              href={qs(week + 1)}
              className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
            >
              Week {week + 1} &rarr;
            </Link>
          )}
        </nav>
      </div>

      {lessons.length === 0 ? (
        <EmptyPlan message="Nothing is planned for this week yet." />
      ) : (
        <>
          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="text-sm font-medium text-muted">This week by subject</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {[...bySubject.values()].map((s) => (
                <div key={s.name}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${swatch(s.color).dot}`} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar done={s.done} total={s.total} color={s.color} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <ProgressBar
                done={doneCount}
                total={lessons.length}
                color={viewer.student.color}
              />
            </div>
          </section>

          <div className="space-y-6">
            {weekDays.map((d) => {
              const items = byDay.get(d.day_number) ?? [];
              return (
                <section key={d.id}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h2 className="font-semibold">{formatWeekday(d.day_date)}</h2>
                    <span className="text-sm text-muted">
                      {formatShort(d.day_date)} &middot; Day {d.day_number}
                    </span>
                    {d.day_date === todayISO() && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-500/15 dark:text-sky-200">
                        Today
                      </span>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                      Nothing scheduled.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((lesson) => (
                        <LessonCheck
                          key={lesson.id}
                          lesson={lesson}
                          studentId={viewer.student!.id}
                          canCheck
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
