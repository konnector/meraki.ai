import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default authMiddleware({
  // Only the routes specified in publicRoutes will be accessible to the public
  // All other routes will require authentication
  beforeAuth: (req: NextRequest) => {
    // Only redirect the exact /spreadsheets route
    if (req.nextUrl.pathname === '/spreadsheets' && !req.nextUrl.pathname.startsWith('/spreadsheet/')) {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  },
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api(.*)"
  ]
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ]
}; 