# Offline Support

The app works with no internet connection: every page's data stays viewable from cache, and
create/edit/delete on Clients, Payments, Invoices, and Settings queue locally and sync automatically
once the connection returns, with a conflict-resolution UI for anything that changed on the server in
the meantime. **Groups, Roles, and Users stay read-only offline by design** — see the scope notes below
before "fixing" that.

## How it fits the existing three-layer pattern
`services/http.ts` → `services/{name}.service.ts` are **unchanged in shape**. Two new layers sit around
them:

```
                              ┌─ online: passes straight through, unchanged behavior
component/Modal ─ lib/offline/mutate.ts ─┤
                              └─ offline (NetworkError): enqueue + optimistic cache write

service.list()  →  hooks/useOfflineResource.ts  →  hooks/use{Name}.ts  →  page
                         ↕                              ↑
                  lib/offline/cache.ts (Dexie)   lib/offline/syncEngine.ts replays the
                                                  queue on reconnect, patches the same cache
```

`useOfflineResource<T>(resource, fetcher, emptyValue)` is cache-first + revalidate, and also re-reads
the cache whenever `lib/offline/cache.ts`'s `notifyResourceUpdated(resource)` fires (a background sync
write, or an optimistic mutation) — so every open page reflects a change immediately, not just on its
own next `refresh()`. Every existing `use{Name}.ts` hook wraps this and keeps its own field name
(`invoices`, `customers`, ...) — **the public `{items, loading, error, refresh}` shape is unchanged.**

## Making a mutation offline-aware
Don't call `xService.create/update/remove()` directly from a Modal/page for a writable resource — go
through `lib/offline/mutate.ts`:
```ts
if (client) await offlineUpdate("clients", customerService, client._id, payload);
else await offlineCreate("clients", customerService, payload);
// delete:
await offlineDelete("clients", customerService, client._id);
// Settings (singleton, different shape — no create/remove):
await offlineUpdateSettings(settingsService, payload);
```
Online, this behaves exactly like calling the service directly. Offline, it queues the op and returns
an optimistic row (with a `local:<uuid>` id for creates) so the calling Modal's `onSaved()`/`refresh()`
flow needs no changes. See `CustomerModal.tsx`, `PaymentModal.tsx`, `InvoiceForm.tsx`,
`app/(app)/settings/page.tsx` for the wired examples.

