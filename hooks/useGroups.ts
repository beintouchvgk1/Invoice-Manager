"use client";
import { useCallback } from "react";
import { groupService } from "@/services/group.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Group } from "@/lib/types";

export function useGroups() {
  const fetcher = useCallback(() => groupService.list(), []);
  const { data, loading, error, refresh } = useOfflineResource<Group[]>("groups", fetcher, []);
  return { groups: data, loading, error, refresh };
}
