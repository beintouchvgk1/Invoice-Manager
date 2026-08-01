import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Every page under app/(app)/** is a "use client" shell that fetches its own
    // data via the offline-aware hooks (see references/offline.md) — none of them
    // do server-side data fetching, so there's no actual data-freshness risk in
    // reusing an already-visited page's router cache. Default is 0 (refetch on
    // every navigation), which is what breaks in-app navigation while offline:
    // clicking a sidebar link re-requests the page's RSC payload over the
    // network, that fails, and Next falls back to a full (also failing) browser
    // navigation. Raising this to 5 minutes means a page visited earlier in the
    // session can be revisited without hitting the network at all — `router
    // .refresh()` (login, logout, invoice save) still always bypasses this and
    // forces a fresh fetch regardless, so those flows are unaffected.
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;
