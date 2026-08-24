import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google (and any other OAuth provider) lands here with a code to exchange
 * for a session. `next` carries the page the user was originally headed for.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // A parent may have left an invite for this address; claim it before the
  // app tries to look up a profile.
  await supabase.rpc("hs_claim_my_invite");

  return NextResponse.redirect(new URL(next, url.origin));
}
