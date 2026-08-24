"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DailyNotes({
  studentId,
  schoolDayId,
  initialNotes,
  signedOff,
}: {
  studentId: string;
  schoolDayId: string;
  initialNotes: string;
  signedOff: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (notes === initialNotes && state === "idle") return;
    setState("saving");

    const supabase = createClient();
    const { error } = await supabase.from("hs_daily_logs").upsert(
      {
        student_id: studentId,
        school_day_id: schoolDayId,
        notes,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "student_id,school_day_id" },
    );

    setState(error ? "error" : "saved");
  }

  return (
    <section className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Narration</h2>
        {signedOff && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
            Signed off
          </span>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setState("idle");
        }}
        onBlur={save}
        rows={3}
        placeholder="Tell back what you read today, in your own words."
        className="mt-2 w-full resize-y rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/40"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-background"
        >
          Save
        </button>
        <span className="text-xs text-muted">
          {state === "saving" && "Saving…"}
          {state === "saved" && "Saved"}
          {state === "error" && "Could not save — try again."}
        </span>
      </div>
    </section>
  );
}
