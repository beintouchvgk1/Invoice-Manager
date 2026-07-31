"use client";
import { useCallback, useEffect, useState } from "react";
import { listByStatus, removeOp, updateOp } from "@/lib/offline/queue";
import { notifyResourceUpdated, patchCache, writeCache } from "@/lib/offline/cache";
import { subscribeSyncStatus } from "@/lib/offline/syncEngine";
import { runSync } from "@/lib/offline/syncEngine";
import type { ConflictRecord, QueuedOp } from "@/lib/types";

export function useConflicts() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [failed, setFailed] = useState<QueuedOp[]>([]);

  const refresh = useCallback(async () => {
    const [conflictOps, failedOps] = await Promise.all([listByStatus("conflict"), listByStatus("failed")]);
    setConflicts(conflictOps as ConflictRecord[]);
    setFailed(failedOps);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeSyncStatus(() => refresh());
  }, [refresh]);

  async function keepMine(op: ConflictRecord) {
    // Re-enqueue against the version we've now seen — this is a precise "I saw
    // your version and I'm overwriting it", not a blind force flag.
    const nextBaseUpdatedAt = (op.serverVersion.updatedAt as string | undefined) ?? null;
    await updateOp(op.opId, { status: "pending", baseUpdatedAt: nextBaseUpdatedAt, serverVersion: null });
    await refresh();
    void runSync();
  }

  async function keepServers(op: ConflictRecord) {
    if (op.resource === "settings") {
      await writeCache("settings", op.serverVersion);
    } else {
      await patchCache<Record<string, unknown>[]>(op.resource, [], (list) => {
        const withoutTarget = list.filter((row) => row._id !== op.targetId);
        return op.opType === "delete" ? withoutTarget : [...withoutTarget, op.serverVersion];
      });
    }
    notifyResourceUpdated(op.resource);
    await removeOp(op.opId);
    await refresh();
  }

  async function retry(op: QueuedOp) {
    await updateOp(op.opId, { status: "pending", lastError: null });
    await refresh();
    void runSync();
  }

  async function discard(op: QueuedOp) {
    await removeOp(op.opId);
    await refresh();
  }

  return { conflicts, failed, keepMine, keepServers, retry, discard };
}
