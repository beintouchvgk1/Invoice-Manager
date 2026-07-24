# VGK Invoice Manager — Design System Reference

Project: internal billing/invoicing tool for a single-admin accounting practice (V G K & CO).
Design language: clean, professional, blue + white, data-dense but airy. Plain CSS (no Tailwind, no
component library) — every visual rule lives in `app/globals.css` and is applied via semantic class
names (`.btn`, `.fc`, `.tw`, `.bd`, …), never inline hex colors or ad-hoc styles.

---

## Color tokens (`:root` in `app/globals.css`)

| Token | Hex | Usage |
|---|---|---|
| `--primary` | `#1d4ed8` (blue-700) | Primary actions, active nav, links |
| `--primary-dark` | `#1e40af` (blue-800) | (kept for reference; primary buttons use a gradient, not a flat hover shade) |
| `--primary-soft-bg` / `--primary-soft-border` | `#eff6ff` / `#bfdbfe` | Secondary "soft" button (`.bg`), soft badges/tints |
| `--success` / `--success-bg` / `--success-border` | `#059669` / `#ecfdf5` / `#a7f3d0` | Paid, received, positive states |
| `--warning` / `--warning-bg` / `--warning-border` | `#d97706` / `#fffbeb` / `#fde68a` | Partial, pending, ageing 31–60d |
| `--danger` / `--danger-bg` / `--danger-border` | `#dc2626` / `#fef2f2` / `#fecaca` | Unpaid, overdue, delete |
| `--sidebar-bg` / `--sidebar-border` | `#0f172a` / `#1e293b` | Sidebar (rendered with a gradient, see below) |
| `--bg-body` | `#f8fafc` (slate-50) | Page background |
| `--surface` | `#ffffff` | Cards, tables, modals, header |
| `--border` / `--border-soft` | `#e2e8f0` / `#f1f5f9` | Card/table borders vs. row dividers |
| `--text-primary` / `--text-secondary` / `--text-muted` / `--text-dim` | `#0f172a` / `#334155` / `#64748b` / `#94a3b8` | Headings / body / labels / placeholders |

**Never** introduce a hex value or Tailwind-style color outside this table. If a new state needs a
color, map it to the closest existing semantic token (success/warning/danger/primary) — don't invent
a new hue. Gold/maroon/navy (`#C8A84B`, `#1B3A6B`, etc.) are the **old** theme and must never reappear.

### Gradients (the "signature" look — apply, don't flatten)
- Primary buttons (`.bp`), the login `.pill-btn`, the active sidebar nav item, and the active report
  tab (`.rtab.active`) all use `linear-gradient(135deg, var(--primary), #3b82f6)` with a soft blue
  box-shadow (`rgba(29, 78, 216, 0.25-0.35)`). Any **new** primary CTA must use this same gradient —
  never a flat `background: var(--primary)`.
- The sidebar (`#sb`) uses a layered look: a radial blue glow behind the logo plus a diagonal
  `linear-gradient(200deg, #1e3a8a → #1e293b → #0f172a → #0b1120)` and a subtle diagonal light sheen
  (`#sb::after`). Don't flatten this back to a single solid color.

---

## Typography

Font: **Inter** via `next/font/google` (`app/layout.tsx`, exposed as `--font-sans`), system-ui fallback.

| Level | Selector / class | Style |
|---|---|---|
| Page title | `#tb h2` | 18px, 600, `--text-primary` |
| Card section title | `.fc h3` | 11.5px, 700, uppercase, letter-spacing .05em |
| Stat label | `.sc .lb` | 10.5px, 700, uppercase, `--text-muted` |
| Stat value | `.sc .vl` | 21px, 700, `--text-primary` |
| Table header | `thead th` | 10.5px, 700, uppercase, `--text-muted` |
| Table cell | `tbody td` | 12.5px, `--text-secondary` |
| Form label | `.fg label` | 11.5px, 600, `--text-secondary` |
| Badge text | `.bd` | 11px, 600 |

