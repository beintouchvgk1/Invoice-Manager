import mongoose from "mongoose";
import { env } from "@/lib/env";
import type { MongooseCache } from "@/lib/types";

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null, syncedModels: new Set() };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongodbUri, {
        bufferCommands: false,
      })
      .then((m) => {
        console.log("MongoDB connected:", m.connection.host);
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        console.error("MongoDB connection error:", err);
        throw err;
      });
  }
  cache.conn = await cache.promise;

  // Mongoose only ever ADDS indexes for the current schema; it never drops
  // indexes left behind by a renamed/removed field. Without this, a stale
  // unique index (e.g. from a since-renamed field) silently rejects every
  // write after the first, since MongoDB treats the field's absence as a
  // shared null value under a unique index. Sync any newly-registered models
  // (once each) on every call so schema renames can't leave that trap behind.
  const unsynced = Object.values(cache.conn.connection.models).filter((m) => !cache.syncedModels.has(m.modelName));
  if (unsynced.length) {
    await Promise.all(
      unsynced.map((model) =>
        model
          .syncIndexes()
          .then(() => cache.syncedModels.add(model.modelName))
          .catch((err) => console.error(`syncIndexes failed for ${model.modelName}:`, err))
      )
    );
  }

  return cache.conn;
}
