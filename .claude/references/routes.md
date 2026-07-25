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
| `/roles` | `(app)/roles/page.tsx` | `useRoles` — gated by `can("roles.view")`, nav item hidden otherwise |
| `/users` | `(app)/users/page.tsx` | `useUsers` + `useRoles` — gated by `can("users.view")`, nav item hidden otherwise |
| `/login` | `login/page.tsx` | `authService.login` (email + password, not username) |

## Auth, roles & permissions
Login is by **email**, not username — the app has a `User` collection (`email`, `password`, `phone`,
`roleId`) and a separate `Role` collection (`name`, `description`, `isActive`, `permissions: string[]`).
Role names are user-manageable via the `/roles` screen; only the seeded `super_admin` role (constant in
`lib/constants/roles.ts`, never a raw string) is protected from rename/delete/deactivation.

**Granular per-tab permissions** (view/create/edit/delete per module — dashboard, invoices, customers,
groups, payments, reports, settings, **and also roles, users**) live in `lib/constants/permissions.ts`
(`PERMISSION_MODULES`/`ALL_PERMISSIONS`) and are edited on the `/roles` page's permission grid
(`app/(app)/roles/page.tsx`) — every module, including `roles` and `users`, is assignable to any custom
role. Every feature API route, **including `/api/roles/**` and `/api/users/**`**, re-checks a specific
permission **fresh from the database** via `requirePermission(req, "module.action")` in
`lib/requireAuth.ts` — a `super_admin` always passes regardless of its stored `permissions` array (see
`lib/permissionSeeder.ts`, which runs on server boot via `instrumentation.ts` and keeps that role synced
to every permission that exists). Client-side, `useCurrentUser()` exposes `can(permission)` — used by
`Sidebar.tsx` to filter nav items and by each feature page to hide Create/Edit/Delete controls; this is
cosmetic only, the API route is the real gate.

**One narrower exception remains, independent of the permission system**: only an actual `super_admin`
(via `requireSuperAdmin()`, checked *in addition to* `requirePermission`) can create a user with the
`super_admin` role, promote an existing user into it, or modify/delete/deactivate an account that
already holds it — see the extra `requireSuperAdmin(req)` checks inside
`app/api/users/route.ts`/`app/api/users/[id]/route.ts`. This is the one privilege-escalation path a
delegated `users.create`/`users.edit` permission can't open on its own: without it, a role holding
those permissions could mint or edit its own way into a super admin account. `app/(app)/users/page.tsx`
mirrors this client-side — it filters `super_admin` out of the role picker, and hides Edit/Deactivate on
an existing super admin row, unless the viewer actually is one — so it never hits a surprise 403.
Nothing else about roles/users is specially restricted; a role with `roles.edit`, for instance, can
freely edit any other custom role's permissions (including its own), same as any other module.

## Database backup (`/api/backup`, gated by `can("backup.export")`)
`app/api/backup/route.ts` streams a full JSON export of every collection (Client/Group/Invoice/Payment/
Role/User/Settings) as a downloadable file — triggered from the "Download Backup" button in the
Dashboard header (`app/(app)/dashboard/page.tsx`). It's a plain in-process Mongoose export, **not** a
`mongodump`/BSON archive: the app runs on Vercel serverless functions, which can't shell out to the
`mongodump` binary or write to a persistent filesystem, so this is the only approach that actually works
in production. `lib/backup.ts`'s `buildBackupFilename()` names the file
`invoice_manager_db_backup_DD-MM-YYYY-HHMMSS.json`. The export includes `User.password` (bcrypt hashes)
deliberately — a backup that can't restore working logins isn't a real backup — so treat a downloaded
file as sensitive, same as any other credential. `services/backup.service.ts` doesn't go through
`services/http.ts` (that wrapper assumes a `{success,data}` JSON envelope; a successful response here is
the raw file, not an envelope) — it fetches, checks `res.ok`, and turns the blob into a browser download
directly. Don't route a future file-download endpoint through `http.ts` either; follow this pattern
instead.

## Adding a new page — checklist
1. Create `app/(app)/{route}/page.tsx` (or a new top-level group if it shouldn't share the sidebar).
2. Build the feature's own hook in `hooks/use{Name}.ts` (see `rules/data-pattern.md`) and service in
   `services/{name}.service.ts` if it needs its own API resource.
3. Add a `NAV` entry in `components/Layout/Sidebar.tsx` (icon path + href + label).
4. Use `<Header title="..." actions={...}/>` at the top of the page, `<div id="ct">` around the body.
5. Follow `rules/responsive.md` and `rules/styling.md` — every new screen must ship with a matching
   skeleton loading state and must work down to a phone-width viewport, not just desktop.
