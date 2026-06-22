import { authkitMiddleware } from "@paribeshn/authkit/nextjs";

export default authkitMiddleware({
  secretKey: process.env.AUTH_SECRET_KEY!,
  signInUrl: "/sign-in",
  publicRoutes: ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/auth/callback"],
});

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
