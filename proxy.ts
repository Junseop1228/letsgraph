import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { EXPLORE_PATH, MAP_PATH, hasOnboarded } from "@/lib/onboarding";

export async function proxy(request: NextRequest) {
  // Card deck until it is finished or skipped (specs/explore FR-DISC-01, D 2026-11-18): "/" and a bare "/explore"
  // (the 탐색 tab) open the graph only for a visitor who ended the deck; a bare "/explore/map" sends the others back to
  // the deck. "/explore?..." (the job bar's "직무 더 고르기", ?bye=1) and "/explore/map?job=..." are explicit visits.
  const { pathname, search } = request.nextUrl;
  const onboarded = hasOnboarded((n) => request.cookies.get(n)?.value);
  if (onboarded && (pathname === "/" || (pathname === EXPLORE_PATH && !search))) {
    return NextResponse.redirect(new URL(MAP_PATH, request.url));
  }
  if (!onboarded && pathname === MAP_PATH && !search) {
    return NextResponse.redirect(new URL(EXPLORE_PATH, request.url));
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
