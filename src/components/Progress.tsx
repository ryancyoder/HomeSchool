import { swatch } from "@/lib/theme";

export function ProgressBar({
  done,
  total,
  color = "slate",
}: {
  done: number;
  total: number;
  color?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div
          className={`h-full rounded-full transition-all ${swatch(color).bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {done} of {total} done{total > 0 ? ` · ${pct}%` : ""}
      </p>
    </div>
  );
}

export function EmptyPlan({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
