"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleButton({ next }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-card px-4 py-2.5 font-medium transition hover:bg-background disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path
            fill="#4285F4"
            d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
          />
          <path
            fill="#34A853"
            d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.540-2.03-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 23.5Z"
          />
          <path
            fill="#FBBC05"
            d="M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.71a11.5 11.5 0 0 0 0 10.3l3.84-2.98Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.98c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.5 15.1.5 12 .5 7.52.5 3.64 3.07 1.71 6.85l3.84 2.98C6.46 7.1 9 4.98 12 4.98Z"
          />
        </svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </>
  );
}
