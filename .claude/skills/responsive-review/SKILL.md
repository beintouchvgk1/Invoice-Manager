---
name: responsive-review
description: Audit an existing or newly-built screen in invoice-manager against the mandatory responsive checklist and fix gaps.
---

# Responsive-review skill

Use this when asked to "make sure X is responsive", "check mobile/tablet", or before considering any
new screen finished. Read `.claude/rules/responsive.md` first — this skill is the audit pass for it.

## Procedure
1. Identify every page/component touched or in question.
2. For each, check against `rules/responsive.md`'s checklist:
   - Tables wrapped in `.tw` (not a bare `<table>`).
   - Stat/summary sections use `.sg`/`.sc`, not a hardcoded multi-column grid.
   - Forms use `.fc` + `.g2`/`.g3` + `.fg`, not a fixed-width layout.
   - No hardcoded pixel widths on layout containers (cards, page sections, modals).
   - Loading state is a `Skeleton*` shaped like the real content, not generic/hardcoded-desktop-width.
   - If the page has custom action buttons in the header, confirm they wrap/stack sensibly at
     ≤560px (the `#tb`/`#ta` breakpoint already handles this — verify it wasn't bypassed with inline
     styles).
3. Actually resize (or use the browser's device toolbar) at ~375px, ~820px, and desktop — don't just
   read the CSS and assume. Note anything that overflows, clips, or becomes unreadable.
4. Fix findings by reusing the existing breakpoints/classes in `app/globals.css` first. Only add a new
   media query if the existing breakpoint set genuinely doesn't cover the case — and if you do, place
   it in the same "Responsive" section at the bottom of `globals.css`, matching the existing breakpoint
   values (1024 / 860 / 700 / 560 / 420) rather than picking a new arbitrary number.
5. Re-verify: type-check (`npx tsc --noEmit`) and lint (`npx eslint app components`) after any JSX
   change, and confirm no backend/service/hook logic was touched — this is a UI-only pass.

## Report format
List findings as: screen → what breaks → at what width → the fix applied. Call out explicitly if
nothing was found broken — a clean audit is a valid outcome.
