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
- **Auth**: single hardcoded Admin (`models/Admin.ts`), JWT cookie via `services/auth.service.ts`. There
  is no self-registration and no password-reset flow — don't add UI for either without the user
  explicitly asking for the backend work first (this has come up before: the login page intentionally
  omits "Forgot password?" / "Register" links from a design reference because wiring them would require
  new backend functionality).

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
