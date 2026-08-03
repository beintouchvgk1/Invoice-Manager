"use client";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { readCache, writeCache } from "@/lib/offline/cache";
import { NetworkError } from "@/services/http";
import type { CachedCurrentUser } from "@/lib/types";

export function useCurrentUser() {
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .verify()
      .then((res) => {
        setName(res.name || null);
        setEmail(res.email);
        setRole(res.role);
        setPermissions(res.permissions);
        void writeCache<CachedCurrentUser>("currentUser", res);
      })
      .catch(async (e) => {
        // Offline with no way to ask the server who's logged in — fall back to
        // the last verified identity (cleared on logout via wipeOfflineCache())
        // rather than silently rendering as logged-out with every permission
        // hidden. A real auth failure (401, etc.) is NOT a NetworkError, so it
        // correctly falls through to leaving the user logged-out here.
        if (e instanceof NetworkError) {
          const cached = await readCache<CachedCurrentUser>("currentUser");
          if (cached) {
            setName(cached.name || null);
            setEmail(cached.email);
            setRole(cached.role);
            setPermissions(cached.permissions);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function can(permission: string): boolean {
    return permissions.includes("*") || permissions.includes(permission);
  }

  return { name, email, role, permissions, can, loading };
}
