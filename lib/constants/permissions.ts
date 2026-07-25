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

// "roles" and "users" are ordinary assignable modules like any other — a custom
// role can be granted roles.*/users.* the same way it's granted invoices.* etc.
// (see app/api/roles/**, app/api/users/** — both use requirePermission()). The one
// exception is assigning the super_admin ROLE itself to a user: that always
// requires the caller to actually hold the super_admin role, regardless of
// whether they hold users.create/users.edit — see requireSuperAdminRoleAssignment
// in lib/requireAuth.ts. That's the one privilege-escalation path a granted
// users.edit permission can't open on its own.
