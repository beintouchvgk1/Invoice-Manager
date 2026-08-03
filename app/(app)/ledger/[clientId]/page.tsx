"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonBlock, SkeletonTable } from "@/components/Common/Skeleton";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { settingsService } from "@/services/settings.service";
import { genLedgerPDF } from "@/lib/pdf";
import { fI, fD } from "@/lib/calc";
import type { Payment, RouteParams, LedgerEntry } from "@/lib/types";

export default function LedgerPage({ params }: RouteParams<"clientId">) {
  const { clientId } = use(params);
  const router = useRouter();
  const { customers, loading: loadingClients } = useCustomers();
  const { invoices, refresh: refreshInvoices } = useInvoices();
  const { payments, refresh: refreshPayments } = usePayments();
  const { can } = useCurrentUser();
  const [addingPayment, setAddingPayment] = useState(false);

  const client = customers.find((c) => c._id === clientId);
  const paymentClientId = (p: Payment) => p.clientId || invoices.find((i) => i._id === p.invoiceId)?.clientId || "";

  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  const clientPayments = payments.filter((p) => paymentClientId(p) === clientId);

  const entries: LedgerEntry[] = [];
  clientInvoices.forEach((i) =>
    entries.push({ date: i.date, type: "inv", description: `Invoice No. ${i.invoiceNumber}`, debit: parseFloat(String(i.total || 0)), credit: 0 })
  );
  clientPayments.forEach((p) => {
    const inv = invoices.find((i) => i._id === p.invoiceId);
    const against = inv ? `[Against: ${inv.invoiceNumber}]` : "[Advance Payment]";
    entries.push({
      date: p.date,
      type: "rec",
      description: `Receipt ${p.receiptNumber} (${p.mode || "Cash"}${p.reference ? " - " + p.reference : ""}) ${against}`,
      debit: 0,
      credit: parseFloat(String(p.amount || 0)),
    });
  });
  entries.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.type === "inv" ? -1 : 1));

  let bal = 0, totalDebit = 0, totalCredit = 0;
  const rows = entries.map((e, idx) => {
    bal += e.debit - e.credit;
    totalDebit += e.debit;
    totalCredit += e.credit;
    const bc = bal > 0 ? "#dc2626" : "#059669";
    return (
      <tr key={idx}>
        <td>{fD(e.date)}</td>
        <td>{e.type === "inv" ? <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{e.description}</span> : <span style={{ color: "#059669" }}>{e.description}</span>}</td>
        <td style={{ textAlign: "right", color: "#dc2626" }}>{e.debit > 0 ? `Rs. ${fI(e.debit)}` : ""}</td>
        <td style={{ textAlign: "right", color: "#059669" }}>{e.credit > 0 ? `Rs. ${fI(e.credit)}` : ""}</td>
        <td style={{ textAlign: "right", fontWeight: 700, color: bc }}>Rs. {fI(Math.abs(bal))} {bal > 0 ? "Dr" : "Cr"}</td>
      </tr>
    );
  });
  const net = totalDebit - totalCredit;

  async function handlePrintLedger() {
    if (!client) return;
    const settings = await settingsService.get();
    genLedgerPDF(client, entries, settings);
  }

  const loading = loadingClients;

  return (
    <>
      <Header
        title="Client Ledger"
        actions={
          <>
            <button className="btn bs sm" onClick={() => router.push("/customers")}>&larr; Clients</button>
            {client && (
              <>
                <button className="btn bp sm" onClick={handlePrintLedger}>Print Ledger PDF</button>
                {can("payments.create") && (
                  <button className="btn bg sm" onClick={() => setAddingPayment(true)}>+ Add Payment</button>
                )}
              </>
            )}
          </>
        }
      />
      <div id="ct">
        {loading ? (
          <>
            <div className="fc">
              <SkeletonBlock width={180} height={17} style={{ marginBottom: 14 }} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <SkeletonBlock width={170} height={64} />
                <SkeletonBlock width={170} height={64} />
                <SkeletonBlock width={170} height={64} />
              </div>
            </div>
            <SkeletonTable columns={5} rows={6} />
          </>
        ) : !client ? (
          <div className="em">Client not found</div>
        ) : (
          <>
            <div className="fc">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1d4ed8" }}>{client.name}</div>
                {client.mobile && <span style={{ fontSize: 12, color: "#64748b" }}>Mob: {client.mobile}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>
                {[client.addressLine1, client.addressLine2, client.addressLine3, [client.city, client.state, client.pincode].filter(Boolean).join(", ")].filter(Boolean).join(", ")}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div className="ldc" style={{ borderColor: "#1d4ed8" }}>
                  <div className="ld-lb">Total Invoiced</div>
                  <div className="ld-vl" style={{ color: "#1d4ed8" }}>Rs. {fI(totalDebit)}</div>
                </div>
                <div className="ldc" style={{ borderColor: "#059669" }}>
                  <div className="ld-lb">Total Received</div>
                  <div className="ld-vl" style={{ color: "#059669" }}>Rs. {fI(totalCredit)}</div>
                </div>
                {net > 0 ? (
                  <div className="ldc" style={{ borderColor: "#dc2626" }}>
                    <div className="ld-lb">Balance Outstanding</div>
                    <div className="ld-vl" style={{ color: "#dc2626" }}>Rs. {fI(net)}</div>
                  </div>
                ) : net < 0 ? (
                  <div className="ldc" style={{ borderColor: "#059669" }}>
                    <div className="ld-lb">Advance Balance</div>
                    <div className="ld-vl" style={{ color: "#059669" }}>Rs. {fI(-net)}</div>
                  </div>
                ) : (
                  <div className="ldc" style={{ borderColor: "#059669" }}>
                    <div className="ld-lb">Balance</div>
                    <div className="ld-vl" style={{ color: "#059669" }}>Fully Settled</div>
                  </div>
                )}
              </div>
            </div>

            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th style={{ textAlign: "right" }}>Debit (Rs.)</th>
                    <th style={{ textAlign: "right" }}>Credit (Rs.)</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows : <tr><td colSpan={5} className="em">No transactions yet.</td></tr>}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px" }}>TOTAL</td>
                    <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px", color: "#dc2626" }}>Rs. {fI(totalDebit)}</td>
                    <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px", color: "#059669" }}>Rs. {fI(totalCredit)}</td>
                    <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px", color: net > 0 ? "#dc2626" : "#059669" }}>
                      {net > 0 ? `Rs. ${fI(net)} Dr` : net < 0 ? `Rs. ${fI(-net)} Cr` : "Clear"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {addingPayment && client && (
        <PaymentModal
          presetClientId={client._id}
          onClose={() => setAddingPayment(false)}
          onSaved={() => {
            setAddingPayment(false);
            refreshInvoices();
            refreshPayments();
          }}
        />
      )}
    </>
  );
}
