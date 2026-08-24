import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Completion,
  Course,
  DailyLog,
  Lesson,
  LessonWithState,
  Profile,
  SchoolDay,
  SchoolYear,
  Student,
} from "@/lib/types";

export type Viewer = {
  userId: string;
  profile: Profile;
  isParent: boolean;
  /** The student whose work is on screen. Null only for a parent with no roster. */
  student: Student | null;
  /** Every student, for the parent's student switcher. */
  students: Student[];
  year: SchoolYear;
};

/**
 * Resolves who is looking and whose work they are looking at. A student is
 * always pinned to their own record; a parent may pass ?student=<id>.
 */
export async function getViewer(studentParam?: string): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("hs_profiles")
    .select("id, role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // A parent may have authorised this address after the session started.
    await supabase.rpc("hs_claim_my_invite");
    ({ data: profile } = await supabase
      .from("hs_profiles")
      .select("id, role, display_name")
      .eq("id", user.id)
      .maybeSingle());
  }

  if (!profile) redirect("/login?error=no-profile");

  const { data: students } = await supabase
    .from("hs_students")
    .select("*")
    .order("sort_order");

  const { data: year } = await supabase
    .from("hs_school_years")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (!year) redirect("/login?error=no-year");

  const roster = (students ?? []) as Student[];
  const isParent = profile.role === "parent";

  const student = isParent
    ? roster.find((s) => s.id === studentParam) ?? roster[0] ?? null
    : roster.find((s) => s.user_id === user.id) ?? null;

  return {
    userId: user.id,
    profile: profile as Profile,
    isParent,
    student,
    students: roster,
    year: year as SchoolYear,
  };
}

export async function getSchoolDays(yearId: string): Promise<SchoolDay[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hs_school_days")
    .select("*")
    .eq("school_year_id", yearId)
    .order("day_number");
  return (data ?? []) as SchoolDay[];
}

export async function getCourses(
  studentId: string,
  yearId: string,
): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hs_courses")
    .select("*")
    .eq("student_id", studentId)
    .eq("school_year_id", yearId)
    .order("sort_order");
  return (data ?? []) as Course[];
}

/**
 * Lessons for a span of school days, each already joined to its course and to
 * this student's check-off. Used by the day, week and calendar views.
 */
export async function getLessonsForDays(
  studentId: string,
  yearId: string,
  dayNumbers: number[],
): Promise<LessonWithState[]> {
  if (dayNumbers.length === 0) return [];

  const supabase = await createClient();
  const courses = await getCourses(studentId, yearId);
  if (courses.length === 0) return [];

  const courseById = new Map(courses.map((c) => [c.id, c]));

  const { data: lessons } = await supabase
    .from("hs_lessons")
    .select("*")
    .in("course_id", [...courseById.keys()])
    .in("day_number", dayNumbers)
    .order("day_number")
    .order("sort_order");

  const rows = (lessons ?? []) as Lesson[];
  if (rows.length === 0) return [];

  const { data: completions } = await supabase
    .from("hs_completions")
    .select("*")
    .eq("student_id", studentId)
    .in(
      "lesson_id",
      rows.map((l) => l.id),
    );

  const doneByLesson = new Map(
    ((completions ?? []) as Completion[]).map((c) => [c.lesson_id, c]),
  );

  return rows
    .map((l) => ({
      ...l,
      course: courseById.get(l.course_id)!,
      completion: doneByLesson.get(l.id) ?? null,
    }))
    .sort(
      (a, b) =>
        a.day_number - b.day_number ||
        a.course.sort_order - b.course.sort_order ||
        a.sort_order - b.sort_order,
    );
}

export async function getCourseLessons(
  courseId: string,
  studentId: string,
): Promise<{ lessons: Lesson[]; completions: Map<string, Completion> }> {
  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("hs_lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("day_number")
    .order("sort_order");

  const rows = (lessons ?? []) as Lesson[];

  const { data: completions } = rows.length
    ? await supabase
        .from("hs_completions")
        .select("*")
        .eq("student_id", studentId)
        .in(
          "lesson_id",
          rows.map((l) => l.id),
        )
    : { data: [] };

  return {
    lessons: rows,
    completions: new Map(
      ((completions ?? []) as Completion[]).map((c) => [c.lesson_id, c]),
    ),
  };
}

export async function getDailyLog(
  studentId: string,
  schoolDayId: string,
): Promise<DailyLog | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hs_daily_logs")
    .select("*")
    .eq("student_id", studentId)
    .eq("school_day_id", schoolDayId)
    .maybeSingle();
  return (data as DailyLog) ?? null;
}

/**
 * The school day to land on: today if it is a school day, otherwise the next
 * one coming up, otherwise the last day of the year.
 */
export function pickCurrentDay(days: SchoolDay[], todayIso: string): SchoolDay | null {
  if (days.length === 0) return null;
  return (
    days.find((d) => d.day_date === todayIso) ??
    days.find((d) => d.day_date > todayIso) ??
    days[days.length - 1]
  );
}

/**
 * Per-course completion counts across the whole year.
 *
 * Counted in the database rather than by fetching the lesson rows: PostgREST
 * caps a response at 1000 rows, so a student with more lessons than that used
 * to see silently truncated totals on their later courses.
 */
export async function getCourseProgress(
  studentId: string,
  courseIds: string[],
): Promise<Map<string, { total: number; done: number }>> {
  const out = new Map<string, { total: number; done: number }>();
  for (const id of courseIds) out.set(id, { total: 0, done: 0 });
  if (courseIds.length === 0) return out;

  const supabase = await createClient();
  const { data } = await supabase.rpc("hs_course_progress", {
    p_student_id: studentId,
  });

  for (const row of (data ?? []) as {
    course_id: string;
    total: number;
    done: number;
  }[]) {
    // Only courses the caller asked about; the year filter lives with them.
    if (out.has(row.course_id)) {
      out.set(row.course_id, { total: Number(row.total), done: Number(row.done) });
    }
  }
  return out;
}
