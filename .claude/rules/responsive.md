# Responsive Design Rules — mandatory for every screen

Every screen and component in this app must work from a small phone up through iPad and desktop.
This is a hard requirement, not a nice-to-have — treat a new page that only looks right at desktop
width as an unfinished implementation, the same way you'd treat a broken save button.

## The breakpoints already in `app/globals.css` (reuse them, don't invent new ones)
| Breakpoint | What changes |
|---|---|
| `max-width: 1024px` | Sidebar becomes an off-canvas drawer (hamburger in `Header`, backdrop, close button) |
| `max-width: 860px` | 4-col stat grid (`.sg`) → 2-col; 3-col form grid (`.g3`) → 2-col |
| `max-width: 700px` | Form grids (`.g2`/`.g3`) → 1-col; header/content/card/modal padding tightens |
| `max-width: 560px` | Stat grid → 1-col; header title/actions stack vertically with full-width buttons; invoice line-item row wraps; report tabs go full-width; login card shrinks; ledger balance cards shrink |
| `max-width: 420px` | Modal padding tightens further |

## Checklist for any new screen or component
Run through this before considering a new feature UI done:

- [ ] **Sidebar/header**: if the page uses `<Header>`, the hamburger + drawer behavior is automatic —
      don't add a second nav toggle or duplicate the drawer logic.
- [ ] **Tables**: wrapped in `.tw` (gives horizontal scroll on narrow screens automatically). Don't try
      to make every column fit a phone width — letting the table scroll horizontally is the correct,
      established pattern here (see `rules/styling.md` #5). Don't build a "card view" alternative
      unless explicitly asked — it would be a bigger structural change than this app's pattern uses.
- [ ] **Stat/summary cards**: use `.sg` + `.sc` (already collapses 4 → 2 → 1 columns). Don't hardcode
      a fixed number of columns with `grid-template-columns: repeat(4, ...)` in a new rule.
- [ ] **Forms**: use `.fc` + `.g2`/`.g3` + `.fg` (already collapses to 1 column ≤700px). Don't set a
      fixed pixel width on a form card or field.
- [ ] **No fixed pixel widths on layout containers.** Use `%`, `flex`, `grid`, or `max-width` with a
      sensible cap — never `width: 600px` on something that should reflow. (Fixed widths are fine for
      small atomic things like a stat card's min-width or an icon.)
- [ ] **Touch targets**: interactive elements (buttons, nav links, table action buttons) should stay
      comfortably tappable — don't shrink `.btn`/`.sm` padding further for a "compact" look.
- [ ] **Test at least 3 widths** before calling a screen done: ~375px (phone), ~820px (iPad
      portrait/landscape boundary), and desktop (≥1280px). Resize the browser or use dev-tools' device
      toolbar — don't eyeball it at one width only.
- [ ] **Loading state matches the real layout** at every width — a `Skeleton*` composed from
      `components/Common/Skeleton.tsx` reflows with the same CSS classes as the real content, so if the
      real content is responsive, the skeleton already is too. Don't hardcode skeleton widths that only
      look right on desktop.

## What "responsive" does NOT mean here
- It does not mean rebuilding tables as stacked cards on mobile — this app's established pattern is
  horizontal table scroll (see `rules/styling.md`). Don't introduce a second table pattern.
- It does not mean adding a mobile-specific route or duplicate component — one component, styled
  responsively via the existing breakpoints, always.
- It does not mean touching backend/services/hooks — responsiveness is a `globals.css` + component
  markup concern only. If a screen "needs" different data at different widths, that's a product
  decision to raise with the user, not something to silently implement.
