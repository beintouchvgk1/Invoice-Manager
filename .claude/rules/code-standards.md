# Code Standards — VGK Invoice Manager

## Scope discipline (the rule that matters most)
This is a small, single-admin internal tool. The owner has repeatedly asked that UI/design work
**never** touch backend routes (`app/api/**`), models (`models/**`), or business logic/flow in
services/hooks — only presentation. Before editing anything outside `app/**/page.tsx` styling,
`components/**`, and `app/globals.css`, stop and confirm it's actually a UI-only change.

## Shared code — check callers before changing
`hooks/`, `services/`, `lib/`, and `components/Common/*` are used across multiple pages. Before
modifying one:
1. `grep -rn "functionOrComponentName" app components` to find every caller.
2. Read each caller. If your change alters behavior for any of them, don't modify in place — add a
   new function/component instead, or scope the change so existing callers are unaffected (e.g. a new
   optional prop with a safe default is fine; changing what a hook returns is not).
3. This applies especially to `Loader`, `Toast`, `Modal`, `Button`, `Input`, `Badge` — every page uses
   these, so a "small" change ripples everywhere.

## Architecture (know this before adding a feature)
- **No RTK Query / Redux / TanStack Query** — data fetching is plain `fetch` wrapped by `services/http.ts`
  (`http.get/post/put/del`, throws on non-2xx or `{success:false}`), called from a `services/{name}.service.ts`
  file, consumed by a `hooks/use{Name}.ts` hook that owns `loading`/`error`/`refresh` state. Follow this
  exact three-layer pattern for a new resource — see `rules/data-pattern.md`.
- **No Tailwind/shadcn** — see `rules/styling.md`.
- **Auth**: `User` (`models/User.ts`: email/password/phone/roleId) + `Role` (`models/Role.ts`:
  name/description/isActive/permissions), JWT cookie via `services/auth.service.ts`. Login is by
  email. Roles carry a granular `permissions: string[]` (catalog in `lib/constants/permissions.ts`),
  checked fresh from the DB per-request via `requirePermission(req, "module.action")` (a `super_admin`
  always passes). Gate a new feature route/nav item the same double way: hide the nav item client-side
  (`useCurrentUser().can(...)`) AND re-check server-side, never one without the other. `roles`/`users`
  are ordinary assignable modules too (`/api/roles/**`, `/api/users/**` use `requirePermission()` like
  everything else) — the one narrower exception is that creating/promoting/editing/deleting a
  **`super_admin` account specifically** additionally requires `requireSuperAdmin()`, so a delegated
  `users.create`/`users.edit` permission can't be used to mint or hijack a super admin account (see
  `references/routes.md`). There is still no public self-registration or self-service password-reset —
  accounts are created by an authorized user via the Users tab, not signed up by the end user.
- **No static role/status/mode strings** — anything enum-like (role names, permission keys, cookie
  name, token TTL) lives in `lib/constants/` and is imported, never re-typed as a literal string in a
  second file.

## TypeScript
- Domain types live in `lib/types.ts` — import from there (`references/types.md`),
  never redeclare a shape inline.
- No `any`. If a cast is unavoidable, comment why.

## Naming
- Feature pages: `app/(app)/{route}/page.tsx` (thin — logic can live directly in the page component in
  this codebase, unlike a strict "page vs. feature component" split; keep it consistent with the
  existing pages rather than introducing a new folder convention).
- Hooks: `use{Name}.ts` in `hooks/`.
- Services: `{name}.service.ts` in `services/`.
- Components: `PascalCase.tsx`, grouped by feature under `components/{Feature}/`.

## Comments
Write none unless the *why* is non-obvious (a workaround, a hidden constraint). Never restate what the
code already says.
