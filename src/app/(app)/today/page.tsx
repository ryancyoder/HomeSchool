import Link from "next/link";
import {
  computePace,
  getLessonsForDays,
  getNextUnfinishedDay,
  getSchoolDays,
  getViewer,
} from "@/lib/data";
import { formatLong, todayISO } from "@/lib/dates";
import { EmptyPlan, ProgressBar } from "@/components/Progress";
import LessonCheck from "@/components/LessonCheck";
import PaceChip from "@/components/PaceChip";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; day?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);

  if (!viewer.student) {
    return <EmptyPlan message="No students on the roster yet." />;
  }

  const days = await getSchoolDays(viewer.year.id);
  if (days.length === 0)
    return <EmptyPlan message="The school calendar has not been built yet." />;

  const today = todayISO();
  const nextUnfinished = await getNextUnfinishedDay(viewer.student.id);
  const pace = computePace(days, today, nextUnfinished);

  // An explicit ?day= wins so the arrows and calendar links still work;
  // otherwise land on the first day with unfinished work rather than on the
  // calendar date, which may be days ahead of where the student actually is.
  const requested = sp.day ? Number(sp.day) : null;
  const day =
    (requested ? days.find((d) => d.day_number === requested) : null) ??
    days.find((d) => d.day_number === pace.workingDay) ??
    days[days.length - 1];

  const lessons = await getLessonsForDays(viewer.student.id, viewer.year.id, [
    day.day_number,
  ]);
  const doneCount = lessons.filter((l) => l.completion?.done).length;

  const isToday = day.day_date === today;
  const calendarDay = pace.calendarDay;
  const showJumpToToday = calendarDay !== null && day.day_number !== calendarDay;

  const prev = days.find((d) => d.day_number === day.day_number - 1);
  const next = days.find((d) => d.day_number === day.day_number + 1);
  const qs = (n: number) =>
    `/today?day=${n}${sp.student ? `&student=${sp.student}` : ""}`;

  const heading = isToday
    ? "Today"
    : calendarDay !== null && day.day_number < calendarDay
      ? "Catching up"
      : calendarDay !== null && day.day_number > calendarDay
        ? "Working ahead"
        : "School day";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted">
              {heading} &middot; Day {day.day_number} of {viewer.year.total_days}{" "}
              &middot; Week {day.week_number}
            </p>
            <PaceChip pace={pace} />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {formatLong(day.day_date)}
          </h1>

          {showJumpToToday && (
            <p className="no-print mt-1 text-sm text-muted">
              The calendar is on day {calendarDay}.{" "}
              <Link
                href={qs(calendarDay)}
                className="underline underline-offset-4 transition hover:text-foreground"
              >
                Jump there
              </Link>
            </p>
          )}
        </div>

        <nav className="no-print flex gap-2 text-sm">
          {prev && (
            <Link
              href={qs(prev.day_number)}
              className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
            >
              &larr; Day {prev.day_number}
            </Link>
          )}
          {next && (
            <Link
              href={qs(next.day_number)}
              className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
            >
              Day {next.day_number} &rarr;
            </Link>
          )}
        </nav>
      </div>

      {lessons.length > 0 && (
        <div className="rounded-xl border border-line bg-card p-4">
          <ProgressBar
            done={doneCount}
            total={lessons.length}
            color={viewer.student.color}
          />
          {doneCount === lessons.length && (
            <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {pace.finished
                ? "Everything in the year is finished. Well done."
                : `Day ${day.day_number} is all checked off.`}{" "}
              {next && !pace.finished && (
                <Link
                  href={qs(next.day_number)}
                  className="underline underline-offset-4"
                >
                  Start day {next.day_number}
                </Link>
              )}
            </p>
          )}
        </div>
      )}

      {lessons.length === 0 ? (
        <EmptyPlan message="Nothing is scheduled for this day yet." />
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <LessonCheck
              key={lesson.id}
              lesson={lesson}
              studentId={viewer.student!.id}
              canCheck
            />
          ))}
        </ul>
      )}
    </div>
  );
}
