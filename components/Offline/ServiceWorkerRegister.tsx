"use client";
import { useEffect } from "react";

// Mounted in the root layout (not app/(app)/layout.tsx) so it registers from
// the very first page load, including /login and /offline — the worker needs
// to control the whole origin, not just the authenticated section, for a cold
// offline load to have any chance of working at all.
//
// Production only. `next dev` regenerates fresh internal webpack module IDs
// on every server restart, but a registered worker keeps serving whatever JS
// chunks it cached from the *previous* restart — the browser ends up running
// stale JS against a newer server, which surfaces as a confusing runtime
// error ("Cannot read properties of undefined (reading 'call')") that has
// nothing to do with the actual code. A production build's assets are
// content-hashed and don't shift under it like this, so registering there is
// safe — that's also the only place this was actually tested against.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Clean up anything registered from earlier testing so dev mode goes
      // back to normal, cache-free behavior instead of staying stuck stale.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app still works fully online without it, it just
      // won't survive a cold offline load. Nothing useful to surface to the
      // user for a background registration failure.
    });
  }, []);
  return null;
}
