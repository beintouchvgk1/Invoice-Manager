"use client";
import { useEffect, useRef, useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { ConflictModal } from "@/components/Offline/ConflictModal";

export function SyncIndicator() {
  const status = useSyncStatus();
  const [modalOpen, setModalOpen] = useState(false);
  const prevIssueCountRef = useRef(0);

  const issueCount = status.conflictCount + status.failedCount;

  // Auto-open the moment a conflict/failure first appears (e.g. right after
  // reconnecting), but never re-force it open once the user has dismissed it —
  // the badge below stays as the way back in.
  useEffect(() => {
    if (issueCount > 0 && prevIssueCountRef.current === 0) setModalOpen(true);
    prevIssueCountRef.current = issueCount;
  }, [issueCount]);

  if (!status.pendingCount && !issueCount && !status.syncing) return null;

  return (
    <>
      <button
        type="button"
        className={`sync-indicator${issueCount ? " has-issues" : ""}`}
        onClick={() => setModalOpen(true)}
        disabled={!issueCount}
        title={issueCount ? "Resolve sync conflicts" : undefined}
      >
        {status.syncing ? (
          <span>Syncing…</span>
        ) : issueCount ? (
          <span>{issueCount} sync {issueCount === 1 ? "issue" : "issues"}</span>
        ) : (
          <span>{status.pendingCount} pending sync</span>
        )}
      </button>
      {issueCount > 0 && <ConflictModal open={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  );
}
