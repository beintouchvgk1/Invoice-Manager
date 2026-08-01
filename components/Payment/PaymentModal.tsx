"use client";
import { useMemo, useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { paymentService } from "@/services/payment.service";
import { offlineCreate, offlineUpdate } from "@/lib/offline/mutate";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { fI, td, ost } from "@/lib/calc";
import type { Payment } from "@/lib/types";

export function PaymentModal({
  payment,
  presetClientId,
  presetInvoiceId,
  locked,
  onClose,
  onSaved,
}: {
  payment?: Payment;
  presetClientId?: string;
  presetInvoiceId?: string;
  // Bg_12: when opened from an invoice's own "+ Payment" action, the client and
  // invoice it's for are already fixed by context and shouldn't be changeable.
  locked?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(payment?.clientId || presetClientId || "");
  const [invoiceId, setInvoiceId] = useState(payment?.invoiceId || presetInvoiceId || "");
  const [date, setDate] = useState(payment?.date || td());
  const [amount, setAmount] = useState(String(payment?.amount ?? ""));
  const [mode, setMode] = useState<"Cash" | "Bank">(payment?.mode || "Bank");
  const [reference, setReference] = useState(payment?.reference || "");
  const [notes, setNotes] = useState(payment?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Both dropdowns used to fetch directly (customerService.list() /
  // invoiceService.list(clientId)) instead of going through the cached hooks —
  // offline, those fetches just failed silently and left both selects empty,
  // making it impossible to log a payment for anyone but a preset client.
  // useCustomers()/useInvoices() are cache-first, so they still populate from
  // the same data every other page already has cached. useInvoices() is
  // called with no clientId (the full list, same cache entry the Invoices
  // page uses) and filtered client-side here instead — useOfflineResource
  // caches by resource name only, so calling it with a clientId would have
  // overwritten that shared cache with a filtered subset.
  const { customers: clients } = useCustomers();
  const { invoices: allInvoices } = useInvoices();
  const invoices = useMemo(
    () => allInvoices.filter((i) => i.clientId === clientId && (ost(i) > 0 || String(i._id) === String(invoiceId))),
    [allInvoices, clientId, invoiceId]
  );

  // A <select> whose value matches no <option> silently displays the first one
  // instead — so a preset client that isn't in the list (its record was deleted,
  // or this device never cached it) looked like "- Select Client -" with nothing
  // chosen, and saving then failed with "Select a client" on a locked field the
  // user couldn't even change. Keep the real selection visible and submittable.
  const clientOptions = useMemo(() => {
    if (!clientId || clients.some((c) => c._id === clientId)) return clients;
    return [{ _id: clientId, name: "(client not available offline)" } as (typeof clients)[number], ...clients];
  }, [clients, clientId]);

  const invoiceOptions = useMemo(() => {
    if (!invoiceId || invoices.some((i) => i._id === invoiceId)) return invoices;
    const known = allInvoices.find((i) => i._id === invoiceId);
    return known ? [known, ...invoices] : invoices;
  }, [invoices, allInvoices, invoiceId]);

  async function handleSave() {
    setError("");
    if (!clientId) return setError("Select a client");
    const parsedAmount = parseFloat(amount || "0");
    if (!date || !parsedAmount) return setError("Date and amount are required");

    setBusy(true);
    try {
      const payload = {
        clientId,
        invoiceId: invoiceId || null,
        date,
        amount: parsedAmount,
        mode,
        reference: reference.trim(),
        notes: notes.trim(),
      };
      if (payment) await offlineUpdate("payments", paymentService, payment._id, payload);
      else await offlineCreate("payments", paymentService, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3>{payment ? "Edit Payment" : "Add Payment"}</h3>
      {error && <Toast kind="err" message={error} />}
      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="fg fl">
          <label>Client *</label>
          <select
            value={clientId}
            disabled={locked}
            onChange={(e) => { setClientId(e.target.value); setInvoiceId(""); }}
          >
            <option value="">- Select Client -</option>
            {clientOptions.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="fg fl">
          <label>Against Invoice</label>
          <select value={invoiceId} disabled={locked} onChange={(e) => setInvoiceId(e.target.value)}>
            <option value="">Advance Payment (No Invoice)</option>
            {invoiceOptions.map((i) => (
              <option key={i._id} value={i._id}>
                {i.invoiceNumber || "Pending Sync"} — Rs. {fI(ost(i))} outstanding
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Date *</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="fg">
          <label>Amount *</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="fg">
          <label>Payment Mode *</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as "Cash" | "Bank")}>
            <option>Cash</option>
            <option>Bank</option>
          </select>
        </div>
        <div className="fg">
          <label>Reference / UTR / Cheque No.</label>
          <input placeholder="Optional" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="fg fl">
          <label>Notes</label>
          <input placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        <button className="btn bp" onClick={handleSave} disabled={busy}>
          {payment ? "Update Payment" : "Save Payment"}
        </button>
      </div>
    </Modal>
  );
}
