"use client";
import { ReactNode } from "react";

// Bg_17: clicking the overlay used to call onClose and silently discard
// whatever the user had typed/edited — deliberately no longer does that.
// A modal now only closes via an explicit Cancel/Close/Save button inside it
// (every existing *Modal.tsx already wires its own Cancel button to onClose,
// so nothing else needs to change).
// `onClose` stays part of the contract (every caller already passes it to wire
// up its own Cancel/Close button) even though Modal itself no longer invokes
// it directly — see the file comment above.
export function Modal({
  open,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div id="ov" className={open ? "show" : ""}>
      <div id="mb">{children}</div>
    </div>
  );
}
