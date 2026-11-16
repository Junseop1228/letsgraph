import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { MAP_PATH, hasOnboarded } from "@/lib/onboarding";

export async function proxy(request: NextRequest) {
  // Card deck once per browser (specs/explore FR-DISC-01): "/" and a bare "/explore" send a returning visitor
  // straight to the graph. "/explore?..." (the job bar's "직무 더 고르기", ?bye=1) is an explicit visit and keeps the deck.
  const { pathname, search } = request.nextUrl;
  if ((pathname === "/" || (pathname === "/explore" && !search)) && hasOnboarded((n) => request.cookies.get(n)?.value)) {
    return NextResponse.redirect(new URL(MAP_PATH, request.url));
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
