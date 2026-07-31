import { getResourceTable } from "./db";
import type { OfflineResource } from "@/lib/types";

// Whole-snapshot replace, not delta sync — this is a small single-firm dataset
// (a few thousand documents at most), so "re-fetch and replace the whole list"
// is far simpler and less bug-prone than tracking per-row dirty state, and costs
// nothing meaningful in bandwidth/storage at this scale.
export async function readCache<T>(resource: OfflineResource): Promise<T | undefined> {
  const table = getResourceTable(resource);
  if (!table) return undefined;
  const row = await table.get("data");
  return row?.data as T | undefined;
}

export async function writeCache<T>(resource: OfflineResource, data: T): Promise<void> {
  const table = getResourceTable(resource);
  if (!table) return;
  await table.put({ key: "data", data, cachedAt: new Date().toISOString() });
}

// Read-modify-write the cached snapshot in place — used for optimistic updates
// (inserting a temp-ID row, patching a row's fields, tombstoning a delete)
// without needing a network round-trip first. `fallback` covers "no cache yet".
export async function patchCache<T>(resource: OfflineResource, fallback: T, updater: (current: T) => T): Promise<void> {
  const current = (await readCache<T>(resource)) ?? fallback;
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
