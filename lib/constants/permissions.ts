// The permission catalog for the whole app. A permission key is always
// "<module>.<action>" (e.g. "invoices.create"). This is the single source of
// truth: the Roles & Permissions screen renders straight from this list, the
// permission seeder (lib/permissionSeeder.ts) grants every key here to the
// super_admin role on boot, and API routes reference the same keys via
// requirePermission(). Adding a new gated action = add one entry here.
export const PERMISSION_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    actions: [{ key: "view", label: "View Dashboard" }],
  },
  {
    key: "invoices",
    label: "Invoices",
    actions: [
      { key: "view", label: "View Invoices" },
      { key: "create", label: "Create Invoice" },
      { key: "edit", label: "Edit Invoice" },
      { key: "delete", label: "Delete Invoice" },
    ],
  },
  {
    key: "customers",
    label: "Clients",
    actions: [
      { key: "view", label: "View Clients" },
      { key: "create", label: "Create Client" },
      { key: "edit", label: "Edit Client" },
      { key: "delete", label: "Delete Client" },
    ],
  },
  {
    key: "groups",
    label: "Groups",
    actions: [
      { key: "view", label: "View Groups" },
      { key: "create", label: "Create Group" },
      { key: "edit", label: "Edit Group" },
      { key: "delete", label: "Delete Group" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    actions: [
      { key: "view", label: "View Payments" },
      { key: "create", label: "Create Payment" },
      { key: "edit", label: "Edit Payment" },
      { key: "delete", label: "Delete Payment" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    actions: [{ key: "view", label: "View Reports" }],
  },
  {
    key: "settings",
    label: "Settings",
    actions: [
      { key: "view", label: "View Settings" },
      { key: "edit", label: "Edit Settings" },
    ],
  },
  {
    key: "roles",
    label: "Roles & Permissions",
    actions: [
      { key: "view", label: "View Roles & Permissions" },
      { key: "create", label: "Create Role" },
      { key: "edit", label: "Edit Role / Permissions" },
      { key: "delete", label: "Delete Role" },
    ],
  },
  {
    key: "users",
    label: "Users",
    actions: [
      { key: "view", label: "View Users" },
      { key: "create", label: "Create User" },
      { key: "edit", label: "Edit User" },
      { key: "delete", label: "Delete User" },
    ],
  },
] as const;

export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((m) =>
  m.actions.map((a) => `${m.key}.${a.key}`)
);

const ALL_PERMISSIONS_SET = new Set(ALL_PERMISSIONS);

export function isValidPermission(key: string): boolean {
  return ALL_PERMISSIONS_SET.has(key);
}

// "roles" and "users" module permissions are not actually assignable to any role
// other than the super admin: app/api/roles/**/api/users/** stay hard-gated to
// ROLES.SUPER_ADMIN (see lib/requireAuth.ts's requireSuperAdmin) to prevent a
// custom role from granting itself admin-management access. Checking these boxes
// for a non-super-admin role would be a permission that does nothing, so they're
// filtered out of both the assignable grid and any non-super-admin role's stored
// permissions array.
export const ASSIGNABLE_PERMISSIONS: string[] = ALL_PERMISSIONS.filter(
  (p) => !p.startsWith("roles.") && !p.startsWith("users.")
);
const ASSIGNABLE_PERMISSIONS_SET = new Set(ASSIGNABLE_PERMISSIONS);

export function isAssignablePermission(key: string): boolean {
  return ASSIGNABLE_PERMISSIONS_SET.has(key);
}
