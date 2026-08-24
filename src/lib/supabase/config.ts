/**
 * Supabase connection details.
 *
 * The publishable ("anon") key is public by design — it ships inside the
 * browser bundle of every Supabase app, and it grants nothing on its own.
 * Access is decided by Row Level Security in the database, which is why the
 * checked-in fallbacks below are safe and let a fresh deploy work with no
 * dashboard setup. Set the environment variables to point at a different
 * project; they win when present.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ivjxtlznikqxyscyyxzk.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_AyiE1P_yJ8aaBtDCqgMS0Q_22dROzpT";
