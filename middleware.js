import { NextResponse } from "next/server";

// Everything is behind the clinic passcode except the login screen itself.
export function middleware(req) {
  const { pathname } = req.nextUrl;

  const open =
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (open) return NextResponse.next();

  if (req.cookies.get("clinic_session")?.value === "ok") return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
