async function main() {
  const { seedSuperAdmin } = await import("../lib/superAdminSeeder");
  await seedSuperAdmin();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
