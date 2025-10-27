import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = [
  "/english/dashboard",
  "/english/listening",
  "/english/reading",
  "/english/writing",
  "/english/speaking",
  "/english/grammar",
  "/english/vocabulary",
  "/english/pronunciation",
  "/english/functional",
  "/english/mediation",
  "/english/culture",
  "/english/assessment",
  "/english/support",
];

// Routes that should redirect to dashboard if already logged in
const authRoutes = [
  "/authentication/login",
  "/authentication/register",
  "/authentication/forgot-password",
  "/authentication/verify-otp",
  "/authentication/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the JWT token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLoggedIn = !!token;

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If the user is not logged in and trying to access a protected route
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL("/authentication/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // If the user is logged in and trying to access auth routes
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/english/dashboard", request.url));
  }

  // Redirect from root /english to dashboard if logged in
  if (pathname === "/english" && isLoggedIn) {
    return NextResponse.redirect(new URL("/english/dashboard", request.url));
  }

  // Allow homepage (/) for everyone - no redirect
  // Users can access landing page whether logged in or not

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

