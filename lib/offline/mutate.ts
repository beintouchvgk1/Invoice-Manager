import { NetworkError } from "@/services/http";
import { notifyResourceUpdated, patchCache, readCache, writeCache } from "./cache";
import {
  enqueueOp as enqueueOpRaw,
  findPendingOpByTarget,
  removeOp as removeOpRaw,
  updateOp as updateOpRaw,
} from "./queue";
import { refreshSyncStatus } from "./syncEngine";
import type { OfflineWritableResource, Settings, WritableService } from "@/lib/types";

// Every queue write in this file goes through these thin wrappers so anything
// watching useSyncStatus() — the "N pending sync" badge, the unsynced-work
// guard on logout — updates the moment a change is queued. Writing to Dexie
// directly notifies nobody, so those used to sit stale until the next sync run
// or the 30-second heartbeat, which made the logout guard miss recent work.
const enqueueOp: typeof enqueueOpRaw = async (op) => {
  await enqueueOpRaw(op);
  await refreshSyncStatus();
};
const removeOp: typeof removeOpRaw = async (opId) => {
  await removeOpRaw(opId);
  await refreshSyncStatus();
};
const updateOp: typeof updateOpRaw = async (opId, patch) => {
  await updateOpRaw(opId, patch);
  await refreshSyncStatus();
};

type Row = { _id: string; updatedAt?: string; __offlinePending?: boolean };

function newTempId(): string {
  return `local:${crypto.randomUUID()}`;
}

function isLocalId(id: string): boolean {
  return id.startsWith("local:");
}

async function patchList<T extends Row>(resource: OfflineWritableResource, updater: (list: T[]) => T[]): Promise<void> {
  await patchCache<T[]>(resource, [], updater);
  notifyResourceUpdated(resource);
}

// --- CREATE -----------------------------------------------------------------
// Online: behaves exactly as a direct service.create() call always has (just
// with a clientOpId attached, invisible to the server unless it's replaying).
// Offline: queues the create, and returns an optimistic row with a `local:`
// temp _id so the calling Modal's onSaved()/refresh() flow works unmodified.
export async function offlineCreate<T extends Row>(
  resource: OfflineWritableResource,
  service: WritableService<T>,
  payload: Record<string, unknown>
): Promise<T> {
  const clientOpId = crypto.randomUUID();
  try {
    // Cast unavoidable: payload is a plain form-data record at this generic
    // boundary, and TS can't verify it matches Partial<T> for an arbitrary T —
    // the concrete services (customerService, etc.) validate/shape it server-side.
    const created = await service.create({ ...payload, clientOpId } as unknown as Partial<T> & Record<string, unknown>);
    await patchList<T>(resource, (list) => [...list, created]);
    return created;
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;
    const tempId = newTempId();
    const optimistic = { ...payload, _id: tempId, __offlinePending: true } as unknown as T;
    await enqueueOp({ opId: clientOpId, resource, opType: "create", targetId: tempId, payload, baseUpdatedAt: null });
    await patchList<T>(resource, (list) => [...list, optimistic]);
    return optimistic;
  }
}

