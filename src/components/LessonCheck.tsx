"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { swatch } from "@/lib/theme";
import type { LessonWithState } from "@/lib/types";

type Props = {
  lesson: LessonWithState;
  studentId: string;
  /** A parent viewing a student's list can tick items too. */
  canCheck: boolean;
  showCourse?: boolean;
  showDay?: boolean;
};

export default function LessonCheck({
  lesson,
  studentId,
  canCheck,
  showCourse = true,
  showDay = false,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(lesson.completion?.done ?? false);
  const [note, setNote] = useState(lesson.completion?.student_note ?? "");
  const [saving, setSaving] = useState(false);
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const s = swatch(lesson.course.color);

  /**
   * Both the tick and the narration live on one row, so every write sends both
   * fields. Sending only one would let the insert branch of the upsert fall
   * back to the column default — writing a narration on an unticked reading
   * would silently mark it done.
   */
  async function save(nextDone: boolean, nextNote: string) {
    const supabase = createClient();
    return supabase.from("hs_completions").upsert(
      {
        lesson_id: lesson.id,
        student_id: studentId,
        done: nextDone,
        student_note: nextNote.trim() || null,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id,student_id" },
    );
  }

  async function toggle() {
    if (!canCheck || saving) return;

    const next = !done;
    setDone(next);           // optimistic
    setSaving(true);
    setError(null);

    const { error } = await save(next, note);
    setSaving(false);

    if (error) {
      setDone(!next);        // roll back
      setError("Could not save — try again.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function saveNote() {
    if (!canCheck) return;
    if (note === (lesson.completion?.student_note ?? "")) return;

    setNoteState("saving");
    const { error } = await save(done, note);
    setNoteState(error ? "error" : "saved");
    if (!error) startTransition(() => router.refresh());
  }

  return (
    <li
      className={`rounded-xl border transition ${
        done
          ? "border-line bg-card/50"
          : `border-line bg-card ${s.ring} hover:ring-2`
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={toggle}
          disabled={!canCheck}
          aria-pressed={done}
          aria-label={done ? `Mark ${lesson.title} not done` : `Mark ${lesson.title} done`}
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${
            done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-stone-300 hover:border-stone-500 dark:border-stone-600"
          } ${canCheck ? "cursor-pointer" : "cursor-default opacity-60"}`}
        >
          {done && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {showCourse && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}>
                {lesson.course.short_name ?? lesson.course.name}
              </span>
            )}
            {showDay && (
              <span className="text-xs text-muted">Day {lesson.day_number}</span>
            )}
            {lesson.estimated_minutes != null && (
              <span className="text-xs text-muted">{lesson.estimated_minutes} min</span>
            )}
          </div>

          <p
            className={`mt-1 font-medium leading-snug ${
              done ? "line-through decoration-stone-400" : ""
            }`}
          >
            {lesson.title}
          </p>

          {lesson.description && (
            <p className="mt-1 text-sm text-muted">{lesson.description}</p>
          )}

          {lesson.reading && (
            <p className="mt-2 text-sm">
              <span className="font-medium text-muted">Read:</span> {lesson.reading}
            </p>
          )}

          {lesson.assignment && (
            <p className="mt-1 text-sm">
              <span className="font-medium text-muted">Do:</span> {lesson.assignment}
            </p>
          )}

          {canCheck && (
            <div className="mt-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Narration</span>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteState("idle");
                  }}
                  onBlur={saveNote}
                  rows={2}
                  placeholder="Retell in your own words what you read"
                  className="mt-1 w-full resize-y rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>
              <span className="text-xs text-muted">
                {noteState === "saving" && "Saving…"}
                {noteState === "saved" && "Saved"}
                {noteState === "error" && "Could not save — try again."}
              </span>
            </div>
          )}

          {!canCheck && note && (
            <p className="mt-3 rounded-lg bg-background px-3 py-2 text-sm">
              <span className="font-medium text-muted">Narration:</span> {note}
            </p>
          )}

          {lesson.completion?.parent_verified && (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Checked by parent
              {lesson.completion.grade ? ` · ${lesson.completion.grade}` : ""}
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </div>
      </div>
    </li>
  );
}
