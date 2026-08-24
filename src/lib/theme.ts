/**
 * Tailwind can only see class names that appear literally in the source, so
 * every course colour is spelled out here rather than interpolated.
 */
type Swatch = {
  chip: string;
  dot: string;
  bar: string;
  ring: string;
  soft: string;
  text: string;
};

export const COURSE_COLORS: Record<string, Swatch> = {
  amber: {
    chip: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    ring: "ring-amber-500/30",
    soft: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    soft: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200",
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    ring: "ring-indigo-500/30",
    soft: "bg-indigo-50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  rose: {
    chip: "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    ring: "ring-rose-500/30",
    soft: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
  },
  sky: {
    chip: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    ring: "ring-sky-500/30",
    soft: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-300",
  },
  fuchsia: {
    chip: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
    dot: "bg-fuchsia-500",
    bar: "bg-fuchsia-500",
    ring: "ring-fuchsia-500/30",
    soft: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  teal: {
    chip: "bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-200",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
    ring: "ring-teal-500/30",
    soft: "bg-teal-50 dark:bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-300",
  },
  violet: {
    chip: "bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-200",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    ring: "ring-violet-500/30",
    soft: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
  },
  blue: {
    chip: "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    ring: "ring-blue-500/30",
    soft: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  slate: {
    chip: "bg-slate-100 text-slate-900 dark:bg-slate-500/15 dark:text-slate-200",
    dot: "bg-slate-500",
    bar: "bg-slate-500",
    ring: "ring-slate-500/30",
    soft: "bg-slate-50 dark:bg-slate-500/10",
    text: "text-slate-700 dark:text-slate-300",
  },
};

export const COLOR_NAMES = Object.keys(COURSE_COLORS);

export function swatch(color: string | null | undefined): Swatch {
  return COURSE_COLORS[color ?? "slate"] ?? COURSE_COLORS.slate;
}
