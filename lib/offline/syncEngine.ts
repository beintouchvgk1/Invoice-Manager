import { ConflictError, NetworkError } from "@/services/http";
import { customerService } from "@/services/customer.service";
import { invoiceService } from "@/services/invoice.service";
import { paymentService } from "@/services/payment.service";
import { settingsService } from "@/services/settings.service";
import { notifyResourceUpdated, patchCache, writeCache } from "./cache";
import { getOnlineStatus, subscribeOnlineStatus } from "./connectivity";
import { listQueue, removeOp, rewriteTempId, updateOp } from "./queue";
import type { OfflineWritableResource, QueuedOp, Settings, SyncStatus } from "@/lib/types";

// A normalized view of create/update/remove that erases each concrete
// service's specific domain type — the queue only ever has plain
// Record<string, unknown> payloads at this point anyway (they came off
// IndexedDB, not from a typed form), so there's nothing more precise to keep.
type GenericWritableService = {
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  remove: (id: string) => Promise<unknown>;
};

// Every resource's plain online service — the sync engine always replays
// through these directly (never through lib/offline/mutate.ts, which is for
// live user actions and would just re-queue on failure).
const SERVICES: Record<Exclude<OfflineWritableResource, "settings">, GenericWritableService> = {
  clients: customerService as unknown as GenericWritableService,
  payments: paymentService as unknown as GenericWritableService,
  invoices: invoiceService as unknown as GenericWritableService,
};

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();
let syncing = false;

async function currentStatus(): Promise<SyncStatus> {
  const all = await listQueue();
  return {
    pendingCount: all.filter((op) => op.status === "pending").length,
    conflictCount: all.filter((op) => op.status === "conflict").length,
    failedCount: all.filter((op) => op.status === "failed").length,
    syncing,
  };
}

async function emitStatus(): Promise<void> {
  const status = await currentStatus();
  listeners.forEach((fn) => fn(status));
}

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  currentStatus().then(fn);
  return () => listeners.delete(fn);
}

// A create op's payload/list-row for a resource still referencing a `local:`
// temp ID (e.g. a payment created offline against an invoice created offline,
// or an invoice against a client created offline) can't be replayed yet — its
// dependency hasn't been assigned a real _id. Re-checked every run since the
// dependency itself may clear on an earlier op in the same run.
function isBlocked(op: QueuedOp, stillPendingCreateTempIds: Set<string>): boolean {
  if (op.opType !== "create") return false;
  const payloadStr = JSON.stringify(op.payload);
  for (const tempId of stillPendingCreateTempIds) {
    if (tempId !== op.targetId && payloadStr.includes(tempId)) return true;
  }
  return false;
}

async function replaySettingsOp(op: QueuedOp): Promise<"ok" | "conflict" | "network" | "failed"> {
  try {
    const updated = await settingsService.update({ ...op.payload, baseUpdatedAt: op.baseUpdatedAt } as Partial<Settings>);
    await writeCache("settings", updated);
    notifyResourceUpdated("settings");
    await removeOp(op.opId);
    return "ok";
  } catch (e) {
    if (e instanceof ConflictError) {
      await updateOp(op.opId, { status: "conflict", serverVersion: e.serverDoc });
      return "conflict";
    }
    if (e instanceof NetworkError) return "network";
    await updateOp(op.opId, { status: "failed", lastError: e instanceof Error ? e.message : "Sync failed", attempts: op.attempts + 1 });
    return "failed";
  }
}

