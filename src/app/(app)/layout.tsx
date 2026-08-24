import Link from "next/link";
import { getUnreadNarrationCount, getViewer } from "@/lib/data";
import NavTabs from "@/components/NavTabs";
import StudentSwitcher from "@/components/StudentSwitcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const unreadNarrations = viewer.isParent ? await getUnreadNarrationCount() : 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/today" className="font-semibold tracking-tight">
            Yoder Home School
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {viewer.isParent && <StudentSwitcher students={viewer.students} />}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <NavTabs isParent={viewer.isParent} unreadNarrations={unreadNarrations} />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="no-print mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-muted">
        {viewer.year.name} &middot; {viewer.year.total_days} days
        {viewer.student && ` · viewing ${viewer.student.name}`}
      </footer>
    </div>
  );
}
