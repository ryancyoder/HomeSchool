import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSchoolDays, getViewer } from "@/lib/data";
import PlanEditor from "@/components/PlanEditor";
import type { Course, Lesson, Student } from "@/lib/types";

export default async function PlanCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const viewer = await getViewer();
  if (!viewer.isParent) redirect("/today");

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("hs_courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("hs_lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("day_number")
    .order("sort_order");

  const student = viewer.students.find(
    (s) => s.id === (course as Course).student_id,
  ) as Student | undefined;

  const days = await getSchoolDays(viewer.year.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/parent"
          className="text-sm text-muted transition hover:text-foreground"
        >
          &larr; Parent dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {(course as Course).name}
        </h1>
        <p className="text-sm text-muted">
          {student?.name} &middot;{" "}
          {(course as Course).last_day - (course as Course).first_day + 1}-day plan
          {((course as Course).first_day !== 1 ||
            (course as Course).last_day !== viewer.year.total_days) &&
            ` · days ${(course as Course).first_day}–${(course as Course).last_day}`}
        </p>
      </div>

      <PlanEditor
        course={course as Course}
        initialLessons={(lessons ?? []) as Lesson[]}
        days={days}
        firstDay={(course as Course).first_day}
        lastDay={(course as Course).last_day}
      />
    </div>
  );
}
