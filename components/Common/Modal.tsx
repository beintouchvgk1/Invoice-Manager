"use client";
import { MouseEvent, ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div id="ov" className={open ? "show" : ""} onClick={handleOverlayClick}>
      <div id="mb">{children}</div>
    </div>
  );
}
