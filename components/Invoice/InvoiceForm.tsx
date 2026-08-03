"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Common/Toast";
import { useCustomers } from "@/hooks/useCustomers";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";
import { invoiceService } from "@/services/invoice.service";
import { offlineCreate, offlineUpdate } from "@/lib/offline/mutate";
import { genInvoicePDF } from "@/lib/pdf";
import { fI, td } from "@/lib/calc";
import type { Invoice, InvoiceItem, InvoiceFormRow } from "@/lib/types";

function blankRow(): InvoiceFormRow {
  return { key: crypto.randomUUID(), category: "", description: "", detail: "", amount: 0 };
}

export function InvoiceForm({ invoice }: { invoice?: Invoice }) {
  const router = useRouter();
  const { customers } = useCustomers();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || "");
  const [date, setDate] = useState(invoice?.date || td());
  const [clientId, setClientId] = useState(invoice?.clientId || "");
  const [paymentType, setPaymentType] = useState<"credit" | "cash">(invoice?.paymentType || "credit");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [rows, setRows] = useState<InvoiceFormRow[]>(
    invoice?.items?.length
      ? invoice.items.map((i) => ({ ...i, key: crypto.randomUUID() }))
      : [blankRow(), blankRow(), blankRow()]
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!invoice && settings) {
      const pad = (n: number) => (n < 10 ? "00" + n : n < 100 ? "0" + n : "" + n);
      setInvoiceNumber(`${settings.invoiceNumbering.prefix}/${settings.invoiceNumbering.financialYear}/${pad(settings.invoiceNumbering.nextInvoiceCounter)}`);
    }
  }, [invoice, settings]);

  function updateRow(key: string, patch: Partial<InvoiceItem>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  const total = rows.reduce((s, r) => s + (parseFloat(String(r.amount)) || 0), 0);

  function collectItems(): InvoiceItem[] {
    return rows
      .map((r) => ({
        category: r.category,
        description: (r.description || "").trim(),
        detail: (r.detail || "").trim(),
        amount: parseFloat(String(r.amount)) || 0,
      }))
      .filter((r) => r.description || r.amount > 0);
  }

  async function save(print: boolean) {
    setError("");
    if (!date) return setError("Select invoice date.");
    if (!clientId) return setError("Select a client.");
    const items = collectItems();
    if (!items.length) return setError("Add at least one service item.");
    if (items.some((i) => !i.category)) return setError("Select a category for every service item entered.");

    setBusy(true);
    try {
      const payload = { date, clientId, items, notes: notes.trim(), paymentType };
      const saved = invoice
        ? await offlineUpdate("invoices", invoiceService, invoice._id, payload)
        : await offlineCreate("invoices", invoiceService, payload);

      // A queued-offline invoice has no real invoiceNumber yet (assigned only
      // once the atomic counter is actually claimed during sync) — printing a
      // PDF with a placeholder number would be a real GST/audit problem, so
      // this is skipped rather than faked. The "Pending Sync" badge on the
      // invoice list is the user's signal to come back and print once synced.
      if (print && !saved.__offlinePending && settings) {
        const client = customers.find((c) => c._id === clientId);
        genInvoicePDF(saved, client, settings);
      }

      // Bg_24: fired before navigating away — ToastProvider lives in the root
      // layout, so the message survives the route change and lands on the
      // invoice list the user is sent to.
      showToast(invoice ? "Invoice updated." : "Invoice created.", "ok");
      router.push("/invoices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fc">
        <h3>Invoice Details</h3>
        <div className="g2">
          <div className="fg">
            <label>Invoice No.</label>
            <input value={invoiceNumber} readOnly style={{ background: "#f1f5f9" }} />
          </div>
          <div className="fg">
            <label>Invoice Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="fg">
            <label>Client *</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">- Select Client -</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>Payment Type</label>
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as "credit" | "cash")}>
              <option value="credit">Credit (Collect Later)</option>
              <option value="cash">Cash (Paid Now)</option>
            </select>
          </div>
          <div className="fg">
            <label>Notes</label>
            <input placeholder="Internal notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="fc">
        <h3>Fees for Rendering Professional Services</h3>
        <div className="ih">
          <div className="hc">Category &amp; Description</div>
          <div className="ha">Amount (Rs.)</div>
          <div className="hr"></div>
        </div>
        <div id="ib">
          {rows.map((r, idx) => (
            <div className="irow" key={r.key}>
              <div className="i-top">
                <span className="i-sr">{idx + 1}</span>
                <select
                  className="i-cat"
                  value={r.category}
                  onChange={(e) => updateRow(r.key, { category: e.target.value })}
                >
                  <option value="">-- Category --</option>
                  {(settings?.categories || []).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="i-amt"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={r.amount || ""}
                  onChange={(e) => updateRow(r.key, { amount: parseFloat(e.target.value) || 0 })}
                />
                <button type="button" className="rm" onClick={() => removeRow(r.key)}>×</button>
              </div>
              <div className="i-bot">
                <input
                  type="text"
                  className="i-desc"
                  placeholder="Service description"
                  value={r.description}
                  onChange={(e) => updateRow(r.key, { description: e.target.value })}
                />
                <input
                  type="text"
                  className="i-dtl"
                  placeholder="Detail / particulars (optional)"
                  value={r.detail}
                  onChange={(e) => updateRow(r.key, { detail: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn bs sm" onClick={addRow}>+ Add Service</button>
        </div>
        <div className="tr">TOTAL:&nbsp;<span>Rs. {fI(total)}</span></div>
      </div>

      <div>{error && <Toast kind="err" message={error} />}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn bs" onClick={() => router.push("/invoices")}>Cancel</button>
        <button type="button" className="btn bp" disabled={busy} onClick={() => save(false)}>Save Invoice</button>
        <button type="button" className="btn bg" disabled={busy} onClick={() => save(true)}>Save &amp; Print PDF</button>
      </div>
    </>
  );
}
