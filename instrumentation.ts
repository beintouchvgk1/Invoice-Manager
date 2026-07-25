// Next.js calls register() exactly once when the server process starts (dev or
// prod) — see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation.
// Used here to run the permission seeder so newly-added permissions land on the
// super_admin role automatically, without a manual script.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncPermissions } = await import("@/lib/permissionSeeder");
    await syncPermissions().catch((err) => {
      console.error("[instrumentation] Permission seeder failed:", err);
    });
  }
}
