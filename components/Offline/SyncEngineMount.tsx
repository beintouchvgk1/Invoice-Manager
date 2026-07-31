"use client";
import { useEffect } from "react";
import { initSyncEngine } from "@/lib/offline/syncEngine";

// Invisible — just starts the connectivity-triggered sync loop once per app
// load. Kept as its own component (rather than inlined in AppLayout) so it's
// obvious at a glance in the layout file what each mounted piece is for.
export function SyncEngineMount() {
  useEffect(() => {
    initSyncEngine();
  }, []);
  return null;
}
