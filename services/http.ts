import type { ApiResponse } from "@/lib/types";

// Thrown when fetch() itself fails to reach the network (offline, DNS, CORS) —
// distinct from a completed HTTP response that happens to be non-2xx. The
// offline cache layer (hooks/useOfflineResource.ts) relies on this to decide
// "silently fall back to cached data" vs. "surface a real error" (e.g. a 401
// should never be swallowed as if we were just offline).
export class NetworkError extends Error {
  constructor(message = "Network unreachable — check your internet connection.") {
    super(message);
    this.name = "NetworkError";
  }
}

// Thrown on a 409 from the offline-sync baseUpdatedAt precondition (see
// lib/response.ts's conflict()) — carries the current server doc so
// lib/offline/mutate.ts can hand it straight to the Resolve Sync Conflicts UI
// without a second round-trip.
export class ConflictError extends Error {
  serverDoc: Record<string, unknown>;
  constructor(message: string, serverDoc: Record<string, unknown>) {
    super(message);
    this.name = "ConflictError";
    this.serverDoc = serverDoc;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
  } catch {
    throw new NetworkError();
  }
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !body || !body.success) {
    if (res.status === 409 && body && "conflict" in body && body.conflict) {
      throw new ConflictError(body.error, body.conflict as Record<string, unknown>);
    }
    const message = body && "error" in body ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body.data;
}

export const http = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T>(url: string, data?: unknown) => request<T>(url, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  del: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: "DELETE", ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }),
};
