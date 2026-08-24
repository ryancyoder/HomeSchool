import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google lands here with a code to exchange for a session. This route takes no
 * query parameters of its own so that the redirect URL registered with
 * Supabase can be matched exactly; everyone goes to the day view afterwards.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

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

  // A parent may have authorised this address; claim it before the app looks
  // for a profile.
  await supabase.rpc("hs_claim_my_invite");

  return NextResponse.redirect(new URL("/today", url.origin));
}