async function replayOp(op: QueuedOp): Promise<"ok" | "conflict" | "network" | "failed"> {
  if (op.resource === "settings") return replaySettingsOp(op);

  const service = SERVICES[op.resource as Exclude<OfflineWritableResource, "settings">];
  try {
    if (op.opType === "create") {
      const created = await service.create({ ...op.payload, clientOpId: op.opId });
      // Rewrite the temp ID everywhere (queue + cache) to the real server _id.
      await rewriteTempId(op.targetId, created._id as string);
      await patchCache<Record<string, unknown>[]>(op.resource, [], (list) =>
        list.map((row) => (row._id === op.targetId ? created : row))
      );
      notifyResourceUpdated(op.resource);
    } else if (op.opType === "update") {
      const updated = await service.update(op.targetId, { ...op.payload, baseUpdatedAt: op.baseUpdatedAt });
      await patchCache<Record<string, unknown>[]>(op.resource, [], (list) =>
        list.map((row) => (row._id === op.targetId ? updated : row))
      );
      notifyResourceUpdated(op.resource);
    } else {
      await service.remove(op.targetId);
      await patchCache<Record<string, unknown>[]>(op.resource, [], (list) => list.filter((row) => row._id !== op.targetId));
      notifyResourceUpdated(op.resource);
    }
    await removeOp(op.opId);
    return "ok";
  } catch (e) {
    if (e instanceof ConflictError) {
      await updateOp(op.opId, { status: "conflict", serverVersion: e.serverDoc });
      return "conflict";
    }
    if (e instanceof NetworkError) return "network";
    // A 4xx (e.g. permission revoked mid-offline, referential check failed) —
    // never silently retried, never silently dropped; surfaced in the sync
    // report with the payload preserved so no offline work is lost invisibly.
    await updateOp(op.opId, { status: "failed", lastError: e instanceof Error ? e.message : "Sync failed", attempts: op.attempts + 1 });
    return "failed";
  }
}

// See the call site in runSync(): rescues ops stranded behind a dependency
// that can no longer succeed, so they surface in the sync report instead of
// sitting in an invisible "pending" limbo.
async function failOpsBlockedByDeadDependency(): Promise<void> {
  const all = await listQueue();
  const deadTempIds = new Set(
    all
      .filter((op) => op.opType === "create" && (op.status === "failed" || op.status === "conflict"))
      .map((op) => op.targetId)
  );
  if (!deadTempIds.size) return;

  for (const op of all.filter((o) => o.status === "pending")) {
    if (!isBlocked(op, deadTempIds)) continue;
    await updateOp(op.opId, {
      status: "failed",
      lastError: "Depends on another offline change that couldn't be synced. Resolve that one first, then retry this.",
      attempts: op.attempts + 1,
    });
  }
}

// Runs the whole pending queue in FIFO order. Safe to call repeatedly/
// concurrently — a module-level flag makes re-entrant calls within one tab a
// no-op (cross-tab coordination is intentionally out of scope; see
// references/offline.md).
export async function runSync(): Promise<void> {
  if (syncing) return;
  if (!getOnlineStatus()) return;

  const all = await listQueue();
  const pending = all.filter((op) => op.status === "pending");
  if (!pending.length) return;

  syncing = true;
  await emitStatus();

  try {
    const stillPendingCreateTempIds = new Set(
      pending.filter((op) => op.opType === "create").map((op) => op.targetId)
    );

    let networkDropped = false;
    for (const op of pending) {
      if (isBlocked(op, stillPendingCreateTempIds)) continue;

      const result = await replayOp(op);
      if (result === "ok" && op.opType === "create") stillPendingCreateTempIds.delete(op.targetId);
      if (result === "network") {
        networkDropped = true;
        break; // connection dropped mid-run — stop, resume next trigger
      }
      await emitStatus();
    }

    // An op waiting on another offline create can only ever succeed once that
    // create does. If the dependency ended in conflict/failed instead, the
    // dependent would sit at "pending" forever — an unexplained "1 pending
    // sync" badge that never clears and never appears in the sync report.
    // Surface it as failed so it shows up with an actionable message. Skipped
    // when the run was cut short by the connection dropping: those
    // dependencies are still legitimately pending, just not reached yet.
    if (!networkDropped) await failOpsBlockedByDeadDependency();
  } finally {
    syncing = false;
    await emitStatus();
  }
}

let initialized = false;
export function initSyncEngine(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  subscribeOnlineStatus((online) => {
    if (online) void runSync();
  });
  if (getOnlineStatus()) void runSync();
  // Heartbeat while anything's pending, in case a probe/online-event was missed.
  setInterval(() => {
    if (getOnlineStatus()) void runSync();
  }, 30000);
}
