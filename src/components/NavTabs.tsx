"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/calendar", label: "Calendar" },
  { href: "/courses", label: "Subjects" },
  { href: "/library", label: "Library" },
];

export default function NavTabs({
  isParent,
  unreadNarrations = 0,
}: {
  isParent: boolean;
  unreadNarrations?: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const student = params.get("student");

  const tabs = isParent ? [...TABS, { href: "/parent", label: "Parent" }] : TABS;

  return (
    // Six tabs need ~470px, more than any iPhone offers, so the row wraps
    // rather than scrolling: a scrolled row hid the last tab entirely, and with
    // it the unread badge. Wrapping uses one line wherever it fits.
    <nav className="mx-auto w-full max-w-5xl px-3 sm:px-4">
      <ul className="flex flex-wrap gap-1 pb-2">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const href = student ? `${tab.href}?student=${student}` : tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center rounded-lg px-2.5 py-2 text-[13px] font-medium transition sm:text-sm ${
                  active
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-muted hover:bg-card hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.href === "/parent" && unreadNarrations > 0 && (
                  <span
                    aria-label={`${unreadNarrations} unread narrations`}
                    className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                  >
                    {unreadNarrations > 99 ? "99+" : unreadNarrations}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
