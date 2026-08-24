import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCourseProgress,
  getCourses,
  getLessonsForDays,
  getSchoolDays,
  getViewer,
  pickCurrentDay,
} from "@/lib/data";
import { formatLong, todayISO } from "@/lib/dates";
import { swatch } from "@/lib/theme";
import { ProgressBar } from "@/components/Progress";
import type { Student } from "@/lib/types";

export default async function ParentPage() {
  const viewer = await getViewer();
  if (!viewer.isParent) redirect("/today");

  const days = await getSchoolDays(viewer.year.id);
  const current = pickCurrentDay(days, todayISO());
  const weekDays = current
    ? days.filter((d) => d.week_number === current.week_number)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {current
              ? `${formatLong(current.day_date)} · Day ${current.day_number} · Week ${current.week_number}`
              : viewer.year.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Parent dashboard</h1>
        </div>
        <Link
          href="/parent/settings"
          className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-card"
        >
          School settings
        </Link>
      </div>

      {viewer.students.map((student) => (
        <StudentPanel
          key={student.id}
          student={student}
          yearId={viewer.year.id}
          todayDayNumber={current?.day_number ?? null}
          weekDayNumbers={weekDays.map((d) => d.day_number)}
          weekNumber={current?.week_number ?? 1}
        />
      ))}

      {viewer.students.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          No students yet. Add them in{" "}
          <Link href="/parent/settings" className="underline underline-offset-4">
            school settings
          </Link>
          .
        </p>
      )}
    </div>
  );
}

async function StudentPanel({
  student,
  yearId,
  todayDayNumber,
  weekDayNumbers,
  weekNumber,
}: {
  student: Student;
  yearId: string;
  todayDayNumber: number | null;
  weekDayNumbers: number[];
  weekNumber: number;
}) {
  const supabase = await createClient();
  const courses = await getCourses(student.id, yearId);
  const progress = await getCourseProgress(student.id, courses.map((c) => c.id));

  const todayLessons = todayDayNumber
    ? await getLessonsForDays(student.id, yearId, [todayDayNumber])
    : [];
  const weekLessons = await getLessonsForDays(student.id, yearId, weekDayNumbers);

  // Narrations now hang off each reading rather than off the day.
  const { data: recentNarrations } = await supabase
    .from("hs_completions")
    .select(
      "id, student_note, completed_at, hs_lessons(day_number, title, hs_courses(name))",
    )
    .eq("student_id", student.id)
    .not("student_note", "is", null)
    .neq("student_note", "")
    .order("completed_at", { ascending: false })
    .limit(3);

  const s = swatch(student.color);
  const todayDone = todayLessons.filter((l) => l.completion?.done).length;
  const weekDone = weekLessons.filter((l) => l.completion?.done).length;

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`size-3 rounded-full ${s.dot}`} />
        <h2 className="text-lg font-semibold">{student.name}</h2>
        {student.grade && <span className="text-sm text-muted">{student.grade}</span>}
        {!student.user_id && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            No login yet
          </span>
        )}
        <div className="ml-auto flex gap-2 text-sm">
          <Link
            href={`/today?student=${student.id}`}
            className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-background"
          >
            Their day
          </Link>
          <Link
            href={`/week?student=${student.id}`}
            className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-background"
          >
            Their week
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs font-medium text-muted">Today</p>
          <div className="mt-2">
            <ProgressBar done={todayDone} total={todayLessons.length} color={student.color} />
          </div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs font-medium text-muted">Week {weekNumber}</p>
          <div className="mt-2">
            <ProgressBar done={weekDone} total={weekLessons.length} color={student.color} />
          </div>
        </div>
      </div>

      <h3 className="mt-5 text-sm font-medium text-muted">Courses</h3>
      <ul className="mt-2 divide-y divide-[color:var(--border)] rounded-xl border border-line">
        {courses.map((course) => {
          const p = progress.get(course.id) ?? { total: 0, done: 0 };
          return (
            <li key={course.id} className="flex flex-wrap items-center gap-3 p-3">
              <span className={`size-2.5 shrink-0 rounded-full ${swatch(course.color).dot}`} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {course.name}
              </span>
              <span className="text-xs text-muted">
                {p.total === 0 ? "no lessons planned" : `${p.done}/${p.total}`}
              </span>
              <Link
                href={`/parent/plan/${course.id}`}
                className="rounded-lg border border-line px-2.5 py-1 text-xs transition hover:bg-background"
              >
                Plan lessons
              </Link>
            </li>
          );
        })}
        {courses.length === 0 && (
          <li className="p-3 text-sm text-muted">No courses for this student.</li>
        )}
      </ul>

      {recentNarrations && recentNarrations.length > 0 && (
        <>
          <h3 className="mt-5 flex items-center gap-2 text-sm font-medium text-muted">
            Recent narrations
            <Link
              href="/parent/narrations"
              className="font-normal underline underline-offset-4 transition hover:text-foreground"
            >
              see all
            </Link>
          </h3>
          <ul className="mt-2 space-y-2">
            {recentNarrations.map((entry) => {
              const lesson = entry.hs_lessons as unknown as {
                day_number: number;
                title: string;
                hs_courses: { name: string } | null;
              } | null;
              return (
                <li key={entry.id} className="rounded-xl border border-line p-3 text-sm">
                  <p className="text-xs text-muted">
                    {lesson
                      ? `Day ${lesson.day_number} · ${lesson.hs_courses?.name ?? ""} · ${lesson.title}`
                      : "—"}
                  </p>
                  <p className="mt-1">{entry.student_note}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
