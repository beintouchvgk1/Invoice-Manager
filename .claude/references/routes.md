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
| `/login` | `login/page.tsx` | `authService.login` |

## Adding a new page — checklist
1. Create `app/(app)/{route}/page.tsx` (or a new top-level group if it shouldn't share the sidebar).
2. Build the feature's own hook in `hooks/use{Name}.ts` (see `rules/data-pattern.md`) and service in
   `services/{name}.service.ts` if it needs its own API resource.
3. Add a `NAV` entry in `components/Layout/Sidebar.tsx` (icon path + href + label).
4. Use `<Header title="..." actions={...}/>` at the top of the page, `<div id="ct">` around the body.
5. Follow `rules/responsive.md` and `rules/styling.md` — every new screen must ship with a matching
   skeleton loading state and must work down to a phone-width viewport, not just desktop.
