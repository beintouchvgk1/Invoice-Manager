"use client";
import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { warmOfflineCaches } from "@/lib/offline/warmCache";

// Mounted in app/(app)/layout.tsx (authenticated pages only, so every request
// it makes carries a valid session). Fills every resource cache up-front so
// offline behavior doesn't depend on which pages happened to be opened first.
//
// Re-runs when the connection comes back and whenever the pending-op count
// changes — that second trigger is what re-warms right after a sync drains the
// queue. warmOfflineCaches() itself no-ops while anything is still pending, so
// a fresh server snapshot can never wipe unsynced optimistic rows.
export function CacheWarmer() {
  const online = useOnlineStatus();
  const { pendingCount, syncing } = useSyncStatus();

  useEffect(() => {
    if (!online || syncing) return;
    void warmOfflineCaches();
  }, [online, syncing, pendingCount]);

  return null;
}
