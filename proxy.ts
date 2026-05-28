import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "cp_auth";

// Закрываем весь сайт простым паролем (cookie cp_auth === SITE_PASSWORD).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /login и статика — пропускаем
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = process.env.SITE_PASSWORD;

  if (!expected || cookie !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
