"use client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  // Wording matters here: the old copy ("New changes can't be saved until
  // you're back online") predated the offline write queue and was actively
  // wrong — it told users their work would be lost, so they'd stop working.
  // Changes to Clients, Invoices, Payments and Settings are saved on the
  // device and sync automatically on reconnect.
  return (
    <div className="offline-banner">
      You&apos;re offline — you can keep working. Your changes are saved on this device and will sync
      automatically once you&apos;re back online.
    </div>
  );
}