---

## Components (use these classes — don't invent parallel ones)

| Need | Class / component |
|---|---|
| Primary button | `<Button variant="bp">` or `className="btn bp"` (gradient) |
| Soft/secondary button | `variant="bg"` — light blue tint, used for less-primary CTAs (Ledger, Save & Print) |
| Neutral/cancel button | `variant="bs"` — white with slate border |
| Destructive button | `variant="brd"` — solid red |
| Small button | add `sm` prop / `sm` class |
| Card / panel | `.fc` (form card) or `.sc` (stat card, has a colored left border) |
| Table | wrap in `.tw` (adds border/shadow/radius **and** horizontal scroll — see responsive rules) |
| Status badge | `<StatusBadge status={...}/>` (Paid/Partial/Unpaid) or raw `.bd .bpd/.bok/.bun` — **always
  rounded-md (`var(--radius-md)`), never pill/rounded-full** |
| Modal | `<Modal open onClose>` → `#ov`/`#mb`, already responsive (`width:92%`, `max-height:90vh`) |
| Form grid | `.g2` (2-col) / `.g3` (3-col) inside `.fc`, full-width field gets `.fl` |
| Inline validation banner | `<Toast kind="ok"|"err" message="...">` — an inline banner next to the field/modal it's about. |
| Standalone notification | `useToast().showToast(message, kind?)` (`hooks/useToast.ts`, provider in `components/Common/ToastProvider.tsx`, wrapped once at the root `app/layout.tsx`) — a floating, auto-dismissing toast (top-right). Use this for fire-and-forget feedback on an action with no adjacent form/modal (e.g. a table-row toggle) — **never** `alert()`/`confirm()`-style browser popups for messaging. `confirm()` is still fine for its existing yes/no delete-confirmation use — this only replaces `alert()`. |
| Loading state | a `Skeleton*` component from `components/Common/Skeleton.tsx` (see below) — **never** plain "Loading…" text or a spinner for a full screen/section |
| Native `<select>` | any plain `<select>` automatically gets the themed chevron via the global `select {}` rule — don't add a UI library `Select` component |

### Loading state — Skeletons are mandatory for new screens
`components/Common/Skeleton.tsx` exports:
- `SkeletonBlock` — a single shimmering rectangle (build anything custom from these)
- `SkeletonStatGrid` — mirrors `.sg` stat-card rows
- `SkeletonTable` — mirrors `.tw` table rows (pass `columns`/`rows` to match the real table)
- `SkeletonFormCard` — mirrors a `.fc` form card

Every new page's `loading ? ... : ...` branch must render a skeleton shaped like that page's real
layout (stat grid + table, form cards, etc.) — copy the pattern from an existing page
(`app/(app)/dashboard/page.tsx`, `app/(app)/settings/page.tsx`) rather than reusing a generic spinner.

### Sidebar & navigation
- `components/Layout/Sidebar.tsx` — desktop rail with a user-toggleable collapse (persisted to
  `localStorage` under `vgk_sidebar_collapsed`), and an off-canvas drawer mode below 1024px (see
  `rules/responsive.md`). Adding a nav item: add one entry to the `NAV` array (icon path + href +
  label) — nothing else needs to change, the responsive/collapse behavior is automatic.
- `components/Layout/Header.tsx` — every page's header. Takes `title` and optional `actions` (right-
  aligned buttons). The hamburger button is built in; don't add another one.
- `components/Layout/SidebarContext.tsx` — the only piece of shared UI state in the app (mobile drawer
  open/closed). Don't repurpose it for anything else.

### Icons
Inline SVG only (see the `ICONS` map in `Sidebar.tsx` for the pattern: 24x24 viewBox, `stroke="currentColor"`,
`strokeWidth="2"`). No icon library dependency (no lucide-react, no react-icons) — keep it that way.
