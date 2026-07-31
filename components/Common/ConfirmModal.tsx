"use client";
import { Modal } from "@/components/Common/Modal";

// Bg_04: a themed replacement for native confirm() — same Cancel(left)/
// Confirm(right) footer convention every other modal in this app uses.
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
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
        <button className={`btn ${destructive ? "brd" : "bp"}`} disabled={busy} onClick={onConfirm}>
          {busy ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
