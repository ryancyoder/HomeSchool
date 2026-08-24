"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseDelimited, rowsToLessons } from "@/lib/csv";
import { formatShort } from "@/lib/dates";
import type { Course, Lesson, SchoolDay } from "@/lib/types";

type Draft = {
  id: string | null;
  title: string;
  reading: string;
  assignment: string;
  minutes: string;
};

const EMPTY: Draft = { id: null, title: "", reading: "", assignment: "", minutes: "" };

export default function PlanEditor({
  course,
  initialLessons,
  days,
  totalDays,
}: {
  course: Course;
  initialLessons: Lesson[];
  days: SchoolDay[];
  totalDays: number;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const out: Record<number, Draft> = {};
    for (const l of initialLessons) {
      out[l.day_number] = {
        id: l.id,
        title: l.title,
        reading: l.reading ?? "",
        assignment: l.assignment ?? "",
        minutes: l.estimated_minutes?.toString() ?? "",
      };
    }
    return out;
  });
  const [saving, setSaving] = useState<Record<number, "saving" | "saved" | "error">>({});
  const [showImport, setShowImport] = useState(false);
  const [onlyPlanned, setOnlyPlanned] = useState(false);

  const dayInfo = useMemo(
    () => new Map(days.map((d) => [d.day_number, d])),
    [days],
  );

  const dayNumbers = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => i + 1),
    [totalDays],
  );

  const plannedCount = Object.values(drafts).filter((d) => d.title.trim()).length;

  function update(day: number, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [day]: { ...(prev[day] ?? EMPTY), ...patch } }));
    setSaving((prev) => ({ ...prev, [day]: undefined as never }));
  }

  async function saveDay(day: number) {
    const draft = drafts[day];
    if (!draft) return;

    const original = initialLessons.find((l) => l.day_number === day);
    const minutes = draft.minutes.trim() ? Number(draft.minutes) : null;
    const supabase = createClient();

    // An emptied title removes the lesson for that day entirely.
    if (!draft.title.trim()) {
      if (!draft.id) return;
      setSaving((p) => ({ ...p, [day]: "saving" }));
      const { error } = await supabase.from("hs_lessons").delete().eq("id", draft.id);
      setSaving((p) => ({ ...p, [day]: error ? "error" : "saved" }));
      if (!error) {
        setDrafts((prev) => ({ ...prev, [day]: { ...EMPTY } }));
        router.refresh();
      }
      return;
    }

    const unchanged =
      original &&
      original.title === draft.title &&
      (original.reading ?? "") === draft.reading &&
      (original.assignment ?? "") === draft.assignment &&
      (original.estimated_minutes ?? null) === minutes;
    if (unchanged && draft.id) return;

    setSaving((p) => ({ ...p, [day]: "saving" }));

    const payload = {
      course_id: course.id,
      day_number: day,
      title: draft.title.trim(),
      reading: draft.reading.trim() || null,
      assignment: draft.assignment.trim() || null,
      estimated_minutes: Number.isFinite(minutes as number) ? minutes : null,
    };

    const { data, error } = draft.id
      ? await supabase.from("hs_lessons").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("hs_lessons").insert(payload).select("id").single();

    if (error) {
      setSaving((p) => ({ ...p, [day]: "error" }));
      return;
    }

    setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], id: data.id } }));
    setSaving((p) => ({ ...p, [day]: "saved" }));
    router.refresh();
  }

  const visibleDays = onlyPlanned
    ? dayNumbers.filter((d) => drafts[d]?.title.trim())
    : dayNumbers;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">
        <p className="text-sm">
          <span className="font-medium">{plannedCount}</span>{" "}
          <span className="text-muted">of {totalDays} days planned</span>
        </p>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyPlanned}
            onChange={(e) => setOnlyPlanned(e.target.checked)}
            className="size-4"
          />
          Show only planned days
        </label>

        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-background"
        >
          {showImport ? "Hide import" : "Paste / import a plan"}
        </button>
      </div>

      {showImport && (
        <ImportPanel
          courseId={course.id}
          onDone={() => {
            setShowImport(false);
            router.refresh();
            window.location.reload();
          }}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-card">
            <tr className="border-b border-line text-left text-xs font-medium text-muted">
              <th className="w-24 px-3 py-2">Day</th>
              <th className="px-3 py-2">Lesson</th>
              <th className="px-3 py-2">Reading</th>
              <th className="px-3 py-2">Assignment</th>
              <th className="w-16 px-3 py-2">Min</th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibleDays.map((day) => {
              const draft = drafts[day] ?? EMPTY;
              const info = dayInfo.get(day);
              const status = saving[day];
              return (
                <tr key={day} className="border-b border-line last:border-0 bg-card align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium">Day {day}</div>
                    <div className="text-xs text-muted">
                      {info ? `Wk ${info.week_number} · ${formatShort(info.day_date)}` : "—"}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <Field
                      value={draft.title}
                      placeholder="Lesson title"
                      onChange={(v) => update(day, { title: v })}
                      onBlur={() => saveDay(day)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Field
                      value={draft.reading}
                      placeholder="Pages / chapters"
                      onChange={(v) => update(day, { reading: v })}
                      onBlur={() => saveDay(day)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Field
                      value={draft.assignment}
                      placeholder="Problems / writing"
                      onChange={(v) => update(day, { assignment: v })}
                      onBlur={() => saveDay(day)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Field
                      value={draft.minutes}
                      placeholder="45"
                      inputMode="numeric"
                      onChange={(v) => update(day, { minutes: v })}
                      onBlur={() => saveDay(day)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted">
                    {status === "saving" && "…"}
                    {status === "saved" && (
                      <span className="text-emerald-600 dark:text-emerald-400">saved</span>
                    )}
                    {status === "error" && (
                      <span className="text-rose-600 dark:text-rose-400">error</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleDays.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Nothing planned yet for this course.
        </p>
      )}
    </div>
  );
}

function Field({
  value,
  placeholder,
  onChange,
  onBlur,
  inputMode,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  inputMode?: "numeric";
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full rounded-md border border-transparent bg-background px-2 py-1.5 outline-none transition focus:border-line focus:ring-2 focus:ring-sky-500/30"
    />
  );
}

function ImportPanel({
  courseId,
  onDone,
}: {
  courseId: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function run() {
    setBusy(true);
    setResult(null);
    setErrors([]);

    const { lessons, errors } = rowsToLessons(parseDelimited(text));
    if (lessons.length === 0) {
      setErrors(errors.length ? errors : ["Nothing could be read from that."]);
      setBusy(false);
      return;
    }

    const supabase = createClient();

    if (replace) {
      const { error } = await supabase.from("hs_lessons").delete().eq("course_id", courseId);
      if (error) {
        setErrors([`Could not clear the old plan: ${error.message}`]);
        setBusy(false);
        return;
      }
    }

    const { error } = await supabase
      .from("hs_lessons")
      .insert(lessons.map((l) => ({ ...l, course_id: courseId })));

    setBusy(false);

    if (error) {
      setErrors([error.message]);
      return;
    }

    setResult(`Imported ${lessons.length} lessons.`);
    if (errors.length) setErrors(errors);
    setTimeout(onDone, 900);
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="font-medium">Paste a plan</h2>
      <p className="mt-1 text-sm text-muted">
        One row per school day, copied from a spreadsheet or typed as CSV.
        Columns: <code className="font-mono text-xs">day, title, reading, assignment, minutes</code>.
        A header row is optional.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"day,title,reading,assignment,minutes\n1,Course intro,Preface,Set up your notebook,30\n2,The Puritan mind,\"Bradford, Of Plymouth Plantation ch. 1-2\",Reading response,45"}
        className="mt-3 w-full resize-y rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-sky-500/40"
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="size-4"
          />
          Replace the existing plan for this course
        </label>

        <button
          type="button"
          onClick={run}
          disabled={busy || !text.trim()}
          className="ml-auto rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </div>

      {result && (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{result}</p>
      )}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-rose-600 dark:text-rose-400">
          {errors.slice(0, 8).map((e, i) => (
            <li key={i}>{e}</li>
          ))}
          {errors.length > 8 && <li>…and {errors.length - 8} more.</li>}
        </ul>
      )}
    </div>
  );
}
