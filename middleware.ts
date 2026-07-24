import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/lib/env";
import { AUTH_COOKIE } from "@/lib/constants";

const PROTECTED_PREFIXES = ["/dashboard", "/invoices", "/customers", "/groups", "/payments", "/ledger", "/reports", "/settings", "/roles", "/users"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(env.jwtSecret));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/customers/:path*",
    "/groups/:path*",
    "/payments/:path*",
    "/ledger/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/roles/:path*",
    "/users/:path*",
  ],
};
