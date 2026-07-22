---
name: add-feature
description: Scaffold a brand-new feature (type → service → hook → page → nav) in the invoice-manager app, on-theme and responsive from the start.
---

# Add-feature skill — VGK Invoice Manager

Use this when asked to add a genuinely new resource/screen (not a tweak to an existing one). Follows
this app's plain fetch/hooks architecture — see `.claude/rules/data-pattern.md` for the exact layer
contracts referenced below.

## Steps
1. **Type** — add the shape to `lib/types.ts` (or extend an existing type) if the feature needs a new
   domain object. Match whatever the backend model/API actually returns; check `models/*.ts` and the
   relevant `app/api/**/route.ts` before guessing field names.
2. **Backend** — if the API route doesn't exist yet, that's a backend task, not a UI one. Confirm with
   the user before adding new `app/api/**` routes or `models/**` changes — this project's owner has
   been explicit that UI work should not silently grow into backend work.
3. **Service** — `services/{name}.service.ts` following `rules/data-pattern.md` step 2 exactly
   (`list`/`get`/`create`/`update`/`remove` over `services/http.ts`).
4. **Hook** — `hooks/use{Name}.ts` following `rules/data-pattern.md` step 3 (`{items, loading, error,
   refresh}` shape — keep this shape consistent with `useCustomers`/`useInvoices`/etc.).
5. **Components** — table/list component and an edit `Modal` under `components/{Feature}/`, styled per
   the `ui-design` skill (gradient primary button, `.tw` table, `.fc`/`.g2` modal form, skeleton
   loading state).
6. **Page** — `app/(app)/{route}/page.tsx`: `<Header>` + loading-skeleton branch + the real component.
7. **Navigation** — add to `NAV` in `components/Layout/Sidebar.tsx` and to the route table in
   `.claude/references/routes.md`.
8. **Responsive check** — run the checklist in `.claude/rules/responsive.md` before calling it done.

## What NOT to do
- Don't reach for RTK Query, React Query, Zustand, or any new state library — the hook pattern above
  is the whole state layer for this app.
- Don't add Tailwind/shadcn "just for this one screen" — stay in `app/globals.css`.
- Don't invent a floating-toast notification system — inline `<Toast>` banners are the established
  pattern (see `references/design-system.md`).
