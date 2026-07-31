"use client";
import { useCallback } from "react";
import { settingsService } from "@/services/settings.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Settings } from "@/lib/types";

export function useSettings() {
  const fetcher = useCallback(() => settingsService.get(), []);
  const { data, loading, error, refresh } = useOfflineResource<Settings | null>("settings", fetcher, null);
  return { settings: data, loading, error, refresh };
}
