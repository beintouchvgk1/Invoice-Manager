"use client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner">
      You&apos;re offline — showing your last cached data. New changes can&apos;t be saved until you&apos;re back online.
    </div>
  );
}
