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
  "/english/assessment",
  "/english/test",
  "/english/support",
  "/english/progress",
  "/english/goals",
  "/english/profile",
  "/english/settings",
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
  const placementTestCompleted = token?.placementTestCompleted ?? false;
  const userRole = (token?.role as "USER" | "ADMIN") || "USER";

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current route is an admin route
  const isAdminRoute = pathname.startsWith("/admin-dashboard");

  // Check if the current route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check if this is the placement test route
  const isPlacementTestRoute = pathname.startsWith("/placement-test");

  // Protect admin routes - only ADMIN role can access
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const url = new URL("/authentication/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/english/dashboard", request.url));
    }
  }

  // If the user is not logged in and trying to access a protected route
  if (isProtectedRoute && !isLoggedIn) {
    const url = new URL("/authentication/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Admin users don't need placement test - skip all placement test checks for admins
  const isAdmin = userRole === "ADMIN";

  // If user is logged in but hasn't completed placement test
  // Skip this check for admin users
  if (isLoggedIn && !isAdmin && !placementTestCompleted && isProtectedRoute && !isPlacementTestRoute) {
    return NextResponse.redirect(new URL("/placement-test", request.url));
  }

  // If user completed test but still trying to access placement test
  // Admin should not access placement test
  if (isLoggedIn && isPlacementTestRoute) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin-dashboard/dashboard", request.url));
    }
    if (placementTestCompleted) {
      return NextResponse.redirect(new URL("/english/dashboard", request.url));
    }
  }

  // If the user is logged in and trying to access auth routes
  if (isAuthRoute && isLoggedIn) {
    // Admin goes to admin dashboard, regular users go to placement test or dashboard
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin-dashboard/dashboard", request.url));
    }
    // If they haven't completed placement test, send them there
    if (!placementTestCompleted) {
      return NextResponse.redirect(new URL("/placement-test", request.url));
    }
    return NextResponse.redirect(new URL("/english/dashboard", request.url));
  }

  // Redirect from root /english to dashboard if logged in
  if (pathname === "/english" && isLoggedIn) {
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin-dashboard/dashboard", request.url));
    }
    if (!placementTestCompleted) {
      return NextResponse.redirect(new URL("/placement-test", request.url));
    }
    return NextResponse.redirect(new URL("/english/dashboard", request.url));
  }

  // Redirect from /admin-dashboard to /admin-dashboard/dashboard
  if (pathname === "/admin-dashboard" && isLoggedIn && isAdmin) {
    return NextResponse.redirect(new URL("/admin-dashboard/dashboard", request.url));
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

