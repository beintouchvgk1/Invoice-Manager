"use client";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { InvoiceTable } from "@/components/Invoice/InvoiceTable";
import { usePrintInvoice } from "@/components/Invoice/InvoicePreview";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { invoiceService } from "@/services/invoice.service";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, loading, refresh } = useInvoices();
  const { customers } = useCustomers();
  const printInvoice = usePrintInvoice();

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice? Payments against it will be kept as advance payments.")) return;
    await invoiceService.remove(id);
    refresh();
  }

  function handlePrint(invoice: Invoice) {
    const client = customers.find((c) => c._id === invoice.clientId);
    printInvoice(invoice, client);
  }

  return (
    <>
      <Header
        title="Invoices"
        actions={<button className="btn bp sm" onClick={() => router.push("/invoices/new")}>+ New Invoice</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={7} rows={7} />
        ) : (
          <InvoiceTable
            invoices={invoices}
            clients={customers}
            onDelete={handleDelete}
            onPrint={handlePrint}
            onAddPayment={(invoice) => router.push(`/payments?invoiceId=${invoice._id}&clientId=${invoice.clientId}`)}
          />
        )}
      </div>
    </>
  );
}
