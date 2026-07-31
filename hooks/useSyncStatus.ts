"use client";
import { useEffect, useState } from "react";
import { subscribeSyncStatus } from "@/lib/offline/syncEngine";
import type { SyncStatus } from "@/lib/types";

const EMPTY_STATUS: SyncStatus = { pendingCount: 0, conflictCount: 0, failedCount: 0, syncing: false };

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(EMPTY_STATUS);

  useEffect(() => {
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}
