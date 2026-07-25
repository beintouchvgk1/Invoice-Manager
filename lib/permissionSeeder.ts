import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import { ROLES, ALL_PERMISSIONS } from "@/lib/constants";

// Runs once on server boot (see instrumentation.ts). Keeps the permission catalog
// in sync with what's actually stored on roles, without ever needing a manual
// migration step:
//  - super_admin always gets every permission that exists today, including ones
//    added after the role was first created.
//  - every other role has any now-removed/renamed permission key pruned out, so
//    stale strings never linger in the database once a permission is retired.
export async function syncPermissions() {
  await connectDB();

  const superAdmin = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (superAdmin) {
    const hasAll = ALL_PERMISSIONS.every((p) => superAdmin.permissions.includes(p));
    if (!hasAll || superAdmin.permissions.length !== ALL_PERMISSIONS.length) {
      superAdmin.permissions = ALL_PERMISSIONS;
      await superAdmin.save();
      console.log(`[permissionSeeder] Synced ${ALL_PERMISSIONS.length} permissions onto "${ROLES.SUPER_ADMIN}".`);
    }
  }

  const allowed = new Set(ALL_PERMISSIONS);
  const otherRoles = await Role.find({ name: { $ne: ROLES.SUPER_ADMIN } });
  for (const role of otherRoles) {
    const pruned = role.permissions.filter((p: string) => allowed.has(p));
    if (pruned.length !== role.permissions.length) {
      role.permissions = pruned;
      await role.save();
      console.log(`[permissionSeeder] Pruned stale permissions from "${role.name}".`);
    }
  }
}
