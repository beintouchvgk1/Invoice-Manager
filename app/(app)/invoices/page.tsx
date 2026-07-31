"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { InvoiceTable } from "@/components/Invoice/InvoiceTable";
import { ConfirmModal } from "@/components/Common/ConfirmModal";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { Pagination } from "@/components/Common/Pagination";
import { usePrintInvoice } from "@/components/Invoice/InvoicePreview";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useListControls } from "@/hooks/useListControls";
import { invoiceService } from "@/services/invoice.service";
import { offlineDelete } from "@/lib/offline/mutate";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, loading, refresh } = useInvoices();
  const { customers } = useCustomers();
  const { can } = useCurrentUser();
  const printInvoice = usePrintInvoice();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const clientName = (clientId: string) => customers.find((c) => c._id === clientId)?.name || "Unknown";
  const sorted = useMemo(
    () => invoices.slice().sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b._id.localeCompare(a._id))),
    [invoices]
  );
  const statusFiltered = useMemo(
    () => (statusFilter ? sorted.filter((i) => i.status === statusFilter) : sorted),
    [sorted, statusFilter]
  );
  const searchText = (i: Invoice) => [i.invoiceNumber, clientName(i.clientId)].join(" ");
  const { search, setSearch, page, setPage, limit, setLimit, paged, total, totalPages } = useListControls(statusFiltered, searchText);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await offlineDelete("invoices", invoiceService, deleteId);
      refresh();
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function handlePrint(invoice: Invoice) {
    const client = customers.find((c) => c._id === invoice.clientId);
    printInvoice(invoice, client);
  }

  return (
    <>
      <Header
        title="Invoices"
        actions={
          can("invoices.create") && (
            <button className="btn bp sm" onClick={() => router.push("/invoices/new")}>+ New Invoice</button>
          )
        }
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={7} rows={7} />
        ) : (
          <>
            <div className="list-toolbar">
              <input
                className="list-search"
                placeholder="Search by invoice number or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="list-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <InvoiceTable
              invoices={paged}
              clients={customers}
              onDelete={setDeleteId}
              onPrint={handlePrint}
              onAddPayment={setPayFor}
              canEdit={can("invoices.edit")}
              canDelete={can("invoices.delete")}
            />
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? Payments already recorded against it will be kept as advance payments."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {payFor && (
        <PaymentModal
          presetClientId={payFor.clientId}
          presetInvoiceId={payFor._id}
          locked
          onClose={() => setPayFor(null)}
          onSaved={() => {
            setPayFor(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
