"use client";

export type ToastKind = "ok" | "err";

export function Toast({ kind, message }: { kind: ToastKind; message: string }) {
  if (!message) return null;
  return <div className={`al ${kind === "ok" ? "alok" : "aler"}`}>{message}</div>;
}
