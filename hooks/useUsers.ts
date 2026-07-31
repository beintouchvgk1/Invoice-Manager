"use client";
import { useCallback } from "react";
import { userService } from "@/services/user.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { User } from "@/lib/types";

export function useUsers() {
  const fetcher = useCallback(() => userService.list(), []);
  const { data, loading, error, refresh } = useOfflineResource<User[]>("users", fetcher, []);
  return { users: data, loading, error, refresh };
}
