import Link from "next/link";
import { getCourseProgress, getCourses, getViewer } from "@/lib/data";
import { swatch } from "@/lib/theme";
import { EmptyPlan, ProgressBar } from "@/components/Progress";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer(sp.student);

  if (!viewer.student) return <EmptyPlan message="No students on the roster yet." />;

  const courses = await getCourses(viewer.student.id, viewer.year.id);
  const progress = await getCourseProgress(
    viewer.student.id,
    courses.map((c) => c.id),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{viewer.student.name} &middot; {viewer.year.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
      </div>

      {courses.length === 0 ? (
        <EmptyPlan message="No courses yet." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => {
            const s = swatch(course.color);
            const p = progress.get(course.id) ?? { total: 0, done: 0 };
            return (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}${sp.student ? `?student=${sp.student}` : ""}`}
                  className={`flex h-full flex-col rounded-xl border border-line bg-card p-4 transition hover:ring-2 ${s.ring}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-0">
                      <h2 className="font-medium leading-snug">{course.name}</h2>
                      {course.textbook && (
                        <p className="mt-0.5 text-sm text-muted">{course.textbook}</p>
                      )}
                    </div>
                    {course.credits != null && (
                      <span className="ml-auto shrink-0 text-xs text-muted">
                        {course.credits} cr
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    {p.total === 0 ? (
                      <p className="text-xs text-muted">No lessons planned yet.</p>
                    ) : (
                      <ProgressBar done={p.done} total={p.total} color={course.color} />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
