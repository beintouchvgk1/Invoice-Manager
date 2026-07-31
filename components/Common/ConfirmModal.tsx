"use client";
import { Modal } from "@/components/Common/Modal";

// A themed replacement for native confirm() — same Cancel(left)/Confirm(right)
// footer convention every other modal in this app uses. Not wired in anywhere
// but the one place it was requested (Dashboard's "Download Backup"); other
// confirm() calls (delete actions, etc.) are unchanged — swap them to this
// only if asked, don't do it proactively.
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3>{title}</h3>
      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
        <button className="btn bp" disabled={busy} onClick={onConfirm}>{busy ? "Please wait..." : confirmLabel}</button>
      </div>
    </Modal>
  );
}
