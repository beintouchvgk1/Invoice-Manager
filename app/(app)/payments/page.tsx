"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { Loader } from "@/components/Common/Loader";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { usePayments } from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { useCustomers } from "@/hooks/useCustomers";
import { paymentService } from "@/services/payment.service";
import { settingsService } from "@/services/settings.service";
import { genReceiptPDF } from "@/lib/pdf";
import { fI, fD } from "@/lib/calc";
import type { Payment } from "@/lib/types";

function PaymentsPageInner() {
  const searchParams = useSearchParams();
  const { payments, loading, refresh } = usePayments();
  const { invoices, refresh: refreshInvoices } = useInvoices();
  const { customers } = useCustomers();
  const [modal, setModal] = useState<{ payment?: Payment; clientId?: string; invoiceId?: string } | null>(null);

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    const clientId = searchParams.get("clientId");
    if (invoiceId || clientId) {
      setModal({ clientId: clientId || undefined, invoiceId: invoiceId || undefined });
    }
  }, [searchParams]);

  const clientName = (clientId: string) => customers.find((c) => c._id === clientId)?.name || "Unknown";
  const paymentClientId = (p: Payment) => p.clientId || invoices.find((i) => i._id === p.invoiceId)?.clientId || "";
  const sorted = payments.slice().sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b._id.localeCompare(a._id)));

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment?")) return;
    await paymentService.remove(id);
    refresh();
    refreshInvoices();
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
        actions={<button className="btn bp sm" onClick={() => setModal({})}>+ Add Payment</button>}
      />
      <div id="ct">
        {loading ? (
          <Loader />
        ) : (
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
                {sorted.length ? (
                  sorted.map((p) => {
                    const inv = invoices.find((i) => i._id === p.invoiceId);
                    return (
                      <tr key={p._id}>
                        <td>{fD(p.date)}</td>
                        <td>{p.receiptNumber}</td>
                        <td>{clientName(paymentClientId(p))}</td>
                        <td>{inv ? inv.invoiceNumber : <span className="bd bok">Advance</span>}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#1a8a3a" }}>Rs. {fI(p.amount)}</td>
                        <td>
                          <span className={`bd ${p.mode === "Cash" ? "bok" : "bpd"}`}>{p.mode || "Cash"}</span>
                          {p.reference && <><br /><span style={{ fontSize: 10.5, color: "#888" }}>{p.reference}</span></>}
                        </td>
                        <td>
                          <div className="ac">
                            <button className="btn sm bs" onClick={() => handlePrintReceipt(p)}>Receipt PDF</button>
                            <button className="btn sm bp" onClick={() => setModal({ payment: p })}>Edit</button>
                            <button className="btn sm brd" onClick={() => handleDelete(p._id)}>Del</button>
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
