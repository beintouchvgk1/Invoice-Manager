// Without this, the browser treats our IndexedDB data as "best effort" storage
// and is free to evict it when the device runs low on disk — which for this app
// means silently discarding queued offline changes that were never synced.
// Asking for persistent storage marks it as durable so it survives eviction.
//
// Chrome grants this automatically based on site engagement (installed PWA,
// bookmarked, high engagement) with no prompt; if it declines, nothing breaks —
// storage just stays evictable, exactly as it was before.
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch {
    /* best-effort — never worth failing anything else over */
  }
}
