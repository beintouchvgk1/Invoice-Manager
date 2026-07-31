"use client";
import { useCallback } from "react";
import { roleService } from "@/services/role.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Role } from "@/lib/types";

export function useRoles() {
  const fetcher = useCallback(() => roleService.list(), []);
  const { data, loading, error, refresh } = useOfflineResource<Role[]>("roles", fetcher, []);
  return { roles: data, loading, error, refresh };
}
