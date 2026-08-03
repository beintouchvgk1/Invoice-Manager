import Dexie, { type Table } from "dexie";
import { requestPersistentStorage } from "./persistStorage";
import type { CacheRow, OfflineResource, QueuedOp } from "@/lib/types";

const RESOURCES: OfflineResource[] = ["invoices", "clients", "groups", "payments", "roles", "users", "settings"];
// currentUser is cached the same way but deliberately kept out of RESOURCES —
// it's not something useOfflineResource/the write queue ever touches, it's
// only ever read/written directly by useCurrentUser.ts.
const ALL_TABLES: OfflineResource[] = [...RESOURCES, "currentUser"];

class OfflineDB extends Dexie {
  invoices!: Table<CacheRow<unknown>, string>;
  clients!: Table<CacheRow<unknown>, string>;
  groups!: Table<CacheRow<unknown>, string>;
  payments!: Table<CacheRow<unknown>, string>;
  roles!: Table<CacheRow<unknown>, string>;
  users!: Table<CacheRow<unknown>, string>;
  settings!: Table<CacheRow<unknown>, string>;
  currentUser!: Table<CacheRow<unknown>, string>;
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
    // v2 → v3 adds the currentUser table (cold-offline-load auth fallback).
    this.version(3).stores({
      ...Object.fromEntries(ALL_TABLES.map((r) => [r, "key"])),
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
  if (!instance) {
    const db = new OfflineDB();
    // Multi-tab safety. IndexedDB blocks (forever, without erroring) when one
    // connection is still open and another needs a schema upgrade — with the
    // app open in two tabs, that froze every list on its loading skeleton.
    // Closing on `versionchange` lets the upgrading tab through instead of
    // deadlocking both. The closed tab reopens lazily on its next cache call.
    db.on("versionchange", () => {
      db.close();
      instance = null;
    });
    instance = db;
    // First actual use of offline storage is the natural moment to ask the
    // browser not to evict it — queued-but-unsynced changes live here.
    void requestPersistentStorage();
  }
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
