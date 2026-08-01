"use client";
import { use, useEffect, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonFormCard } from "@/components/Common/Skeleton";
import { InvoiceForm } from "@/components/Invoice/InvoiceForm";
import { invoiceService } from "@/services/invoice.service";
import { readCache } from "@/lib/offline/cache";
import { NetworkError } from "@/services/http";
import type { Invoice } from "@/lib/types";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const fresh = await invoiceService.get(id);
        if (!cancelled) setInvoice(fresh);
      } catch (e) {
        // This page fetched one invoice by id, which has no cached equivalent —
        // offline it just failed and rendered "Invoice not found". The full
        // invoice list IS cached, so pick this one out of it instead. Only for
        // a genuine connectivity failure: a 404/403 must still read as
        // not-found rather than silently showing a stale local copy.
        if (e instanceof NetworkError) {
          const cached = (await readCache<Invoice[]>("invoices")) ?? [];
          const match = cached.find((i) => String(i._id) === String(id));
          if (!cancelled && match) setInvoice(match);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Header title="Edit Invoice" />
      <div id="ct">
        {loading ? (
          <>
            <SkeletonFormCard fields={5} />
            <SkeletonFormCard fields={3} />
          </>
        ) : invoice ? (
          <InvoiceForm invoice={invoice} />
        ) : (
          <div className="em">Invoice not found</div>
        )}
      </div>
    </>
  );
}
