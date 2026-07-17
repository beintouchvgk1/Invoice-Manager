"use client";
import { use, useEffect, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Loader } from "@/components/Common/Loader";
import { InvoiceForm } from "@/components/Invoice/InvoiceForm";
import { invoiceService } from "@/services/invoice.service";
import type { Invoice } from "@/lib/types";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoiceService.get(id).then(setInvoice).finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Header title="New Invoice" />
      <div id="ct">
        {loading ? <Loader /> : invoice ? <InvoiceForm invoice={invoice} /> : <div className="em">Invoice not found</div>}
      </div>
    </>
  );
}
