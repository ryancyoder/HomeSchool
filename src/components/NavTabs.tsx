"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today" },
  { href: "/week", label: "This Week" },
  { href: "/calendar", label: "Calendar" },
  { href: "/courses", label: "Subjects" },
];

export default function NavTabs({ isParent }: { isParent: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const student = params.get("student");

  const tabs = isParent ? [...TABS, { href: "/parent", label: "Parent" }] : TABS;

  return (
    <nav className="mx-auto w-full max-w-5xl overflow-x-auto px-4">
      <ul className="flex gap-1 pb-1">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const href = student ? `${tab.href}?student=${student}` : tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={href}
                className={`inline-block rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-stone-900 text-foreground dark:border-stone-100"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
