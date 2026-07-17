"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { customerService } from "@/services/customer.service";
import { invoiceService } from "@/services/invoice.service";
import { paymentService } from "@/services/payment.service";
import { fI, td, ost } from "@/lib/calc";
import type { Client, Invoice, Payment } from "@/lib/types";

export function PaymentModal({
  payment,
  presetClientId,
  presetInvoiceId,
  onClose,
  onSaved,
}: {
  payment?: Payment;
  presetClientId?: string;
  presetInvoiceId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientId, setClientId] = useState(payment?.clientId || presetClientId || "");
  const [invoiceId, setInvoiceId] = useState(payment?.invoiceId || presetInvoiceId || "");
  const [date, setDate] = useState(payment?.date || td());
  const [amount, setAmount] = useState(String(payment?.amount ?? ""));
  const [mode, setMode] = useState<"Cash" | "Bank">(payment?.mode || "Bank");
  const [reference, setReference] = useState(payment?.reference || "");
  const [notes, setNotes] = useState(payment?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    customerService.list().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) {
      setInvoices([]);
      return;
    }
    invoiceService.list(clientId).then((all) => {
      setInvoices(all.filter((i) => ost(i) > 0 || String(i._id) === String(invoiceId)));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
      if (payment) await paymentService.update(payment._id, payload);
      else await paymentService.create(payload);
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
          <select value={clientId} onChange={(e) => { setClientId(e.target.value); setInvoiceId(""); }}>
            <option value="">- Select Client -</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="fg fl">
          <label>Against Invoice</label>
          <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
            <option value="">Advance Payment (No Invoice)</option>
            {invoices.map((i) => (
              <option key={i._id} value={i._id}>{i.invoiceNumber} — Rs. {fI(ost(i))} outstanding</option>
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
