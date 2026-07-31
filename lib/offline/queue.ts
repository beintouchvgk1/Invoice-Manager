import { getQueueTable } from "./db";
import type { OfflineWritableResource, QueuedOp, QueuedOpStatus, QueuedOpType } from "@/lib/types";

// Monotonic per-session counter for FIFO ordering — Dexie's own auto-increment
// isn't used since `opId` (a UUID) is the table's primary key, not a numeric id.
let seqCounter = Date.now();
function nextSeq(): number {
  return ++seqCounter;
}

export async function enqueueOp(op: {
  opId: string;
  resource: OfflineWritableResource;
  opType: QueuedOpType;
  targetId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
}): Promise<void> {
  const table = getQueueTable();
  if (!table) return;
  const queued: QueuedOp = {
    ...op,
    seq: nextSeq(),
    status: "pending",
    serverVersion: null,
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  };
  await table.put(queued);
}

export async function listQueue(): Promise<QueuedOp[]> {
  const table = getQueueTable();
  if (!table) return [];
  return table.orderBy("seq").toArray();
}

export async function listByStatus(status: QueuedOpStatus): Promise<QueuedOp[]> {
  const table = getQueueTable();
  if (!table) return [];
  return table.where("status").equals(status).sortBy("seq");
}

export async function updateOp(opId: string, patch: Partial<QueuedOp>): Promise<void> {
  const table = getQueueTable();
  if (!table) return;
  await table.update(opId, patch);
}

export async function removeOp(opId: string): Promise<void> {
  const table = getQueueTable();
  if (!table) return;
  await table.delete(opId);
}

// Finds the (at most one, by construction — see lib/offline/mutate.ts's
// coalescing) queued op still pending against a given record, so a second
// offline edit/delete folds into it instead of piling up a second op.
export async function findPendingOpByTarget(
  resource: OfflineWritableResource,
  targetId: string,
  opType?: QueuedOpType
): Promise<QueuedOp | undefined> {
  const table = getQueueTable();
  if (!table) return undefined;
  const matches = await table.where("resource").equals(resource).and((op) => op.targetId === targetId).toArray();
  const pending = matches.filter((op) => op.status === "pending");
  return opType ? pending.find((op) => op.opType === opType) : pending[0];
}

// A synced create's temp local ID (`local:<uuid>`) becomes a real server _id.
// Any other still-queued op whose payload/targetId referenced that temp ID
// (e.g. a payment created offline against an invoice that was also created
// offline) needs it rewritten so it doesn't try to PUT/DELETE a URL that never
// existed on the server.
function replaceIdDeep<T>(value: T, oldId: string, newId: string): T {
  if (typeof value === "string") return (value === oldId ? newId : value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => replaceIdDeep(v, oldId, newId)) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, replaceIdDeep(v, oldId, newId)])
    ) as unknown as T;
  }
  return value;
}

export async function rewriteTempId(oldId: string, newId: string): Promise<void> {
  const table = getQueueTable();
  if (!table) return;
  const all = await table.toArray();
  await Promise.all(
    all
      .filter((op) => op.targetId === oldId || JSON.stringify(op.payload).includes(oldId))
      .map((op) =>
        table.put({
          ...op,
          targetId: op.targetId === oldId ? newId : op.targetId,
          payload: replaceIdDeep(op.payload, oldId, newId),
        })
      )
  );
}
