async function main() {
  const { connectDB } = await import("../lib/mongodb");
  const { default: Admin } = await import("../models/Admin");
  const { hashPassword } = await import("../lib/bcrypt");

  const username = process.env.SEED_ADMIN_USER || "admin";
  const password = process.env.SEED_ADMIN_PASS || "admin123";

  await connectDB();
  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists.`);
    process.exit(0);
  }

  const hashed = await hashPassword(password);
  await Admin.create({ username, password: hashed });
  console.log(`Created admin "${username}" with password "${password}". Change this immediately.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
