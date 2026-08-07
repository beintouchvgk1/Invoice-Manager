import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import User from "@/models/User";
import { hashPassword } from "@/lib/bcrypt";
import { env } from "@/lib/env";
import { ROLES, ALL_PERMISSIONS } from "@/lib/constants";

// Runs once on server boot (see instrumentation.ts), same trigger as
// syncPermissions(). Guarantees a super_admin role and a default super admin
// account exist on every fresh deployment/database, without ever touching an
// existing user's password — a deploy must never silently reset credentials
// someone already changed.
export async function seedSuperAdmin() {
  await connectDB();

  let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (!role) {
    role = await Role.create({
      name: ROLES.SUPER_ADMIN,
      description: "Full system access",
      isActive: true,
      permissions: ALL_PERMISSIONS,
    });
    console.log(`[superAdminSeeder] Created role "${ROLES.SUPER_ADMIN}".`);
  } else {
    console.log(`[superAdminSeeder] Role "${ROLES.SUPER_ADMIN}" already exists.`);
  }

  const email = env.seedSuperAdminEmail.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[superAdminSeeder] User "${email}" already exists.`);
    return;
  }

  await User.create({
    email,
    password: await hashPassword(env.seedSuperAdminPassword),
    phone: env.seedSuperAdminPhone,
    roleId: role._id,
    isActive: true,
  });
  console.log(`[superAdminSeeder] Created super admin "${email}".`);
}
