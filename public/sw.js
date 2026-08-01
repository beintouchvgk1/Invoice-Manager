// VGK Invoice Manager — offline app-shell Service Worker.
//
// Scope: makes the app itself (HTML/JS/CSS) loadable with zero network, once a
// page has been opened at least once while online — on this exact browser
// profile, cold tab, fresh reload, browser restart, all included. This is
// separate from (and doesn't touch) the app's own data-sync system in
// lib/offline/** — that already handles caching Clients/Invoices/Payments/
// Settings data and queuing edits via IndexedDB; this worker only ever
// intercepts document/asset requests, never /api/**.
//
// Bump CACHE_VERSION any time this file's caching logic changes, so old
// clients don't keep running stale worker logic from Cache Storage.
// v2: precaching now also stores each page's JS/CSS chunks, not just its HTML.
// v3: never cache (or serve) a non-OK response — see the fetch handler.
// Each bump purges older caches, which may hold incomplete or error entries.
const CACHE_VERSION = "v3";
const PAGES_CACHE = "vgk-pages-" + CACHE_VERSION;
const ASSETS_CACHE = "vgk-assets-" + CACHE_VERSION;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Precache the offline fallback page itself — this must always be
  // available, even on a device that's never opened anything else yet.
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
});

// Client-side <Link> navigation (how this app is normally used) never issues a
// full-document "navigate" fetch at all — Next's router just fetches an RSC
// data fragment for the target route, so a page only ever reached by clicking
// around never got its actual HTML document cached, only pages hard-loaded/
// typed/refreshed did. app/(app)/layout.tsx's RoutePrecache component sends
// this message right after a successful login (when the auth cookie is valid,
// so these protected routes return real content instead of a redirect) —
// fetching each one directly so its document is cached even if the user
// never once hard-navigates to it.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "PRECACHE_ROUTES") return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(
    (async () => {
      const [pages, assets] = await Promise.all([caches.open(PAGES_CACHE), caches.open(ASSETS_CACHE)]);
      // Sequential, not Promise.all: precaching every route's document AND its
      // JS/CSS at once floods the connection on login. These are background
      // warm-ups — being slightly slower costs nothing, stalling the app does.
      for (const path of urls) {
        await precacheDocument(pages, assets, path);
      }
    })()
  );
});

// Caching a page's HTML alone is not enough to make it work offline: the
// document only *references* its route-specific JS/CSS, and those chunks are
// normally cached only when the browser actually renders that page online. A
// page precached without them loads the shell, fails to fetch its chunks, and
// dies with "Application error: a client-side exception has occurred". So parse
// the freshly-fetched HTML for its /_next/static/ assets and cache those too.
async function precacheDocument(pages, assets, path) {
  try {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return;
    const html = await res.clone().text();
    await pages.put(path, res);

    const found = new Set();
    const re = /\/_next\/static\/[^"'\\\s<>]+/g;
    let m;
    while ((m = re.exec(html))) {
      const url = m[0].replace(/[),;]+$/, "");
      if (/\.(js|css|woff2?)(\?|$)/.test(url)) found.add(url);
    }

    for (const url of found) {
      try {
        if (await assets.match(url)) continue;
        const assetRes = await fetch(url);
        if (assetRes.ok) await assets.put(url, assetRes);
      } catch {
        /* one missing asset shouldn't abort the rest */
      }
    }
  } catch {
    /* offline or route errored — it just stays uncached, no crash */
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache from a previous CACHE_VERSION — content-hashed static
      // asset URLs change per build anyway, so old entries are just dead
      // weight, not a correctness risk, but no reason to keep them around.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== PAGES_CACHE && k !== ASSETS_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only ever handle same-origin GET. Mutations, cross-origin requests
  // (fonts CDN, etc. — there are none here, but future-proof), and anything
  // to /api/** pass straight through untouched — the app's own NetworkError
  // handling in services/http.ts is what governs those, not this worker.
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  // Full page navigations (clicking a link, typing a URL, a hard reload):
  // network-first so online users always get the current page; offline,
  // fall back to whatever was cached for this exact URL, then to the
  // /offline fallback if this page was never visited on this device.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cache = await caches.open(PAGES_CACHE);
          const cached = await cache.match(req);
          return cached || (await cache.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // Immutable, content-hashed build assets: cache-first, since a fresh
  // deploy changes the URL itself rather than the content at an old one.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS_CACHE);
        const cached = await cache.match(req);
        // Only a successful response is worth reusing. Caching an error and
        // then serving it cache-first would wedge the app permanently: one
        // transient 4xx/5xx on a JS chunk (or a request made mid-deploy, when
        // the previous build's files are already gone) would be replayed from
        // cache on every future load, and no amount of reloading would clear
        // it short of the user wiping site data by hand.
        if (cached && cached.ok) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      })()
    );
    return;
  }

  // Everything else same-origin (RSC data fetches, misc assets): network
  // first, cache as a courtesy, fall back to cache on failure. Not forced to
  // /offline — a failed sub-resource shouldn't blank out an otherwise-cached
  // page, it should just fail quietly like it would on flaky-but-present data.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(ASSETS_CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (e) {
        const cache = await caches.open(ASSETS_CACHE);
        const cached = await cache.match(req);
        if (cached && cached.ok) return cached;
        throw e;
      }
    })()
  );
});
