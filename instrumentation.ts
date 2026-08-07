// Next.js calls register() exactly once when the server process starts (dev or
// prod) — see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation.
// Used here to run the permission seeder (keeps super_admin synced to every
// permission that exists) and the super admin seeder (guarantees a super_admin
// role + default account exist on a fresh database) automatically, without a
// manual script every deploy.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncPermissions } = await import("@/lib/permissionSeeder");
    await syncPermissions().catch((err) => {
      console.error("[instrumentation] Permission seeder failed:", err);
    });

    const { seedSuperAdmin } = await import("@/lib/superAdminSeeder");
    await seedSuperAdmin().catch((err) => {
      console.error("[instrumentation] Super admin seeder failed:", err);
    });
  }
}
