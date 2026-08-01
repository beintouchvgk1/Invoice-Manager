import { customerService } from "@/services/customer.service";
import { invoiceService } from "@/services/invoice.service";
import { paymentService } from "@/services/payment.service";
import { groupService } from "@/services/group.service";
import { settingsService } from "@/services/settings.service";
import { roleService } from "@/services/role.service";
import { userService } from "@/services/user.service";
import { notifyResourceUpdated, writeCache } from "./cache";
import { listQueue } from "./queue";
import { precacheRoutes } from "./precacheRoutes";
import type { Client, Invoice, OfflineResource } from "@/lib/types";

// /ledger/[clientId] and /invoices/[id]/edit are dynamic routes — there's no
// fixed URL list to precache, so they're derived from whatever actually got
// cached. Capped so a firm with thousands of records doesn't fire thousands of
// document requests on every login; anything past the cap still works online
// and falls back to the friendly /offline page if opened cold offline.
const DYNAMIC_PRECACHE_CAP = 40;

// Every readable resource, fetched up-front so going offline doesn't depend on
// which pages the user happened to open first.
//
// Why this exists: useOfflineResource only ever caches a resource when a page
// using it actually mounts online. So a user who logged in, sat on the
// Dashboard, then lost connection had NO cached groups/settings/roles/users —
// and any dropdown sourced from those (the Client picker in PaymentModal, the
// Group picker in CustomerModal, firm details for a PDF) silently came up
// empty offline. Warming every resource once, up-front, is what makes "the
// whole app works offline" actually true rather than "whatever you happened to
// visit works offline".
const WARM_JOBS: Array<[OfflineResource, () => Promise<unknown>]> = [
  ["clients", () => customerService.list()],
  ["invoices", () => invoiceService.list()],
  ["payments", () => paymentService.list()],
  ["groups", () => groupService.list()],
  ["settings", () => settingsService.get()],
  ["roles", () => roleService.list()],
  ["users", () => userService.list()],
];

export async function warmOfflineCaches(): Promise<void> {
  // A pending queue means the cache holds optimistic rows the server doesn't
  // know about yet — overwriting it with a fresh server snapshot would make
  // the user's unsynced work vanish from the UI. Skip entirely; the sync
  // engine drains the queue first, and the caller re-warms once it's empty.
  const pending = await listQueue().catch(() => []);
  if (pending.length > 0) return;

  const fetched: Partial<Record<OfflineResource, unknown>> = {};

  await Promise.all(
    WARM_JOBS.map(async ([resource, fetcher]) => {
      try {
        const data = await fetcher();
        await writeCache(resource, data);
        fetched[resource] = data;
        notifyResourceUpdated(resource);
      } catch {
        // Offline, or this role lacks permission for that endpoint (a user
        // without users.view legitimately 401s on /api/users). Either way the
        // resource just stays uncached — never a reason to fail the others.
      }
    })
  );

  const clients = (fetched.clients as Client[] | undefined) ?? [];
  const invoices = (fetched.invoices as Invoice[] | undefined) ?? [];
  await precacheRoutes([
    ...clients.slice(0, DYNAMIC_PRECACHE_CAP).map((c) => `/ledger/${c._id}`),
    // A `local:` id is a not-yet-synced offline creation — there's no server
    // route for it to fetch, and its Edit action is disabled until it syncs.
    ...invoices
      .filter((i) => !String(i._id).startsWith("local:"))
      .slice(0, DYNAMIC_PRECACHE_CAP)
      .map((i) => `/invoices/${i._id}/edit`),
  ]).catch(() => {});
}