// --- UPDATE -------------------------------------------------------------------
export async function offlineUpdate<T extends Row>(
  resource: OfflineWritableResource,
  service: WritableService<T>,
  id: string,
  payload: Record<string, unknown>
): Promise<T> {
  const cachedList = (await readCache<T[]>(resource)) ?? [];
  const existing = cachedList.find((r) => r._id === id);

  // Still only a local, never-synced record — there's nothing on the server to
  // PUT to yet. Fold this edit into the queued create instead of hitting the
  // network at all (works the same whether we're online or offline).
  if (isLocalId(id)) {
    const createOp = await findPendingOpByTarget(resource, id, "create");
    const mergedPayload = { ...(createOp?.payload ?? {}), ...payload };
    if (createOp) await updateOp(createOp.opId, { payload: mergedPayload });
    const optimistic = { ...(existing as object), ...payload, _id: id, __offlinePending: true } as T;
    await patchList<T>(resource, (list) => list.map((r) => (r._id === id ? optimistic : r)));
    return optimistic;
  }

  try {
    // Same unavoidable generic-boundary cast as offlineCreate above.
    const updated = await service.update(id, payload as unknown as Partial<T> & Record<string, unknown>);
    await patchList<T>(resource, (list) => list.map((r) => (r._id === id ? updated : r)));
    return updated;
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;

    // A second offline edit to the same record folds into the existing pending
    // update — keep the FIRST edit's baseUpdatedAt (the version we actually
    // last saw), not the second's, so the conflict precondition still checks
    // against what the server had before either of our edits.
    const existingOp = await findPendingOpByTarget(resource, id, "update");
    const mergedPayload = { ...(existingOp?.payload ?? {}), ...payload };
    if (existingOp) {
      await updateOp(existingOp.opId, { payload: mergedPayload });
    } else {
      await enqueueOp({
        opId: crypto.randomUUID(),
        resource,
        opType: "update",
        targetId: id,
        payload: mergedPayload,
        baseUpdatedAt: existing?.updatedAt ?? null,
      });
    }
    const optimistic = { ...(existing as object), ...mergedPayload, __offlinePending: true } as T;
    await patchList<T>(resource, (list) => list.map((r) => (r._id === id ? optimistic : r)));
    return optimistic;
  }
}

// --- DELETE -------------------------------------------------------------------
export async function offlineDelete<T extends Row>(
  resource: OfflineWritableResource,
  service: WritableService<T>,
  id: string
): Promise<void> {
  // Deleting a record that was itself created offline and never synced: drop
  // the queued create entirely (create + delete cancel out to nothing) rather
  // than queuing a delete against an ID the server has never heard of.
  if (isLocalId(id)) {
    const createOp = await findPendingOpByTarget(resource, id, "create");
    if (createOp) await removeOp(createOp.opId);
    await patchList<T>(resource, (list) => list.filter((r) => r._id !== id));
    return;
  }

  try {
    await service.remove(id);
    await patchList<T>(resource, (list) => list.filter((r) => r._id !== id));
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;

    const cachedList = (await readCache<T[]>(resource)) ?? [];
    const existing = cachedList.find((r) => r._id === id);

    // A queued update to this record is now moot — the delete supersedes it.
    const existingUpdateOp = await findPendingOpByTarget(resource, id, "update");
    if (existingUpdateOp) await removeOp(existingUpdateOp.opId);

    await enqueueOp({
      opId: crypto.randomUUID(),
      resource,
      opType: "delete",
      targetId: id,
      payload: {},
      baseUpdatedAt: existing?.updatedAt ?? null,
    });
    await patchList<T>(resource, (list) => list.filter((r) => r._id !== id));
  }
}

// --- SETTINGS (singleton, doesn't fit the WritableService shape above: no
// create/remove, and its update takes no id) ----------------------------------
const SETTINGS_TARGET_ID = "settings";

export async function offlineUpdateSettings(
  service: { update: (data: Partial<Settings>) => Promise<Settings> },
  payload: Record<string, unknown>
): Promise<Settings> {
  try {
    const updated = await service.update(payload);
    await writeCache("settings", updated);
    notifyResourceUpdated("settings");
    return updated;
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;

    const existing = await readCache<Settings>("settings");
    const existingOp = await findPendingOpByTarget("settings", SETTINGS_TARGET_ID, "update");
    const mergedPayload = { ...(existingOp?.payload ?? {}), ...payload };
    if (existingOp) {
      await updateOp(existingOp.opId, { payload: mergedPayload });
    } else {
      await enqueueOp({
        opId: crypto.randomUUID(),
        resource: "settings",
        opType: "update",
        targetId: SETTINGS_TARGET_ID,
        payload: mergedPayload,
        baseUpdatedAt: existing?.updatedAt ?? null,
      });
    }
    const optimistic = { ...(existing ?? ({} as Settings)), ...mergedPayload, __offlinePending: true } as Settings;
    await writeCache("settings", optimistic);
    notifyResourceUpdated("settings");
    return optimistic;
  }
}
