// Asks the Service Worker (public/sw.js) to fetch + cache these page URLs so a
// cold offline load of them works. Client-side <Link> navigation never issues a
// full-document request, so without this a page is only ever cached if the user
// happened to hard-load/refresh it — see sw.js's message handler.
export async function precacheRoutes(urls: string[]): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Matches ServiceWorkerRegister.tsx — no worker is registered outside
  // production, so `serviceWorker.ready` would hang forever waiting for one.
  if (process.env.NODE_ENV !== "production") return;
  if (!urls.length) return;

  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "PRECACHE_ROUTES", urls });
}
