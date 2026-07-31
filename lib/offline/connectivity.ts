// navigator.onLine is unreliable — it can't tell a dead LAN/captive-portal from
// a working connection. `online`/`offline` browser events are only ever treated
// as a hint to re-probe app/api/health/route.ts, which is the actual source of
// truth for "can the browser reach our server".
type Listener = (online: boolean) => void;

let online = true;
let initialized = false;
const listeners = new Set<Listener>();

async function probe(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  listeners.forEach((l) => l(online));
}

export function getOnlineStatus(): boolean {
  return online;
}

export function subscribeOnlineStatus(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function checkConnectivity(): Promise<boolean> {
  setOnline(await probe());
  return online;
}

// Idempotent — safe to call from every mounted useOnlineStatus() instance.
// Retries the probe every 15s only while believed offline, so a dropped
// connection is noticed without polling forever once it's back.
export function initConnectivityWatcher(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("online", () => void checkConnectivity());
  window.addEventListener("offline", () => setOnline(false));
  void checkConnectivity();

  setInterval(() => {
    if (!online) void checkConnectivity();
  }, 15000);
}
