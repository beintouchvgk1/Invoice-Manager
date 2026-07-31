"use client";
import { useCallback } from "react";
import { customerService } from "@/services/customer.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Client } from "@/lib/types";

export function useCustomers() {
  const fetcher = useCallback(() => customerService.list(), []);
  const { data, loading, error, refresh } = useOfflineResource<Client[]>("clients", fetcher, []);
  return { customers: data, loading, error, refresh };
}
