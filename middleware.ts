import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // Only the routes specified in publicRoutes will be accessible to the public
  // All other routes will require authentication
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api(.*)"
  ]
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 