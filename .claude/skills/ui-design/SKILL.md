---
name: ui-design
description: Apply the VGK blue+white design system — and mandatory responsive behavior — to new or changed UI in the invoice-manager app.
---

# UI Design skill — VGK Invoice Manager

Use this whenever you're building a new screen, adding a section to an existing one, or asked to
"polish"/"enhance" the UI. It packages the project's design system and its non-negotiable responsive
requirement into one recipe, so nothing gets built desktop-only or off-theme by accident.

## Before writing any markup
1. Read `.claude/references/design-system.md` — the color tokens, typography scale, gradient rule,
   and the component-to-class mapping. Don't invent a new visual style; compose from what's there.
2. Read `.claude/rules/styling.md` and `.claude/rules/responsive.md` — the hard rules and the
   responsive checklist. Treat the responsive checklist as part of "done", not a follow-up pass.

## Recipe for a new screen
1. **Shell**: `<Header title="..." actions={...}/>` then `<div id="ct">...</div>` — the hamburger/
   drawer/collapse sidebar behavior is automatic, don't touch it.
2. **Loading state**: build the `loading ? <Skeleton...> : <RealContent>` branch using
   `components/Common/Skeleton.tsx` primitives, shaped like the real layout (stat grid? table? form
   cards?). Copy the closest existing page as a template rather than starting from scratch.
3. **Data display**:
   - Tabular data → `.tw` wrapper + `<table>` (never a bare `<table>` — you lose the scroll behavior).
   - Summary numbers → `.sg` + `.sc` stat cards (colored left border per semantic meaning: primary/
     success/warning/danger — see the token table).
   - Forms → `.fc` card + `.g2`/`.g3` grid of `.fg` fields, `.fl` for full-width fields.
   - Status → `<StatusBadge>` or `.bd` + the matching semantic modifier class (`.bpd`/`.bok`/`.bun`).
4. **Actions**: primary CTA is `.btn.bp` (gradient) or `<Button variant="bp">`; secondary is `.bs`;
   soft/secondary-emphasis is `.bg`; destructive is `.brd`. Never a flat custom-colored button.
5. **Modals** for create/edit: `<Modal>` wrapper, `.g2`/`.fg` fields inside, Cancel (`bs`) left /
   Save (`bp`) right footer, both disabled while busy, `<Toast kind="err">` for inline errors.
6. **Responsive pass** (not optional — do this before considering the screen finished):
   - Resize to ~375px, ~820px, and desktop. Confirm the table scrolls horizontally instead of
     breaking, the stat/form grids collapse to fewer columns, and nothing overflows the viewport.
   - If you added any new CSS rule with a fixed multi-column grid or a fixed pixel width on a layout
     container, that's a signal you bypassed the existing responsive primitives — go back and use
     `.sg`/`.g2`/`.g3`/`.tw` instead, or add a matching breakpoint in `app/globals.css` next to the
     existing ones (see `rules/responsive.md` for the breakpoint list).
7. **Wire into navigation**: add the route to `.claude/references/routes.md`'s table and a `NAV` entry
   in `Sidebar.tsx` (icon path using the existing inline-SVG pattern).

## Guardrails
- Don't touch `app/api/**`, `models/**`, or hook/service logic for a "UI" task — see
  `rules/code-standards.md`'s scope-discipline section. If a design change seems to need new backend
  behavior (e.g. a field that doesn't exist yet), stop and flag it to the user instead of inventing it.
- Don't add a new component library, icon set, or CSS framework. Everything above is achievable with
  the existing `app/globals.css` classes and inline SVG icons.
