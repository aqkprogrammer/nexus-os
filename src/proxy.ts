import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/** A quick redirect only. The API routes check the session properly before returning any data. */
export function proxy(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!api|login|reset-password|spaces/join|_next|.*\\..*).*)"],
};
