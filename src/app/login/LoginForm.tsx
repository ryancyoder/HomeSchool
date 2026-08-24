"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "@/components/GoogleButton";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const next = params.get("next") || "/";
  const notice = params.get("error");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    // Pick up an invite a parent left for this address, if any.
    await supabase.rpc("hs_claim_my_invite");

    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {notice === "no-profile" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          That account is signed in but has not been added to school yet. Ask a
          parent to add your email under School settings.
        </p>
      )}
      {notice && notice !== "no-profile" && notice !== "no-year" && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {notice === "oauth" ? "Google sign-in did not complete." : notice}
        </p>
      )}

      <GoogleButton next={next} />

      {!showPassword ? (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="w-full text-center text-sm text-muted underline underline-offset-4 transition hover:text-foreground"
        >
          Use an email and password instead
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[color:var(--border)]" />
            <span className="text-xs text-muted">or</span>
            <span className="h-px flex-1 bg-[color:var(--border)]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </label>

            {error && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
