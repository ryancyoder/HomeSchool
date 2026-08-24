import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSchoolDays, getViewer } from "@/lib/data";
import { COLOR_NAMES, swatch } from "@/lib/theme";
import { formatShort } from "@/lib/dates";
import type { Course } from "@/lib/types";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (!viewer.isParent) redirect("/today");

  const supabase = await createClient();
  const days = await getSchoolDays(viewer.year.id);
  const { data: code } = await supabase
    .from("hs_settings")
    .select("value")
    .eq("key", "signup_code")
    .maybeSingle();
  const { data: courses } = await supabase
    .from("hs_courses")
    .select("*")
    .eq("school_year_id", viewer.year.id)
    .order("sort_order");

  const { data: people } = await supabase
    .from("hs_profiles")
    .select("id, role, display_name")
    .order("role");
  const { data: invites } = await supabase
    .from("hs_invites")
    .select("email, role, student_id, claimed_at")
    .order("email");

  const coursesByStudent = new Map<string, Course[]>();
  for (const c of (courses ?? []) as Course[]) {
    if (!coursesByStudent.has(c.student_id)) coursesByStudent.set(c.student_id, []);
    coursesByStudent.get(c.student_id)!.push(c);
  }

  async function saveYear(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("year_id"));

    const { error } = await supabase
      .from("hs_school_years")
      .update({
        name: String(formData.get("name")),
        start_date: String(formData.get("start_date")),
        total_days: Number(formData.get("total_days")),
        days_per_week: Number(formData.get("days_per_week")),
      })
      .eq("id", id);

    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);

    const skipRaw = String(formData.get("skip_dates") ?? "").trim();
    const skip = skipRaw
      ? skipRaw.split(/[\s,]+/).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
      : [];

    const { error: rpcError } = await supabase.rpc("hs_generate_school_days", {
      p_year_id: id,
      p_skip: skip,
    });

    if (rpcError)
      redirect(`/parent/settings?error=${encodeURIComponent(rpcError.message)}`);

    revalidatePath("/", "layout");
    redirect("/parent/settings?done=calendar");
  }

  async function inviteLogin(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const email = String(formData.get("email")).trim().toLowerCase();
    const role = String(formData.get("role"));
    const studentId = String(formData.get("student_id") || "");

    if (!email) redirect("/parent/settings?error=Enter%20an%20email");

    const { error } = await supabase.from("hs_invites").upsert(
      {
        email,
        role: role === "parent" ? "parent" : "student",
        student_id: role === "parent" ? null : studentId || null,
        claimed_at: null,
      },
      { onConflict: "email" },
    );
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);

    // If that person already has an account, connect it right away.
    const { error: rpcError } = await supabase.rpc("hs_claim_invites");
    if (rpcError)
      redirect(`/parent/settings?error=${encodeURIComponent(rpcError.message)}`);

    revalidatePath("/", "layout");
    redirect("/parent/settings?done=invite");
  }

  async function removeInvite(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase
      .from("hs_invites")
      .delete()
      .eq("email", String(formData.get("email")));
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/parent/settings");
    redirect("/parent/settings?done=invite");
  }

  async function saveCode(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const value = String(formData.get("code")).trim();
    const { error } = await supabase
      .from("hs_settings")
      .upsert({ key: "signup_code", value }, { onConflict: "key" });
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/parent/settings");
    redirect("/parent/settings?done=code");
  }

  async function saveStudent(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("student_id"));
    const { error } = await supabase
      .from("hs_students")
      .update({
        name: String(formData.get("name")).trim(),
        grade: String(formData.get("grade")).trim() || null,
        color: String(formData.get("color")),
      })
      .eq("id", id);
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/parent/settings?done=student");
  }

  async function addCourse(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.from("hs_courses").insert({
      student_id: String(formData.get("student_id")),
      school_year_id: String(formData.get("year_id")),
      name: String(formData.get("name")).trim(),
      short_name: String(formData.get("short_name")).trim() || null,
      textbook: String(formData.get("textbook")).trim() || null,
      color: String(formData.get("color")),
      sort_order: Number(formData.get("sort_order")) || 99,
    });
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/parent/settings?done=course");
  }

  async function saveCourse(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase
      .from("hs_courses")
      .update({
        name: String(formData.get("name")).trim(),
        short_name: String(formData.get("short_name")).trim() || null,
        textbook: String(formData.get("textbook")).trim() || null,
        color: String(formData.get("color")),
      })
      .eq("id", String(formData.get("course_id")));
    if (error) redirect(`/parent/settings?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/parent/settings?done=course");
  }

  const input =
    "mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/40";
  const button =
    "rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/parent" className="text-sm text-muted transition hover:text-foreground">
          &larr; Parent dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">School settings</h1>
      </div>

      {sp.done && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          Saved.
        </p>
      )}
      {sp.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {sp.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">School year &amp; calendar</h2>
        <p className="mt-1 text-sm text-muted">
          Saving rebuilds the day-to-date calendar. Lessons stay attached to their
          day numbers, so shifting the start date moves the whole plan with it.
        </p>

        <form action={saveYear} className="mt-4 space-y-4">
          <input type="hidden" name="year_id" value={viewer.year.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Year name</span>
              <input name="name" defaultValue={viewer.year.name} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">First day of school</span>
              <input
                type="date"
                name="start_date"
                defaultValue={viewer.year.start_date}
                className={input}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Total school days</span>
              <input
                type="number"
                name="total_days"
                min={1}
                max={365}
                defaultValue={viewer.year.total_days}
                className={input}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">School days per week</span>
              <select
                name="days_per_week"
                defaultValue={viewer.year.days_per_week}
                className={input}
              >
                {[4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} days ({Math.ceil(viewer.year.total_days / n)} weeks)
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Days off</span>
            <textarea
              name="skip_dates"
              rows={2}
              placeholder="2026-11-26 2026-11-27 2026-12-21 …"
              className={`${input} font-mono text-xs`}
            />
            <span className="mt-1 block text-xs text-muted">
              Holidays and breaks as YYYY-MM-DD, separated by spaces or commas.
              These dates are skipped when the calendar is rebuilt.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className={button}>
              Save &amp; rebuild calendar
            </button>
            <p className="text-sm text-muted">
              Now: {days.length} days, {days.at(-1)?.week_number ?? 0} weeks
              {days.length > 0 &&
                `, ${formatShort(days[0].day_date)} – ${formatShort(days.at(-1)!.day_date)}`}
            </p>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Family code</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone signing up needs this. Change it once everybody has an account.
        </p>
        <form action={saveCode} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-medium">Code</span>
            <input
              name="code"
              defaultValue={code?.value ?? ""}
              className={`${input} font-mono tracking-widest`}
            />
          </label>
          <button type="submit" className={button}>
            Save code
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Who can sign in</h2>
        <p className="mt-1 text-sm text-muted">
          Everyone signs in with the same Google account they use for Larder and
          Laundry-HQ. Authorise an email here and the next time that person signs
          in, they land in the right place. If they already have an account, it
          connects immediately.
        </p>

        <ul className="mt-4 divide-y divide-[color:var(--border)] rounded-xl border border-line">
          {(people ?? []).map((person) => {
            const student = viewer.students.find((s) => s.user_id === person.id);
            return (
              <li key={person.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-medium">{person.display_name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    person.role === "parent"
                      ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200"
                      : "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200"
                  }`}
                >
                  {person.role}
                </span>
                {student && (
                  <span className="text-xs text-muted">signs in as {student.name}</span>
                )}
                <span className="ml-auto text-xs text-emerald-700 dark:text-emerald-400">
                  connected
                </span>
              </li>
            );
          })}

          {(invites ?? [])
            .filter((i) => !i.claimed_at)
            .map((invite) => {
              const student = viewer.students.find((s) => s.id === invite.student_id);
              return (
                <li key={invite.email} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <span className="font-medium">{invite.email}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-500/15 dark:text-stone-300">
                    {invite.role}
                  </span>
                  {student && (
                    <span className="text-xs text-muted">will sign in as {student.name}</span>
                  )}
                  <span className="ml-auto text-xs text-amber-700 dark:text-amber-400">
                    waiting for first sign-in
                  </span>
                  <form action={removeInvite}>
                    <input type="hidden" name="email" value={invite.email} />
                    <button
                      type="submit"
                      className="rounded-lg border border-line px-2 py-1 text-xs transition hover:bg-background"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}

          {(people ?? []).length === 0 && (invites ?? []).length === 0 && (
            <li className="p-3 text-sm text-muted">Nobody is set up yet.</li>
          )}
        </ul>

        <form action={inviteLogin} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1">
            <span className="text-xs font-medium text-muted">Email address</span>
            <input
              name="email"
              type="email"
              required
              placeholder="name@gmail.com"
              className={input}
            />
          </label>
          <label className="block w-32">
            <span className="text-xs font-medium text-muted">Role</span>
            <select name="role" defaultValue="student" className={input}>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
          </label>
          <label className="block w-40">
            <span className="text-xs font-medium text-muted">Which student</span>
            <select name="student_id" defaultValue="" className={input}>
              <option value="">(parents: none)</option>
              {viewer.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={button}>
            Authorise
          </button>
        </form>
      </section>

      {viewer.students.map((student) => (
        <section key={student.id} className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${swatch(student.color).dot}`} />
            <h2 className="font-semibold">{student.name}</h2>
            <span className="text-sm text-muted">
              {student.user_id ? "login connected" : "no login yet"}
            </span>
          </div>

          <form action={saveStudent} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="student_id" value={student.id} />
            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input name="name" defaultValue={student.name} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Grade</span>
              <input name="grade" defaultValue={student.grade ?? ""} className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Colour</span>
              <select name="color" defaultValue={student.color} className={input}>
                {COLOR_NAMES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={button}>
              Save
            </button>
          </form>

          <h3 className="mt-6 text-sm font-medium text-muted">Courses</h3>
          <ul className="mt-2 space-y-2">
            {(coursesByStudent.get(student.id) ?? []).map((course) => (
              <li key={course.id} className="rounded-xl border border-line p-3">
                <form action={saveCourse} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="course_id" value={course.id} />
                  <label className="block min-w-48 flex-1">
                    <span className="text-xs font-medium text-muted">Course</span>
                    <input name="name" defaultValue={course.name} className={input} />
                  </label>
                  <label className="block w-28">
                    <span className="text-xs font-medium text-muted">Short</span>
                    <input
                      name="short_name"
                      defaultValue={course.short_name ?? ""}
                      className={input}
                    />
                  </label>
                  <label className="block min-w-48 flex-1">
                    <span className="text-xs font-medium text-muted">Textbook</span>
                    <input
                      name="textbook"
                      defaultValue={course.textbook ?? ""}
                      placeholder="e.g. Saxon Geometry"
                      className={input}
                    />
                  </label>
                  <label className="block w-32">
                    <span className="text-xs font-medium text-muted">Colour</span>
                    <select name="color" defaultValue={course.color} className={input}>
                      {COLOR_NAMES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className={button}>
                    Save
                  </button>
                  <Link
                    href={`/parent/plan/${course.id}`}
                    className="rounded-lg border border-line px-3 py-2 text-sm transition hover:bg-background"
                  >
                    Plan
                  </Link>
                </form>
              </li>
            ))}
          </ul>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted">Add a course</summary>
            <form action={addCourse} className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="student_id" value={student.id} />
              <input type="hidden" name="year_id" value={viewer.year.id} />
              <label className="block min-w-48 flex-1">
                <span className="text-xs font-medium text-muted">Course name</span>
                <input name="name" required className={input} />
              </label>
              <label className="block w-28">
                <span className="text-xs font-medium text-muted">Short</span>
                <input name="short_name" className={input} />
              </label>
              <label className="block min-w-48 flex-1">
                <span className="text-xs font-medium text-muted">Textbook</span>
                <input name="textbook" className={input} />
              </label>
              <label className="block w-32">
                <span className="text-xs font-medium text-muted">Colour</span>
                <select name="color" defaultValue="slate" className={input}>
                  {COLOR_NAMES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="sort_order" value={99} />
              <button type="submit" className={button}>
                Add
              </button>
            </form>
          </details>
        </section>
      ))}
    </div>
  );
}
