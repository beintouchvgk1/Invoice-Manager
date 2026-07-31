"use client";
import { Modal } from "@/components/Common/Modal";
import { useConflicts } from "@/hooks/useConflicts";

const RESOURCE_LABELS: Record<string, string> = {
  clients: "Client",
  payments: "Payment",
  invoices: "Invoice",
  settings: "Settings",
};

function fieldRows(a: Record<string, unknown>, b: Record<string, unknown>) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).filter(
    (k) => !["_id", "__v", "createdAt", "updatedAt", "clientOpId"].includes(k)
  );
  return keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

function displayValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function ConflictModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conflicts, failed, keepMine, keepServers, retry, discard } = useConflicts();

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Resolve Sync Conflicts</h3>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
        These changes were made offline, but the record has since changed on the server. Choose which
        version to keep for each one.
      </p>

      {!conflicts.length && !failed.length && <div className="em">Nothing left to resolve.</div>}

      {conflicts.map((op) => {
        const changed = fieldRows(op.payload, op.serverVersion);
        return (
          <div key={op.opId} className="fc" style={{ marginBottom: 12 }}>
            <h3>
              {RESOURCE_LABELS[op.resource] || op.resource} — {op.opType === "delete" ? "delete" : "edit"}
            </h3>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Your version</th>
                    <th>Server&apos;s version</th>
                  </tr>
                </thead>
                <tbody>
                  {changed.length ? (
                    changed.map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{displayValue(op.payload[key])}</td>
                        <td>{displayValue(op.serverVersion[key])}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="em">
                        {op.opType === "delete" ? "You deleted this; the server version shown was kept." : "No field differences to show."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn bs" onClick={() => keepServers(op)}>Keep Server&apos;s</button>
              <button className="btn bp" onClick={() => keepMine(op)}>Keep Mine</button>
            </div>
          </div>
        );
      })}

      {failed.map((op) => (
        <div key={op.opId} className="fc" style={{ marginBottom: 12, borderLeft: "3px solid var(--danger)" }}>
          <h3 style={{ color: "var(--danger)" }}>
            {RESOURCE_LABELS[op.resource] || op.resource} — {op.opType} failed to sync
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 10 }}>{op.lastError}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn bs" onClick={() => discard(op)}>Discard</button>
            <button className="btn bp" onClick={() => retry(op)}>Retry</button>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn bs" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
