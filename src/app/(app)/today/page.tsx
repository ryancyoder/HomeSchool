import Link from "next/link";
import {
  getDailyLog,
  getLessonsForDays,
  getSchoolDays,
  getViewer,
  pickCurrentDay,
} from "@/lib/data";
import { formatLong, todayISO } from "@/lib/dates";
import { EmptyPlan, ProgressBar } from "@/components/Progress";
import LessonCheck from "@/components/LessonCheck";
import DailyNotes from "@/components/DailyNotes";

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
  const requested = sp.day ? Number(sp.day) : null;
  const day =
    (requested ? days.find((d) => d.day_number === requested) : null) ??
    pickCurrentDay(days, todayISO());

  if (!day) return <EmptyPlan message="The school calendar has not been built yet." />;

  const lessons = await getLessonsForDays(viewer.student.id, viewer.year.id, [
    day.day_number,
  ]);
  const log = await getDailyLog(viewer.student.id, day.id);

  const doneCount = lessons.filter((l) => l.completion?.done).length;
  const isToday = day.day_date === todayISO();

  const prev = days.find((d) => d.day_number === day.day_number - 1);
  const next = days.find((d) => d.day_number === day.day_number + 1);
  const qs = (n: number) =>
    `/today?day=${n}${sp.student ? `&student=${sp.student}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {isToday ? "Today" : "School day"} &middot; Day {day.day_number} of{" "}
            {viewer.year.total_days} &middot; Week {day.week_number}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatLong(day.day_date)}
          </h1>
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
              Everything for today is checked off. Nice work.
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

      <DailyNotes
        studentId={viewer.student.id}
        schoolDayId={day.id}
        initialNotes={log?.notes ?? ""}
        signedOff={!!log?.parent_signed_off_at}
      />
    </div>
  );
}
