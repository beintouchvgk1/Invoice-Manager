import { getResourceTable } from "./db";
import type { OfflineResource } from "@/lib/types";

// Whole-snapshot replace, not delta sync — this is a small single-firm dataset
// (a few thousand documents at most), so "re-fetch and replace the whole list"
// is far simpler and less bug-prone than tracking per-row dirty state, and costs
// nothing meaningful in bandwidth/storage at this scale.
// IndexedDB can block *indefinitely* rather than fail: if another tab of the
// app holds a connection open when a schema upgrade is needed, the open
// promise simply never settles. Without a ceiling, `await readCache(...)` in
// useOfflineResource never returns, `loading` never flips to false, and the
// page sits on its loading skeleton forever with no error — which is exactly
// what a second open tab used to do to every list in the app. Treat a
// non-answering cache as "no cache" and let the network path take over.
const CACHE_OP_TIMEOUT_MS = 4000;

function withTimeout<T>(op: Promise<T>, onTimeout: () => T | Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      Promise.resolve(onTimeout()).then(resolve, reject);
    }, CACHE_OP_TIMEOUT_MS);
    op.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// Throwing variant, used only by patchCache — see the warning there for why
// that one path must be able to tell "genuinely no cache yet" apart from
// "the read failed". A timeout here rejects rather than resolving, so a
// blocked database surfaces as a failed mutation instead of silently
// rewriting the cache from an assumed-empty starting point.
async function readCacheStrict<T>(resource: OfflineResource): Promise<T | undefined> {
  const table = getResourceTable(resource);
  if (!table) return undefined;
  const row = await withTimeout(table.get("data"), () => {
    throw new Error("Offline cache is not responding (another tab may be blocking it).");
  });
  return row?.data as T | undefined;
}

// Reads never throw. A Dexie failure (blocked schema upgrade because another
// tab holds the old version open, private-browsing storage restrictions, quota
// eviction) must degrade to "no cache" and let the caller fall back to the
// network — useOfflineResource awaits this outside its try/catch, so a throw
// here would reject the whole refresh and leave the page stuck empty.
export async function readCache<T>(resource: OfflineResource): Promise<T | undefined> {
  try {
    return await readCacheStrict<T>(resource);
  } catch {
    return undefined;
  }
}

// Also never throws: every caller treats caching as best-effort (several are
// fire-and-forget `void writeCache(...)`, where a rejection would surface as an
// unhandled promise rejection rather than anything actionable).
export async function writeCache<T>(resource: OfflineResource, data: T): Promise<void> {
  try {
    const table = getResourceTable(resource);
    if (!table) return;
    // Same non-settling risk as reads (see CACHE_OP_TIMEOUT_MS): several
    // callers `await` this, so a blocked database would stall them forever.
    await withTimeout(
      table.put({ key: "data", data, cachedAt: new Date().toISOString() }),
      () => undefined as unknown as string
    );
  } catch {
    /* best-effort — see comment above */
  }
}

// Read-modify-write the cached snapshot in place — used for optimistic updates
// (inserting a temp-ID row, patching a row's fields, tombstoning a delete)
// without needing a network round-trip first. `fallback` covers "no cache yet".
//
// Deliberately uses the THROWING read: every updater here is a map/filter over
// the existing list, so silently treating a failed read as "no cache" would
// apply that updater to `[]` and then persist an empty list — wiping every
// cached record instead of patching one. Better to abort the patch (the queued
// op, which is the actual source of truth for unsynced work, is written
// separately and still survives) than to destroy the snapshot.
export async function patchCache<T>(resource: OfflineResource, fallback: T, updater: (current: T) => T): Promise<void> {
  const current = (await readCacheStrict<T>(resource)) ?? fallback;
  await writeCache(resource, updater(current));
}

// A resource that changed in the background (a sync-engine write, or an
// optimistic mutation from lib/offline/mutate.ts) needs to tell every mounted
// useOfflineResource(resource) instance to re-render — plain module-level
// pub/sub, since nothing here needs Dexie's own liveQuery machinery for a
// once-in-a-while "something changed, re-read the cache" signal.
type ResourceListener = () => void;
const listeners = new Map<OfflineResource, Set<ResourceListener>>();

export function notifyResourceUpdated(resource: OfflineResource): void {
  listeners.get(resource)?.forEach((fn) => fn());
}

export function subscribeResourceUpdated(resource: OfflineResource, fn: ResourceListener): () => void {
  if (!listeners.has(resource)) listeners.set(resource, new Set());
  listeners.get(resource)!.add(fn);
  return () => listeners.get(resource)?.delete(fn);
}
