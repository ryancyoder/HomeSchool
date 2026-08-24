"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Student } from "@/lib/types";

export default function StudentSwitcher({ students }: { students: Student[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("student") ?? students[0]?.id ?? "";

  if (students.length === 0) return null;

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("student", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Viewing</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-card px-2 py-1 text-sm"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
