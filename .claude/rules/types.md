# TypeScript Types — always in a dedicated file, never inline

**Never declare a `type`/`interface` inside a component, page, API route, service, hook, or model
file.** Every type lives in one of exactly two places:

1. **`lib/types.ts`** — everything else: domain models (`Client`, `Invoice`, `Payment`, `Role`,
   `User`, ...), API/route helper types (`RouteParams`, `ApiResponse`), config types (`AppEnv`),
   auth types (`AuthPayload`), and component-local-looking types that used to live next to their
   component (`ToastKind`, `ButtonVariant`, `SidebarContextValue`, `InvoiceFormRow`, `ReportTab`,
   `LedgerEntry`, `MongooseCache`, `InvoiceLike`, `RoleName`, ...). If in doubt, it goes here.
2. **`models/types.ts`** — Mongoose-inferred `*Doc` types only (`InferSchemaType<typeof XSchema>`),
   since they need to import each model's `Schema`. **Every model file must `export const XSchema`
   by name** (not just the compiled model as default export) so this file can derive its type.

## Why
This was a deliberate, repeated instruction from the project owner: types scattered across
controllers/schemas/components made it too easy to end up with two slightly different shapes for
the "same" thing in two files with no compiler error to catch the drift. One file per category = one
place to look, one place to change, and the compiler catches every call site if a shape changes.

## Rules
- A file that needs a type imports it (`import type { X } from "@/lib/types"` or
  `"@/models/types"`) — it never writes `type X = {...}` or `interface X {...}` itself.
- A local `type Params = RouteParams;` alias inside an API route file is fine — it's a reference to
  the shared shape, not a new declaration of it. Don't inline the `{ params: Promise<{ id: string }> }`
  shape itself again anywhere.
- Adding a brand-new domain concept (a new resource, a new API payload shape, a new component prop
  shape)? Add the type to `lib/types.ts` first, then import it where it's used — never draft it inline
  "for now" in the component/route and mean to move it later.
- Exception: truly generic, one-off inline shapes with zero reuse and zero domain meaning (e.g. an
  inline `{ label: string; value: string }` for a single local `.map()`) are fine as inline
  annotations — this rule targets named `type`/`interface` declarations, not every object shape ever
  written.
