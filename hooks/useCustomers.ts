"use client";
import { useCallback, useEffect, useState } from "react";
import { customerService } from "@/services/customer.service";
import type { Client } from "@/lib/types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await customerService.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { customers, loading, error, refresh };
}
