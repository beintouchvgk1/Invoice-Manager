import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Role from "@/models/Role";
import { requirePermission, requireSuperAdmin } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString, isValidEmail, isObjectId } from "@/lib/validators";
import { hashPassword } from "@/lib/bcrypt";
import { ROLES } from "@/lib/constants";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

// Refuses an update if it would leave zero active users holding the super_admin role
// (would otherwise lock every admin out of the app with no way back in).
async function wouldRemoveLastActiveSuperAdmin(userId: string, becomingInactiveOrNonSuperAdmin: boolean) {
  if (!becomingInactiveOrNonSuperAdmin) return false;
  const superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (!superAdminRole) return false;
  const activeSuperAdmins = await User.countDocuments({
    roleId: superAdminRole._id,
    isActive: true,
    _id: { $ne: userId },
  });
  return activeSuperAdmins === 0;
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "users.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid request body", 400);

  await connectDB();
  const user = await User.findById(id).populate<{ roleId: { name: string } }>("roleId");
  if (!user) return fail("User not found", 404);
  const currentRoleName = (user.roleId as unknown as { name: string } | null)?.name;
  const isCurrentlySuperAdmin = currentRoleName === ROLES.SUPER_ADMIN;

  // A delegated users.edit permission can manage ordinary accounts, but touching an
  // existing super admin account (even just its email/phone/password) requires
  // actually being a super admin — otherwise users.edit alone could disable or lock
  // out the real admins.
  if (isCurrentlySuperAdmin && !(await requireSuperAdmin(req))) {
    return fail("Only a super admin can modify a super admin account", 403);
  }

  if (typeof body.name === "string") user.name = body.name.trim();

  if (isNonEmptyString(body.email)) {
    if (!isValidEmail(body.email)) return fail("A valid email is required", 400);
    const email = body.email.trim().toLowerCase();
    if (email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) return fail("A user with this email already exists", 409);
      user.email = email;
    }
  }

  if (isNonEmptyString(body.password)) {
    if (body.password.length < 6) return fail("Password must be at least 6 characters", 400);
    user.password = await hashPassword(body.password);
  }

  if (typeof body.phone === "string") user.phone = body.phone.trim() || null;

  if (isNonEmptyString(body.roleId) && isObjectId(body.roleId) && body.roleId !== String(user.roleId)) {
    const newRole = await Role.findById(body.roleId);
    if (!newRole) return fail("Selected role does not exist", 400);
    if (!newRole.isActive) return fail("Cannot assign a deactivated role", 400);

    // Promoting a user to super_admin is the one action a delegated users.edit
    // permission can't perform on its own — same reasoning as user creation above.
    if (newRole.name === ROLES.SUPER_ADMIN && !isCurrentlySuperAdmin && !(await requireSuperAdmin(req))) {
      return fail("Only a super admin can promote a user to super admin", 403);
    }

    const movingAwayFromSuperAdmin = isCurrentlySuperAdmin && newRole.name !== ROLES.SUPER_ADMIN;
    if (await wouldRemoveLastActiveSuperAdmin(id, movingAwayFromSuperAdmin)) {
      return fail("Cannot reassign the last active super admin away from that role", 400);
    }
    user.roleId = body.roleId;
  }

  if (typeof body.isActive === "boolean" && body.isActive !== user.isActive) {
    const deactivating = isCurrentlySuperAdmin && !body.isActive;
    if (await wouldRemoveLastActiveSuperAdmin(id, deactivating)) {
      return fail("Cannot deactivate the last active super admin", 400);
    }
    user.isActive = body.isActive;
  }

  await user.save();
  return ok({ _id: user._id, name: user.name, email: user.email, phone: user.phone, roleId: user.roleId, isActive: user.isActive });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "users.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const user = await User.findById(id).populate<{ roleId: { name: string } }>("roleId");
  if (!user) return fail("User not found", 404);
  const isSuperAdmin = (user.roleId as unknown as { name: string } | null)?.name === ROLES.SUPER_ADMIN;

  if (isSuperAdmin && !(await requireSuperAdmin(req))) {
    return fail("Only a super admin can delete a super admin account", 403);
  }

  if (await wouldRemoveLastActiveSuperAdmin(id, isSuperAdmin && user.isActive)) {
    return fail("Cannot delete the last active super admin", 400);
  }

  await User.deleteOne({ _id: id });
  return ok({ deleted: true });
}
