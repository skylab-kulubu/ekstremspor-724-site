// `middleware.ts` runs on the Edge runtime by default and can't load `pg`.
// For the simple admin-route guard we just check that a session cookie
// is present here; the page itself (`/admin`) re-validates with a real
// DB lookup against profiles.role server-side.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const cookieName = process.env.SESSION_COOKIE_NAME ?? "extremspor_session";
  const hasSession = !!request.cookies.get(cookieName)?.value;
  if (!hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
