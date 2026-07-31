import Dexie, { type Table } from "dexie";
import type { CacheRow, OfflineResource, QueuedOp } from "@/lib/types";

const RESOURCES: OfflineResource[] = ["invoices", "clients", "groups", "payments", "roles", "users", "settings"];

class OfflineDB extends Dexie {
  invoices!: Table<CacheRow<unknown>, string>;
  clients!: Table<CacheRow<unknown>, string>;
  groups!: Table<CacheRow<unknown>, string>;
  payments!: Table<CacheRow<unknown>, string>;
  roles!: Table<CacheRow<unknown>, string>;
  users!: Table<CacheRow<unknown>, string>;
  settings!: Table<CacheRow<unknown>, string>;
  queue!: Table<QueuedOp, string>;

  constructor() {
    super("vgk-invoice-manager-offline");
    // v1 → v2 adds the write queue (Phase 2+ of the offline feature). No
    // migration needed for the resource cache tables — they're disposable
    // snapshots, safe to start empty again and get re-populated on next fetch.
    this.version(1).stores(Object.fromEntries(RESOURCES.map((r) => [r, "key"])));
    this.version(2).stores({
      ...Object.fromEntries(RESOURCES.map((r) => [r, "key"])),
      queue: "opId, seq, status, resource",
    });
  }
}

// Lazily constructed, browser-only — IndexedDB doesn't exist during Next.js's
// server render pass, and a "use client" component's module graph still gets
// evaluated there. Every caller goes through getOfflineDB() so nothing ever
// touches `new Dexie()` outside the browser.
let instance: OfflineDB | null = null;

export function getOfflineDB(): OfflineDB | null {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new OfflineDB();
  return instance;
}

export function getResourceTable(resource: OfflineResource): Table<CacheRow<unknown>, string> | null {
  const db = getOfflineDB();
  return db ? db[resource] : null;
}

export function getQueueTable(): Table<QueuedOp, string> | null {
  const db = getOfflineDB();
  return db ? db.queue : null;
}

// Used on logout and when a cached user turns out to be unauthorized on
// revalidation — a stale financial snapshot must not survive a session change.
export async function wipeOfflineCache(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  await db.delete();
  instance = null;
}
