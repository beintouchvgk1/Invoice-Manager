"use client";
import { useCallback } from "react";
import { paymentService } from "@/services/payment.service";
import { useOfflineResource } from "@/hooks/useOfflineResource";
import type { Payment } from "@/lib/types";

export function usePayments() {
  const fetcher = useCallback(() => paymentService.list(), []);
  const { data, loading, error, refresh } = useOfflineResource<Payment[]>("payments", fetcher, []);
  return { payments: data, loading, error, refresh };
}
