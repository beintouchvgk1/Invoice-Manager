"use client";
import { genInvoicePDF } from "@/lib/pdf";
import { useSettings } from "@/hooks/useSettings";
import type { Client, Invoice } from "@/lib/types";

// Original app renders a PDF directly instead of an on-screen preview screen;
// this wraps that behavior as a reusable action for invoice list/detail views.
// Used to fetch settingsService.get() directly, which came up empty offline —
// useSettings() is cache-first, so printing an already-synced invoice's PDF
// still works offline (firm details/logo/T&C come from the same cache the
// Settings page uses).
export function usePrintInvoice() {
  const { settings } = useSettings();
  return function printInvoice(invoice: Invoice, client: Client | undefined) {
    if (settings) genInvoicePDF(invoice, client, settings);
  };
}
