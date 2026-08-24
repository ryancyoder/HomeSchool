"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Who = "Seth" | "Selah" | "Parent";

const WHO: Who[] = ["Seth", "Selah", "Parent"];

export default function SignupForm() {
  const router = useRouter();
  const [who, setWho] = useState<Who>("Seth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const isParent = who === "Parent";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          hs_role: isParent ? "parent" : "student",
          hs_student: isParent ? null : who,
          hs_display_name: who,
          hs_code: code.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // Email confirmation may be on; if so there is no session yet.
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      router.push("/login?created=1");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">I am</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {WHO.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWho(option)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                who === option
                  ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                  : "border-line bg-background hover:border-stone-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/40"
        />
        <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Family code</span>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-base tracking-widest outline-none focus:ring-2 focus:ring-sky-500/40"
        />
      </label>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        {busy ? "Creating…" : "Create my login"}
      </button>
    </form>
  );
}
