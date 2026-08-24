import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Metadata routes are matched by name, not by extension: Next serves the
  // generated icon at /apple-icon with no suffix at all. Without these
  // exclusions the auth check treats them as protected pages and answers a
  // signed-out request with the login HTML, so the browser receives markup
  // where it asked for an image and falls back to a blank tile.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
