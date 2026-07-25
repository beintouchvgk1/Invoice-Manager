# Pages & Routes Reference

All authenticated pages live under `app/(app)/` and share the `Sidebar` + `Header` shell from
`app/(app)/layout.tsx` (wrapped in `SidebarProvider`). `app/login/page.tsx` sits outside that group
and has no sidebar/header.

| URL | Next.js file | Data source |
|---|---|---|
| `/dashboard` | `(app)/dashboard/page.tsx` | `useCustomers` + `useInvoices` + `usePayments` |
| `/invoices` | `(app)/invoices/page.tsx` | `useInvoices` + `useCustomers`, renders `<InvoiceTable>` |
| `/invoices/new` | `(app)/invoices/new/page.tsx` | renders `<InvoiceForm>` (no invoice prop) |
| `/invoices/[id]/edit` | `(app)/invoices/[id]/edit/page.tsx` | `invoiceService.get(id)`, renders `<InvoiceForm invoice={...}>` |
| `/customers` | `(app)/customers/page.tsx` | `useCustomers` + `useInvoices` + `usePayments`, renders `<CustomerTable>` |
| `/groups` | `(app)/groups/page.tsx` | `useGroups` |
| `/payments` | `(app)/payments/page.tsx` | `usePayments` + `useInvoices` + `useCustomers` (wrapped in `Suspense` for `useSearchParams`) |
| `/reports` | `(app)/reports/page.tsx` | `useCustomers` + `useInvoices` + `usePayments`, 4 tabs (Outstanding / Received / Ageing / Group-wise) |
| `/settings` | `(app)/settings/page.tsx` | `useSettings` |
| `/ledger/[clientId]` | `(app)/ledger/[clientId]/page.tsx` | `useCustomers` + `useInvoices` + `usePayments`, filtered to one client |
| `/roles` | `(app)/roles/page.tsx` | `useRoles` — **super_admin only**, nav item hidden otherwise |
| `/users` | `(app)/users/page.tsx` | `useUsers` + `useRoles` — **super_admin only**, nav item hidden otherwise |
| `/login` | `login/page.tsx` | `authService.login` (email + password, not username) |

## Auth, roles & permissions
Login is by **email**, not username — the app has a `User` collection (`email`, `password`, `phone`,
`roleId`) and a separate `Role` collection (`name`, `description`, `isActive`, `permissions: string[]`).
Role names are user-manageable via the `/roles` screen; only the seeded `super_admin` role (constant in
`lib/constants/roles.ts`, never a raw string) is protected from rename/delete/deactivation.

**Granular per-tab permissions** (view/create/edit/delete per module — dashboard, invoices, customers,
groups, payments, reports, settings, roles, users) live in `lib/constants/permissions.ts`
(`PERMISSION_MODULES`/`ALL_PERMISSIONS`/`ASSIGNABLE_PERMISSIONS`) and are edited on the `/roles` page's
permission grid (`app/(app)/roles/page.tsx`). Every feature API route re-checks a specific permission
**fresh from the database** via `requirePermission(req, "module.action")` in `lib/requireAuth.ts` — a
`super_admin` always passes regardless of its stored `permissions` array (see
`lib/permissionSeeder.ts`, which runs on server boot via `instrumentation.ts` and keeps that role synced
to every permission that exists). Client-side, `useCurrentUser()` exposes `can(permission)` — used by
`Sidebar.tsx` to filter nav items and by each feature page to hide Create/Edit/Delete controls; this is
cosmetic only, the API route is the real gate.

**`roles` and `users` module permissions are not actually assignable** to any role other than
`super_admin` — `/api/roles/**` and `/api/users/**` stay hard-gated to `ROLES.SUPER_ADMIN` via
`requireSuperAdmin()` (not `requirePermission()`), to prevent a custom role from granting itself
admin-management access. `ASSIGNABLE_PERMISSIONS` (everything except `roles.*`/`users.*`) is what the
API actually persists onto a non-super-admin role, and the permission grid hides those two modules for
every role except `super_admin`. `/roles` and `/users` nav items are still driven by `can("roles.view")`
/`can("users.view")` — which, given the above, can only ever be true for `super_admin` — so don't
"fix" this by hardcoding a `role === ROLES.SUPER_ADMIN` nav check instead; the permission-based check
is intentional and already correct.

## Adding a new page — checklist
1. Create `app/(app)/{route}/page.tsx` (or a new top-level group if it shouldn't share the sidebar).
2. Build the feature's own hook in `hooks/use{Name}.ts` (see `rules/data-pattern.md`) and service in
   `services/{name}.service.ts` if it needs its own API resource.
3. Add a `NAV` entry in `components/Layout/Sidebar.tsx` (icon path + href + label).
4. Use `<Header title="..." actions={...}/>` at the top of the page, `<div id="ct">` around the body.
5. Follow `rules/responsive.md` and `rules/styling.md` — every new screen must ship with a matching
   skeleton loading state and must work down to a phone-width viewport, not just desktop.
