import Link from "next/link";
import {
  getLessonsForDays,
  getSchoolDays,
  getViewer,
  pickCurrentDay,
} from "@/lib/data";
import { monthLabel, todayISO } from "@/lib/dates";
import { swatch } from "@/lib/theme";
import { EmptyPlan } from "@/components/Progress";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);

  if (!viewer.student) return <EmptyPlan message="No students on the roster yet." />;

  const days = await getSchoolDays(viewer.year.id);
  if (days.length === 0)
    return <EmptyPlan message="The school calendar has not been built yet." />;

  // Which month to show: the requested one, else the month of the current day.
  const anchorIso = pickCurrentDay(days, todayISO())!.day_date;
  const [anchorY, anchorM] = anchorIso.split("-").map(Number);
  const [year, month] = sp.month
    ? sp.month.split("-").map(Number)
    : [anchorY, anchorM];

  const monthDays = days.filter((d) => {
    const [y, m] = d.day_date.split("-").map(Number);
    return y === year && m === month;
  });

  const lessons = await getLessonsForDays(
    viewer.student.id,
    viewer.year.id,
    monthDays.map((d) => d.day_number),
  );

  type Cell = { total: number; done: number; colors: string[] };
  const byDay = new Map<number, Cell>();
  for (const l of lessons) {
    const cell = byDay.get(l.day_number) ?? { total: 0, done: 0, colors: [] };
    cell.total += 1;
    if (l.completion?.done) cell.done += 1;
    if (!cell.colors.includes(l.course.color)) cell.colors.push(l.course.color);
    byDay.set(l.day_number, cell);
  }

  const schoolDayByDate = new Map(monthDays.map((d) => [d.day_date, d]));

  // Build the visible grid: Monday-first, padded to whole weeks.
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const leading = (first.getDay() + 6) % 7;           // Mon = 0
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const studentQs = sp.student ? `&student=${sp.student}` : "";
  const today = todayISO();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{viewer.student.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {monthLabel(year, month - 1)}
          </h1>
        </div>

        <nav className="no-print flex gap-2 text-sm">
          <Link
            href={`/calendar?month=${prevMonth}${studentQs}`}
            className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
          >
            &larr; Prev
          </Link>
          <Link
            href={`/calendar${sp.student ? `?student=${sp.student}` : ""}`}
            className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${nextMonth}${studentQs}`}
            className="rounded-lg border border-line px-3 py-1.5 transition hover:bg-card"
          >
            Next &rarr;
          </Link>
        </nav>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-px rounded-t-xl bg-line text-center text-xs font-medium text-muted">
            {DOW.map((d) => (
              <div key={d} className="bg-background py-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-xl bg-line">
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="min-h-24 bg-background/40" />;

              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const schoolDay = schoolDayByDate.get(iso);
              const cell = schoolDay ? byDay.get(schoolDay.day_number) : undefined;
              const isToday = iso === today;

              const inner = (
                <>
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isToday
                          ? "grid size-6 place-items-center rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                          : schoolDay
                            ? ""
                            : "text-muted"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {schoolDay && (
                      <span className="text-[10px] text-muted">
                        Day {schoolDay.day_number}
                      </span>
                    )}
                  </div>

                  {cell && (
                    <>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cell.colors.map((c) => (
                          <span
                            key={c}
                            className={`size-2 rounded-full ${swatch(c).dot}`}
                          />
                        ))}
                      </div>
                      <p className="mt-auto pt-2 text-[11px] text-muted">
                        {cell.done}/{cell.total} done
                      </p>
                    </>
                  )}
                </>
              );

              return schoolDay ? (
                <Link
                  key={i}
                  href={`/today?day=${schoolDay.day_number}${studentQs}`}
                  className={`flex min-h-24 flex-col p-2 transition hover:bg-card ${
                    cell && cell.done === cell.total
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "bg-card"
                  }`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={i} className="flex min-h-24 flex-col bg-background/40 p-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted">
        Shaded days are school days. Click one to open its check-off list. Dots
        show which subjects have work scheduled.
      </p>
    </div>
  );
}