## Server-side pieces (required for any resource added to the write queue)
1. **Model**: add `clientOpId: { type: String, default: null, unique: true, sparse: true }` — the
   idempotency key. Without it, a retried sync of an already-committed create double-creates the
   record (and, for Invoices/Payments, burns an extra number from the atomic counter — see
   `models/Invoice.ts`/`models/Payment.ts`'s comments).
2. **POST route**: before creating, check `if (body.clientOpId) { find by clientOpId, return it if
   found }` — BEFORE claiming any atomic counter. Also catch the create's `code === 11000` duplicate-key
   error as a second check (a racing replay can hit the unique index a beat after the `findOne`).
3. **PUT/DELETE routes**: accept `baseUpdatedAt`; use `lib/conflictCheck.ts`'s `updatedAtMismatch(doc,
   body.baseUpdatedAt)` — if true, return `conflict(message, doc.toJSON())` (`lib/response.ts`) instead
   of applying the change. `baseUpdatedAt` is opt-in per request — an ordinary online edit never sends
   it, so this precondition only ever fires when the **sync engine** replays a queued op.

## The queue + sync engine
- `lib/offline/queue.ts` — the Dexie `queue` table. Coalescing rules live in `lib/offline/mutate.ts`:
  a second offline edit folds into the existing pending update (keeping the FIRST edit's
  `baseUpdatedAt`); editing/deleting a still-`local:` (never-synced) record edits/removes the queued
  create directly, with **no network call and no new queued op** — there's nothing on the server yet.
- `lib/offline/syncEngine.ts`'s `runSync()` replays the pending queue in order on reconnect
  (`connectivity.ts` triggers it, plus a 30s heartbeat). A create whose payload still references
  another still-queued create's `local:` temp ID is skipped this pass (checked again next run) —
  that's the one dependency-ordering case handled (e.g. a payment queued against an invoice that was
  also created offline).
- Per op: success removes it from the queue (a create also calls `rewriteTempId(tempId, realId)` so
  every other queued op referencing that temp ID gets updated); a 409 (`ConflictError`, see
  `services/http.ts`) marks it `"conflict"` with the server's doc attached; a network error stops the
  whole run (resumed on the next trigger); any other error (permission revoked mid-offline, 404
  because the record was deleted server-side, validation failure) marks it `"failed"` with the message
  — **never silently retried, never silently dropped.**
- `components/Offline/ConflictModal.tsx` (via `hooks/useConflicts.ts`) shows every `"conflict"`/`"failed"`
  op with a field-by-field "yours vs. server's" diff — **Keep Mine** re-enqueues against the server's
  now-known `updatedAt` (a precise "I've seen it, overwrite it", not a blind force flag); **Keep
  Server's** writes the server version into the cache and drops the op. Failed ops get **Retry**/
  **Discard**. `components/Offline/SyncIndicator.tsx` (mounted in every page's `Header`) shows a small
  pending/issue count and auto-opens the modal the first time an issue appears — dismissing it just
  hides the modal, the indicator badge is the way back in.
- Multi-tab/multi-device coordination is intentionally minimal: a module-level `syncing` flag makes
  re-entrant `runSync()` calls within one tab a no-op, but there's no cross-tab lock (Web Locks API) or
  `BroadcastChannel` cache invalidation. Fine for this app's actual usage pattern (one admin, rarely two
  tabs mutating the same record at once); revisit if that stops being true.

## The invoice/receipt "pending sync" flow
Invoice numbers and receipt numbers come from an atomic MongoDB counter
(`Settings.invoiceNumbering.next{Invoice,Receipt}Counter`) — this cannot be correctly assigned on a
client with no network access (two offline devices could collide). So:
- An invoice/payment created offline gets **no number at all** client-side — the optimistic cache row
  has `__offlinePending: true` and no `invoiceNumber`/`receiptNumber`.
- `InvoiceTable.tsx`/the payments list render a "Pending Sync" badge instead, and disable PDF/print and
  Edit for that row (edit is disabled because `/invoices/[id]/edit` fetches by real server `_id` — a
  `local:` id has nothing to fetch yet). Delete still works (it just drops the queued create).
- Only when `runSync()` actually replays that create against the real POST route does the atomic
  counter get claimed and the real number assigned — `rewriteTempId` then updates every list/cache
  showing that row, with no user action needed.
- Settings' `invoiceNumbering` block (prefix/FY/counters) is **read-only while offline** in
  `app/(app)/settings/page.tsx` (a nested `<fieldset disabled={!online}>`) — there's no sane conflict
  resolution for "you changed the counter offline while the server also assigned numbers from it".

## Scope: what's deliberately excluded, and why
- **Groups** never got the write queue. `/api/groups` returns a *computed aggregate*
  (`{name, members, memberCount, outstanding}`), not the raw Group document — there's no `_id`/
  `updatedAt` on that shape to key a queued op or conflict-check against. Groups stay read-only offline
  (Phase 1 caching only); `GroupModal` still calls `groupService` directly, online-only.
- **Roles and Users** also stay read-only offline on purpose, independent of the aggregate-shape issue
  above — these are admin/security actions, not ordinary data entry; queuing a permission change or a
  user deactivation to replay later is a different risk profile than queuing an invoice edit.
- **No service worker / installable PWA.** The app already works offline *while the tab stays open*; a
  service worker only adds surviving a hard reload while offline, and is the highest-risk, lowest-value
  part for an internal single-firm tool. Add one later (e.g. Serwist) if that specific case matters.
- **PaymentModal's "Against Invoice" dropdown** fetches directly via `invoiceService.list()` in a plain
  `useEffect` (not through `useOfflineResource`) — it silently comes up empty offline rather than using
  the cache. Minor, not wired — the dropdown isn't essential to completing an offline payment (advance
  payment with no invoice is still fully supported).
- **Multi-tab coordination** is minimal — see above. No Web Locks, no BroadcastChannel.
- A record deleted on the server while you have a queued **update** against it surfaces as a `"failed"`
  op ("Client not found", etc.), not a `"conflict"` — the PUT/DELETE routes' `updatedAtMismatch` check
  only runs after confirming the doc still exists; a 404 takes a different path than a 409. Still fully
  visible/actionable in the sync report, just under Failed rather than Conflicts.

## Key files
`lib/offline/{db,cache,connectivity,queue,mutate,syncEngine}.ts` · `hooks/{useOnlineStatus,
useOfflineResource,useSyncStatus,useConflicts}.ts` · `components/Offline/{OfflineBanner,SyncIndicator,
ConflictModal,SyncEngineMount}.tsx` · `services/http.ts` (`NetworkError`, `ConflictError`) ·
`lib/response.ts` (`conflict()`) · `lib/conflictCheck.ts` · `app/api/health/route.ts`.
