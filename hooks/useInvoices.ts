"use client";
import { useCallback } from "react";
import { invoiceService } from "@/services/invoice.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Invoice } from "@/lib/types";

export function useInvoices(clientId?: string) {
  const fetcher = useCallback(() => invoiceService.list(clientId), [clientId]);
  const { data, loading, error, refresh } = useOfflineResource<Invoice[]>("invoices", fetcher, []);
  return { invoices: data, loading, error, refresh };
}
