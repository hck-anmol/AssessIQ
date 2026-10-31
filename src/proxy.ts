import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedPrefixes = ["/dashboard", "/exam", "/exams", "/monitor", "/reports", "/onboarding"];

// Routes only for examiners
const examinerPrefixes = ["/exams/create", "/exams/edit", "/monitor", "/reports", "/dashboard/examiner"];

// Routes only for examinees
const studentPrefixes = ["/exam", "/dashboard/student"];

// Routes for unauthenticated users only
const authRoutes = ["/sign-in"];

/**
 * Lightweight proxy — reads the NextAuth session cookie to check auth.
 * Does NOT import next-auth (would panic Turbopack in proxy runtime).
 * Full role/permission checks happen inside each route/page via auth().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a session cookie (NextAuth sets authjs.session-token)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  const isProtected = protectedPrefixes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Redirect unauthenticated users to sign-in
  if (isProtected && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from sign-in
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
