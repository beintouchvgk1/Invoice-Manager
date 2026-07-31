"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readCache, subscribeResourceUpdated, writeCache } from "@/lib/offline/cache";
import { NetworkError } from "@/services/http";
import type { OfflineResource, OfflineResourceState } from "@/lib/types";

// The cache-first + revalidate engine every use{Name}.ts hook is built on. Each
// existing hook wraps this and renames `data` to its own field (`invoices`,
// `customers`, ...) so its public {items, loading, error, refresh} contract is
// completely unchanged for every existing page/component that consumes it.
export function useOfflineResource<T>(
  resource: OfflineResource,
  fetcher: () => Promise<T>,
  emptyValue: T
): OfflineResourceState<T> {
  const [data, setData] = useState<T>(emptyValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const refresh = useCallback(async () => {
    setError(null);

    if (!hasDataRef.current) {
      const cached = await readCache<T>(resource);
      if (cached !== undefined) {
        setData(cached);
        hasDataRef.current = true;
        setLoading(false);
      }
    }

    try {
      const fresh = await fetcher();
      setData(fresh);
      hasDataRef.current = true;
      void writeCache(resource, fresh);
    } catch (e) {
      if (e instanceof NetworkError) {
        // Offline: if we already have cached (or just-set) data, keep showing it
        // silently — only a genuinely empty, never-cached resource is an error.
        if (!hasDataRef.current) setError("You're offline and this data hasn't been cached yet.");
      } else {
        setError(e instanceof Error ? e.message : `Failed to load ${resource}`);
      }
    } finally {
      setLoading(false);
    }
  }, [resource, fetcher]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // An optimistic offline mutation (lib/offline/mutate.ts) or the sync engine
  // replaying the queue both patch the Dexie cache directly, outside this
  // hook's own refresh cycle — re-read the cache (no network call) whenever
  // notified so every open page reflects the change immediately.
  useEffect(() => {
    return subscribeResourceUpdated(resource, () => {
      readCache<T>(resource).then((cached) => {
        if (cached !== undefined) {
          setData(cached);
          hasDataRef.current = true;
        }
      });
    });
  }, [resource]);

  return { data, loading, error, refresh };
}
