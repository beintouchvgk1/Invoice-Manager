import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import { ok, fail } from "@/lib/response";
import { ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return fail("Not authenticated", 401);
  const payload = verifyToken(token);
  if (!payload) return fail("Invalid or expired session", 401);

  await connectDB();
  const doc = await User.findById(payload.sub).populate("roleId").lean();
  if (!doc) return fail("Not authenticated", 401);
  const user = doc as unknown as { isActive: boolean; roleId: { name: string; isActive: boolean; permissions: string[] } | null };
  if (!user.isActive || !user.roleId || !user.roleId.isActive) return fail("Not authenticated", 401);

  const permissions = user.roleId.name === ROLES.SUPER_ADMIN ? ["*"] : user.roleId.permissions;
  return ok({ email: payload.email, role: user.roleId.name, permissions });
}
