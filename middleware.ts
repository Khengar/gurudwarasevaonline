import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/receipts/:path*",
    "/payments/:path*",
    "/rooms/:path*",
    "/bookings/:path*",
    "/reports/:path*",
    "/categories/:path*",
    "/users/:path*",
    "/superadmin/:path*",
    "/api/((?!auth).*)",
  ],
};
