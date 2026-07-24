import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import { ROLES } from "@/lib/constants";

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Re-checks the caller's role fresh from the database (not just the JWT claim),
// so revoking/deactivating a super admin takes effect immediately, not after the
// token expires.
export async function requireSuperAdmin(req: NextRequest) {
  const payload = requireAuth(req);
  if (!payload) return null;

  await connectDB();
  const doc = await User.findById(payload.sub).populate("roleId").lean();
  if (!doc) return null;
  const user = doc as unknown as { _id: string; isActive: boolean; roleId: { name: string; isActive: boolean } | null };
  if (!user.isActive) return null;

  const role = user.roleId;
  if (!role || !role.isActive || role.name !== ROLES.SUPER_ADMIN) return null;

  return user;
}
