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

## Auth & roles
Login is by **email**, not username — the app has a `User` collection (`email`, `password`, `phone`,
`roleId`) and a separate `Role` collection (`name`, `description`, `isActive`). Role names are
user-manageable via the `/roles` screen; only the seeded `super_admin` role (constant in
`lib/constants/roles.ts`, never a raw string) is protected from rename/delete/deactivation.
`/roles` and `/users` are gated two ways: `components/Layout/Sidebar.tsx` hides the nav items unless
`useCurrentUser()`'s `role` equals `ROLES.SUPER_ADMIN` (cosmetic only), and every `/api/roles/**` +
`/api/users/**` route re-checks the role **fresh from the database** via `requireSuperAdmin()` in
`lib/requireAuth.ts` — never trust the JWT claim alone for this check, since a role can be changed or
deactivated after a token was issued.

## Adding a new page — checklist
1. Create `app/(app)/{route}/page.tsx` (or a new top-level group if it shouldn't share the sidebar).
2. Build the feature's own hook in `hooks/use{Name}.ts` (see `rules/data-pattern.md`) and service in
   `services/{name}.service.ts` if it needs its own API resource.
3. Add a `NAV` entry in `components/Layout/Sidebar.tsx` (icon path + href + label).
4. Use `<Header title="..." actions={...}/>` at the top of the page, `<div id="ct">` around the body.
5. Follow `rules/responsive.md` and `rules/styling.md` — every new screen must ship with a matching
   skeleton loading state and must work down to a phone-width viewport, not just desktop.
