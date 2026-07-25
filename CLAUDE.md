# VGK Invoice Manager — Claude Context

Internal billing/invoicing tool for a single-admin accounting practice (V G K & CO, Surat).
**Next.js 15 (App Router) + Mongoose + plain CSS.** Blue + white design system, gradient accents,
off-canvas responsive sidebar. No Tailwind, no shadcn, no RTK Query — see the imports below before
assuming otherwise.

> Keep this file lean. It is loaded every turn — so are all the `@import`s below. Put *how-to-work*
> rules in `.claude/rules/`, design facts in `.claude/references/`, and step-by-step recipes in
> `.claude/skills/`. Don't duplicate them here; point to them.

## Imported rules & references (auto-loaded — read them, don't repeat them here)
@.claude/rules/code-standards.md
@.claude/rules/data-pattern.md
@.claude/rules/styling.md
@.claude/rules/responsive.md
@.claude/rules/types.md
@.claude/rules/git-workflow.md
@.claude/references/design-system.md
@.claude/references/routes.md
@.claude/references/types.md

## Skills (on-demand — invoke instead of inlining the recipe)
- `ui-design` — apply the blue+white design system (with mandatory responsive behavior) to new/changed UI
- `add-feature` — scaffold a new resource: type → service → hook → components → page → nav
- `responsive-review` — audit a screen against the responsive checklist and fix gaps

---

## The rules that matter most
1. **Scope discipline:** UI/design tasks touch `app/**/page.tsx` markup, `components/**`, and
   `app/globals.css` only. Never touch `app/api/**`, `models/**`, or hook/service business logic
   unless the task explicitly asks for backend work. (`rules/code-standards.md`)
2. **Every new screen ships responsive, by construction** — reuse `.tw` (tables), `.sg`/`.sc` (stat
   cards), `.g2`/`.g3`/`.fg` (forms); don't hardcode fixed pixel widths or fixed-column grids. Test at
   phone/iPad/desktop widths before calling it done. (`rules/responsive.md`)
3. **Theme:** blue-700 (`#1d4ed8`) + white/slate, gradient primary buttons/active-nav/active-tab
   (`linear-gradient(135deg, #1d4ed8, #3b82f6)`), badges are rectangular (`rounded-md`) never pill.
   Never a hex value outside the token table. (`references/design-system.md`)
4. **Loading states:** every `loading ? ... : ...` branch renders a `Skeleton*` from
   `components/Common/Skeleton.tsx` shaped like the real layout — never plain text or a bare spinner.
5. **Data layer:** three-layer pattern — `services/http.ts` → `services/{name}.service.ts` →
   `hooks/use{Name}.ts` (`{items, loading, error, refresh}`). No RTK Query/React Query/Zustand.
   (`rules/data-pattern.md`)
6. **Shared code:** before changing anything in `hooks/`, `services/`, `lib/`, or `components/Common/`,
   grep every caller and confirm the change doesn't alter behavior for any of them — else add a new
   function/component instead. (`rules/code-standards.md`)
7. **Auth is `User` + `Role` based, login by email** — no public self-registration/self-service
   password reset. Roles carry a granular `permissions: string[]` (view/create/edit/delete per module —
   including `roles` and `users` themselves — catalog in `lib/constants/permissions.ts`, edited on
   `/roles`), checked fresh from the DB via `requirePermission(req, "module.action")`, including on
   `/api/roles/**` and `/api/users/**`. The one narrower exception: creating/promoting/editing/deleting
   a **`super_admin` account** additionally requires `requireSuperAdmin()` — so a delegated
   `users.create`/`users.edit` permission can't mint or hijack its way into a super admin account (see
   `references/routes.md`). Gate a new admin-only screen the same double way: hide the nav item
   client-side (`useCurrentUser().can(...)`) AND re-check server-side, never one without the other.
8. **No inline types** — every `type`/`interface` lives in `lib/types.ts` (or `models/types.ts` for
   Mongoose `*Doc` types), never declared inside a component/route/schema file. (`rules/types.md`)

---

## Layout (high level)
```
app/
├── (app)/                  authenticated pages — Sidebar + Header shell via SidebarProvider
│   ├── dashboard/ invoices/ customers/ groups/ payments/ reports/ settings/ ledger/[clientId]/
│   └── layout.tsx
├── login/                  no sidebar/header
└── globals.css             the entire design system — colors, typography, components, responsive breakpoints
components/
├── Layout/                 Sidebar, Header, Footer, SidebarContext (mobile-drawer state)
├── Common/                 Button, Input, Modal, Toast, Badge, Loader, Skeleton
├── {Feature}/               Client, Invoice, Group, Payment — table + modal per feature
hooks/                      use{Name}.ts — {items, loading, error, refresh}
services/                   http.ts (fetch wrapper) + {name}.service.ts per resource
lib/                        types.ts (ALL app-wide types), constants/ (roles, auth — no static
                             strings anywhere else), env.ts (centralized config), calc.ts, pdf.ts, ...
models/                     Mongoose schemas (backend — don't touch for UI tasks) + types.ts (*Doc types)
```

## Local dev
```bash
npm install
npm run dev              # http://localhost:8000 (port changed from Next.js default, see package.json)
npm run seed:super-admin # creates the super_admin role + super admin user if they don't exist yet
npx tsc --noEmit         # type-check
npx eslint app components lib models scripts services hooks middleware.ts   # lint
```
Config is centralized in one `.env` file (not `.env.local` — see `lib/env.ts`'s header comment) with
an `APP_ENV` switch key (`local`/`staging`/`production`) selecting which `MONGODB_URI_*` is active.
Everything reads from `lib/env.ts`, never `process.env` directly.

## Security
Never commit `.env`, the Mongo connection strings, or `JWT_SECRET` — not in code, commit messages, or
`.claude/`. Real values stay in the gitignored `.env` only.
