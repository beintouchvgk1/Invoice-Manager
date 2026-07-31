import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import { requirePermission, requireAnyPermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";
import { isValidPermission } from "@/lib/constants";

// Bg_21: the Add/Edit User form needs the role list for its dropdown, so reading it
// can't be gated by roles.view alone.
export async function GET(req: NextRequest) {
  if (!(await requireAnyPermission(req, ["roles.view", "users.create", "users.edit"])))
    return fail("Unauthorized", 401);
  await connectDB();
  const roles = await Role.find().sort({ name: 1 }).lean();
  return ok(roles);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "roles.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Role name is required", 400);

  await connectDB();
  const name = body.name.trim();
  const existing = await Role.findOne({ name });
  if (existing) return fail("A role with this name already exists", 409);

  const permissions = Array.isArray(body.permissions) ? body.permissions.filter(isValidPermission) : [];

  const role = await Role.create({
    name,
    description: isNonEmptyString(body.description) ? body.description.trim() : "",
    isActive: true,
    permissions,
  });
  return ok(role, 201);
}
