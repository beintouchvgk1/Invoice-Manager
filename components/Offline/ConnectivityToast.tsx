"use client";
import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/useToast";

// Invisible — fires a toast only on an actual online<->offline transition, never
// on first mount (a fresh page load is always "online", that's not news). Reuses
// the existing useOnlineStatus/useToast — no parallel connectivity or
// notification mechanism.
export function ConnectivityToast() {
  const online = useOnlineStatus();
  const { showToast } = useToast();
  const prevRef = useRef(online);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = online;
      return;
    }
    if (online !== prevRef.current) {
      if (online) {
        showToast("Back online — syncing your changes now.", "ok");
      } else {
        showToast("You're offline — you can keep working. Your changes will sync when you're back online.");
      }
      prevRef.current = online;
    }
  }, [online, showToast]);

  return null;
}
