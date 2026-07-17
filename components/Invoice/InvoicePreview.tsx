"use client";
import { genInvoicePDF } from "@/lib/pdf";
import { settingsService } from "@/services/settings.service";
import type { Client, Invoice } from "@/lib/types";

// Original app renders a PDF directly instead of an on-screen preview screen;
// this wraps that behavior as a reusable action for invoice list/detail views.
export function usePrintInvoice() {
  return async function printInvoice(invoice: Invoice, client: Client | undefined) {
    const settings = await settingsService.get();
    genInvoicePDF(invoice, client, settings);
  };
}
