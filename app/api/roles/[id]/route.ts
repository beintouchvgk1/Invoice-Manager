import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import User from "@/models/User";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";
import { ROLES, isValidPermission } from "@/lib/constants";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "roles.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid request body", 400);

  await connectDB();
  const role = await Role.findById(id);
  if (!role) return fail("Role not found", 404);

  const isSuperAdminRole = role.name === ROLES.SUPER_ADMIN;

  if (isNonEmptyString(body.name) && body.name.trim() !== role.name) {
    if (isSuperAdminRole) return fail(`The "${ROLES.SUPER_ADMIN}" role cannot be renamed`, 400);
    const existing = await Role.findOne({ name: body.name.trim(), _id: { $ne: id } });
    if (existing) return fail("A role with this name already exists", 409);
    role.name = body.name.trim();
  }

  if (typeof body.description === "string") role.description = body.description.trim();

  if (typeof body.isActive === "boolean" && body.isActive !== role.isActive) {
    if (isSuperAdminRole && !body.isActive) return fail(`The "${ROLES.SUPER_ADMIN}" role cannot be deactivated`, 400);
    role.isActive = body.isActive;
  }

  if (Array.isArray(body.permissions)) {
    if (isSuperAdminRole) {
      // The super admin always holds every permission — silently ignore attempts
      // to edit it rather than erroring, since the UI renders its checkboxes
      // disabled anyway.
    } else {
      role.permissions = body.permissions.filter(isValidPermission);
    }
  }

  await role.save();
  return ok(role);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "roles.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const role = await Role.findById(id);
  if (!role) return fail("Role not found", 404);
  if (role.name === ROLES.SUPER_ADMIN) return fail(`The "${ROLES.SUPER_ADMIN}" role cannot be deleted`, 400);

  const inUse = await User.exists({ roleId: id });
  if (inUse) return fail("Cannot delete a role that is still assigned to users. Reassign those users first.", 409);

  await Role.deleteOne({ _id: id });
  return ok({ deleted: true });
}
