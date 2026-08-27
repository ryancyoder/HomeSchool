import type { Pace } from "@/lib/data";

/** A short read on whether the student is keeping up with the calendar. */
export default function PaceChip({ pace }: { pace: Pace }) {
  if (pace.finished) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
        Everything finished
      </span>
    );
  }

  // Before the year begins there is nothing to be behind on.
  if (pace.calendarDay === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 dark:bg-stone-500/15 dark:text-stone-300">
        Not started yet
      </span>
    );
  }

  if (pace.behind > 0) {
    const heavy = pace.behind >= 5;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
          heavy
            ? "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200"
            : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
        }`}
      >
        {pace.behind} school {pace.behind === 1 ? "day" : "days"} behind
      </span>
    );
  }

  if (pace.behind < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900 dark:bg-sky-500/15 dark:text-sky-200">
        Caught up &middot; working ahead
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
      On schedule
    </span>
  );
}
