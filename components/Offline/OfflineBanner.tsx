"use client";
import { useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Written for a non-technical user: each line is a concrete action to avoid (or
// take), not an explanation of how the storage works. These are the things that
// actually destroy queued-but-unsynced changes — see lib/offline/db.ts (the
// data lives in this browser profile's IndexedDB, so anything that clears that
// profile clears the pending work with it).
const CAUTIONS: { ok: boolean; text: string }[] = [
  { ok: false, text: "Don't uninstall or reinstall this browser." },
  { ok: false, text: "Don't clear your browsing data, cookies or site data." },
  { ok: false, text: "Don't log out of Invoice Manager." },
  { ok: false, text: "Don't switch to a Private/Incognito window for this work." },
  { ok: true, text: "Keep using this same browser on this same computer." },
  { ok: true, text: "Reconnect to the internet as soon as you can — syncing then happens on its own." },
];

export function OfflineBanner() {
  const online = useOnlineStatus();
  const [showTips, setShowTips] = useState(false);

  if (online) return null;

  // Wording matters here: the old copy ("New changes can't be saved until
  // you're back online") predated the offline write queue and was actively
  // wrong — it told users their work would be lost, so they'd stop working.
  // Changes to Clients, Invoices, Payments and Settings are saved on the
  // device and sync automatically on reconnect.
  return (
    <>
      <div className="offline-banner">
        You&apos;re offline — you can keep working. Your changes are saved on this device and will sync
        automatically once you&apos;re back online.
        <button
          type="button"
          className="offline-banner-info"
          onClick={() => setShowTips(true)}
          title="How to keep your offline changes safe"
          aria-label="How to keep your offline changes safe"
        >
          i
        </button>
      </div>

      <Modal open={showTips} onClose={() => setShowTips(false)}>
        <h3>Keeping Your Offline Changes Safe</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 14 }}>
          Anything you add or edit right now is stored inside this browser on this computer — it
          hasn&apos;t reached the server yet. Until it syncs, please:
        </p>
        <ul className="offline-tips">
          {CAUTIONS.map((c) => (
            <li key={c.text}>
              <span className={`mark ${c.ok ? "yes" : "no"}`}>{c.ok ? "✓" : "✕"}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 18 }}>
          Closing this tab, closing the browser, or restarting your computer is perfectly safe — your
          changes will still be here when you come back.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn bp" onClick={() => setShowTips(false)}>Got it</button>
        </div>
      </Modal>
    </>
  );
}
