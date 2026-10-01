import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

// Protège /admin (et ses server actions, qui passent par la même URL) —
// seule /admin/login reste accessible sans session valide.
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
