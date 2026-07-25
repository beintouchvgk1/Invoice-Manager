async function main() {
  const { connectDB } = await import("../lib/mongodb");
  const { default: Role } = await import("../models/Role");
  const { default: User } = await import("../models/User");
  const { hashPassword } = await import("../lib/bcrypt");
  const { env } = await import("../lib/env");
  const { ROLES, ALL_PERMISSIONS } = await import("../lib/constants");

  await connectDB();

  let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (!role) {
    role = await Role.create({
      name: ROLES.SUPER_ADMIN,
      description: "Full system access",
      isActive: true,
      permissions: ALL_PERMISSIONS,
    });
    console.log(`Created role "${ROLES.SUPER_ADMIN}" with all ${ALL_PERMISSIONS.length} permissions.`);
  } else {
    console.log(`Role "${ROLES.SUPER_ADMIN}" already exists.`);
  }

  const email = env.seedSuperAdminEmail.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User "${email}" already exists.`);
    process.exit(0);
  }

  const hashed = await hashPassword(env.seedSuperAdminPassword);
  await User.create({
    email,
    password: hashed,
    phone: env.seedSuperAdminPhone,
    roleId: role._id,
    isActive: true,
  });
  console.log(`Created super admin "${email}" with password "${env.seedSuperAdminPassword}". Change this immediately.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
