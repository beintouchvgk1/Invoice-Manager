"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { Loader } from "@/components/Common/Loader";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { ConfirmModal } from "@/components/Common/ConfirmModal";
import { Pagination } from "@/components/Common/Pagination";
import { usePayments } from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useListControls } from "@/hooks/useListControls";
import { paymentService } from "@/services/payment.service";
import { settingsService } from "@/services/settings.service";
import { offlineDelete } from "@/lib/offline/mutate";
import { genReceiptPDF } from "@/lib/pdf";
import { fI, fD } from "@/lib/calc";
import type { Payment } from "@/lib/types";

function PaymentsPageInner() {
  const searchParams = useSearchParams();
  const { payments, loading, refresh } = usePayments();
  const { invoices, refresh: refreshInvoices } = useInvoices();
  const { customers } = useCustomers();
  const { can } = useCurrentUser();
  const [modal, setModal] = useState<{ payment?: Payment; clientId?: string; invoiceId?: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modeFilter, setModeFilter] = useState("");

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    const clientId = searchParams.get("clientId");
    if (invoiceId || clientId) {
      setModal({ clientId: clientId || undefined, invoiceId: invoiceId || undefined });
    }
  }, [searchParams]);

  const clientName = (clientId: string) => customers.find((c) => c._id === clientId)?.name || "Unknown";
  const paymentClientId = (p: Payment) => p.clientId || invoices.find((i) => i._id === p.invoiceId)?.clientId || "";
  const sorted = useMemo(
    () => payments.slice().sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b._id.localeCompare(a._id))),
    [payments]
  );
  const modeFiltered = useMemo(
    () => (modeFilter ? sorted.filter((p) => (p.mode || "Cash") === modeFilter) : sorted),
    [sorted, modeFilter]
  );
  const invoiceNumber = (p: Payment) => invoices.find((i) => i._id === p.invoiceId)?.invoiceNumber || "";
  const searchText = (p: Payment) => [p.receiptNumber, clientName(paymentClientId(p)), p.reference, invoiceNumber(p)].filter(Boolean).join(" ");
  const { search, setSearch, page, setPage, limit, setLimit, paged, total, totalPages } = useListControls(modeFiltered, searchText);

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await offlineDelete("payments", paymentService, deleteId);
      refresh();
      refreshInvoices();
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  async function handlePrintReceipt(p: Payment) {
    const inv = invoices.find((i) => i._id === p.invoiceId);
    const client = customers.find((c) => c._id === paymentClientId(p));
    const settings = await settingsService.get();
    genReceiptPDF(p, inv ? inv.invoiceNumber : "Advance Payment", client, settings);
  }

  return (
    <>
      <Header
        title="Payments"
        actions={can("payments.create") && <button className="btn bp sm" onClick={() => setModal({})}>+ Add Payment</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={7} rows={7} />
        ) : (
          <>
          <div className="list-toolbar">
            <input
              className="list-search"
              placeholder="Search by receipt no, client, reference, invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="list-filter" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
              <option value="">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt No</th>
                  <th>Client</th>
                  <th>Against</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Mode</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((p) => {
                    const inv = invoices.find((i) => i._id === p.invoiceId);
                    return (
                      <tr key={p._id}>
                        <td>{fD(p.date)}</td>
                        <td>
                          {p.__offlinePending ? (
                            <span className="bd bok" title="Made offline — the real receipt number is assigned once this syncs">
                              Pending Sync
                            </span>
                          ) : (
                            p.receiptNumber
                          )}
                        </td>
                        <td>{clientName(paymentClientId(p))}</td>
                        <td>{inv ? inv.invoiceNumber : <span className="bd bok">Advance</span>}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>Rs. {fI(p.amount)}</td>
                        <td>
                          <span className={`bd ${p.mode === "Cash" ? "bok" : "bpd"}`}>{p.mode || "Cash"}</span>
                          {p.reference && <><br /><span style={{ fontSize: 10.5, color: "#64748b" }}>{p.reference}</span></>}
                        </td>
                        <td>
                          <div className="ac">
                            <button
                              className="btn sm bs"
                              disabled={p.__offlinePending}
                              title={p.__offlinePending ? "Available once this payment finishes syncing" : undefined}
                              onClick={() => handlePrintReceipt(p)}
                            >
                              Receipt PDF
                            </button>
                            {can("payments.edit") && (
                              <button className="btn sm bp" onClick={() => setModal({ payment: p })}>Edit</button>
                            )}
                            {can("payments.delete") && (
                              <button className="btn sm brd" onClick={() => setDeleteId(p._id)}>Del</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="em">No payments recorded yet. Click &quot;+ Add Payment&quot; to record one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
          </>
        )}
      </div>

      {modal && (
        <PaymentModal
          payment={modal.payment}
          presetClientId={modal.clientId}
          presetInvoiceId={modal.invoiceId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
            refreshInvoices();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PaymentsPageInner />
    </Suspense>
  );
}
