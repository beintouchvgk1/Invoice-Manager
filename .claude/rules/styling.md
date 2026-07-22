# Styling Rules

This app uses **plain CSS** (`app/globals.css`), not Tailwind/shadcn — every rule below is enforced
through semantic class names, not utility classes or inline styles.

## Hard rules
1. **No Tailwind, no CSS-in-JS, no new component library.** All styling goes into `app/globals.css`
   as a class rule, reusing the CSS custom properties in `:root`. Inline `style={{}}` is only for a
   handful of pre-existing one-off cases (e.g. dynamic left-border color on a stat card) — don't make
   it the default way to style a new element.
2. **Colors only from `references/design-system.md`'s token table.** If you write a raw hex value
   that isn't already one of those tokens, stop — map it to the nearest semantic token instead.
3. **Badges are rectangular (`var(--radius-md)`), never pill/`rounded-full`.** This was a deliberate
   correction — don't reintroduce `border-radius: 999px` on `.bd`.
4. **Primary CTAs use the gradient**, not a flat `background: var(--primary)`. Copy `.bp` or
   `.pill-btn` rather than writing a new flat-blue button class.
5. **Tables always go inside `.tw`.** It already provides the border/radius/shadow **and** the
   horizontal-scroll behavior new tables need on narrow screens — don't wrap a table in a plain `<div>`.
6. **Loading states use a `Skeleton*` component** from `components/Common/Skeleton.tsx`, shaped like
   the real content. Never plain text ("Loading…") or a bare spinner for a full section — the
   spinner in `Loader.tsx` is used in exactly one place today (the `Suspense` fallback in
   `payments/page.tsx`) and should stay the exception, not the pattern to copy.
7. **Forms:** wrap fields in `.fg` inside a `.g2`/`.g3` grid inside a `.fc` card. A field that should
   span the full row gets `.fl`. Don't hand-roll flex layouts for form rows.
8. **Modals:** use the existing `<Modal>` component (`#ov`/`#mb`) — footer is always Cancel
   (`bs`) on the left, Save (`bp`) on the right, both disabled while a mutation is in flight.
9. **Icons:** inline SVG following the pattern in `Sidebar.tsx`'s `Icon`/`ICONS` — no icon library.
10. **Every new screen must be responsive by construction** — see `rules/responsive.md`. This is not
    optional polish; treat a new screen that only works at desktop width as incomplete.

## Before writing a new class
Check `app/globals.css` for something close first — this file already covers buttons, cards, tables,
badges, forms, modals, alerts, report tabs, stat cards, invoice line-item rows, and the full responsive
breakpoint set. A new screen should almost always be composable from existing classes; only add a new
CSS rule for a genuinely new visual pattern, and add it to the design-system reference doc when you do.
