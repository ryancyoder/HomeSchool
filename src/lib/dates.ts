/**
 * `day_date` arrives as a bare "YYYY-MM-DD". Passing that to `new Date()`
 * parses it as UTC midnight, which renders as the previous day for anyone west
 * of Greenwich, so every conversion here goes through explicit local parts.
 */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatLong(iso: string): string {
  const d = parseDay(iso);
  return `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

export function formatShort(iso: string): string {
  const d = parseDay(iso);
  return `${MONTH[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function formatWeekday(iso: string): string {
  return WEEKDAY[parseDay(iso).getDay()];
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH[month]} ${year}`;
}
