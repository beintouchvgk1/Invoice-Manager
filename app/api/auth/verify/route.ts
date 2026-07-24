import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/jwt";
import { ok, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return fail("Not authenticated", 401);
  const payload = verifyToken(token);
  if (!payload) return fail("Invalid or expired session", 401);
  return ok({ email: payload.email, role: payload.role });
}
