import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Role from "@/models/Role";
import { requirePermission, requireSuperAdmin } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString, isValidEmail, isObjectId } from "@/lib/validators";
import { hashPassword } from "@/lib/bcrypt";
import { ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "users.view"))) return fail("Unauthorized", 401);
  await connectDB();
  const users = await User.find().select("-password").populate("roleId").sort({ email: 1 }).lean();
  return ok(users);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "users.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isValidEmail(body.email)) return fail("A valid email is required", 400);
  if (!isNonEmptyString(body.password) || body.password.length < 6) {
    return fail("Password must be at least 6 characters", 400);
  }
  if (!isObjectId(body.roleId)) return fail("A role is required", 400);

  await connectDB();
  const email = body.email.trim().toLowerCase();
  const [existingUser, role] = await Promise.all([User.findOne({ email }), Role.findById(body.roleId)]);
  if (existingUser) return fail("A user with this email already exists", 409);
  if (!role) return fail("Selected role does not exist", 400);
  if (!role.isActive) return fail("Cannot assign a deactivated role", 400);

  // Granting a user the super_admin role is the one action a delegated
  // users.create permission can't perform on its own — only an actual super
  // admin can create another one, else users.create would be a self-escalation path.
  if (role.name === ROLES.SUPER_ADMIN && !(await requireSuperAdmin(req))) {
    return fail("Only a super admin can create another super admin user", 403);
  }

  const user = await User.create({
    name: isNonEmptyString(body.name) ? body.name.trim() : "",
    email,
    password: await hashPassword(body.password),
    phone: isNonEmptyString(body.phone) ? body.phone.trim() : null,
    roleId: body.roleId,
    isActive: true,
  });
  return ok(
    { _id: user._id, name: user.name, email: user.email, phone: user.phone, roleId: user.roleId, isActive: user.isActive },
    201
  );
}
