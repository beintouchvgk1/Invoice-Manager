import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE } from "@/lib/jwt";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/Role";
import { ROLES } from "@/lib/constants";

type AuthedUser = {
  _id: string;
  isActive: boolean;
  roleId: { name: string; isActive: boolean; permissions: string[] } | null;
};

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

async function loadAuthedUser(req: NextRequest): Promise<AuthedUser | null> {
  const payload = requireAuth(req);
  if (!payload) return null;

  await connectDB();
  const doc = await User.findById(payload.sub).populate("roleId").lean();
  if (!doc) return null;
  const user = doc as unknown as AuthedUser;
  if (!user.isActive) return null;
  if (!user.roleId || !user.roleId.isActive) return null;

  return user;
}

// Re-checks the caller's role fresh from the database (not just the JWT claim),
// so revoking/deactivating a super admin takes effect immediately, not after the
// token expires.
export async function requireSuperAdmin(req: NextRequest) {
  const user = await loadAuthedUser(req);
  if (!user || user.roleId?.name !== ROLES.SUPER_ADMIN) return null;
  return user;
}

// Checks a specific permission key ("invoices.create") fresh from the database.
// A super admin always passes, regardless of its stored permissions array (it is
// the one role guaranteed to hold every permission — see lib/permissionSeeder.ts).
export async function requirePermission(req: NextRequest, permission: string) {
  const user = await loadAuthedUser(req);
  if (!user) return null;
  if (user.roleId?.name === ROLES.SUPER_ADMIN) return user;
  if (!user.roleId?.permissions.includes(permission)) return null;
  return user;
}
