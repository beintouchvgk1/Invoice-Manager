import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/jwt";

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
