"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonStatGrid, SkeletonTable } from "@/components/Common/Skeleton";
import { StatusBadge } from "@/components/Common/Badge";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { fI, fD, ageD, ost } from "@/lib/calc";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { backupService } from "@/services/backup.service";

export default function DashboardPage() {
  const router = useRouter();
  const { customers } = useCustomers();
  const { invoices, loading, refresh: refreshInvoices } = useInvoices();
  const { payments, refresh: refreshPayments } = usePayments();
  const { can } = useCurrentUser();
  const { showToast } = useToast();
  const [payFor, setPayFor] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  async function handleBackup() {
    setBackingUp(true);
    try {
      await backupService.download();
      showToast("Backup downloaded — store this file somewhere secure.", "ok");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to download backup");
    } finally {
      setBackingUp(false);
    }
  }

  const clientName = useMemo(() => {
    const map = new Map(customers.map((c) => [c._id, c.name]));
    return (clientId: string) => map.get(clientId) || "Unknown";
  }, [customers]);

  const totalBilled = invoices.reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
  const totalCollected = payments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
  const totalOutstanding = invoices.reduce((s, i) => s + ost(i), 0);
  const overdueInvoices = invoices.filter((i) => ost(i) > 0 && ageD(i.date) > 30);
  const overdueAmount = overdueInvoices.reduce((s, i) => s + ost(i), 0);

  const byClient = new Map<string, { amount: number; maxAge: number; count: number }>();
  overdueInvoices.forEach((i) => {
    const entry = byClient.get(i.clientId) || { amount: 0, maxAge: 0, count: 0 };
    entry.amount += ost(i);
    entry.count++;
    const age = ageD(i.date);
    if (age > entry.maxAge) entry.maxAge = age;
    byClient.set(i.clientId, entry);
  });
  const overdueClients = Array.from(byClient.entries()).sort((a, b) => b[1].amount - a[1].amount);

  const recent = invoices.slice().reverse().slice(0, 8);

  return (
    <>
      <Header
        title="Dashboard"
        actions={
          can("backup.export") && (
            <button className="btn bg sm" disabled={backingUp} onClick={handleBackup}>
              {backingUp ? "Preparing backup..." : "Download Backup"}
            </button>
          )
        }
      />
      <div id="ct">
        {loading ? (
          <>
            <SkeletonStatGrid count={4} />
            <div style={{ marginTop: 20 }}>
              <SkeletonTable columns={5} rows={6} />
            </div>
          </>
        ) : (
          <>
            <div className="sg">
              <div className="sc">
                <div className="lb">Total Billed</div>
                <div className="vl">Rs. {fI(totalBilled)}</div>
              </div>
              <div className="sc" style={{ borderLeftColor: "#059669" }}>
                <div className="lb">Income Collected</div>
                <div className="vl" style={{ color: "#059669" }}>Rs. {fI(totalCollected)}</div>
              </div>
              <div className="sc" style={{ borderLeftColor: "#d97706" }}>
                <div className="lb">Outstanding</div>
                <div className="vl" style={{ color: "#d97706" }}>Rs. {fI(totalOutstanding)}</div>
              </div>
              <div className="sc" style={{ borderLeftColor: "#dc2626" }}>
                <div className="lb">Overdue (30+ days)</div>
                <div className="vl" style={{ color: "#dc2626" }}>Rs. {fI(overdueAmount)}</div>
              </div>
            </div>

            {overdueClients.length > 0 && (
              <div className="fc" style={{ borderLeft: "4px solid #dc2626" }}>
                <h3 style={{ color: "#dc2626", borderBottomColor: "#fecaca" }}>
                  ⚠ Overdue Clients — Follow Up Required
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Overdue Invoices</th>
                      <th>Oldest (days)</th>
                      <th style={{ textAlign: "right" }}>Amount Due</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueClients.map(([clientId, d]) => (
                      <tr key={clientId} style={{ background: "#fef2f2" }}>
                        <td><strong>{clientName(clientId)}</strong></td>
                        <td>{d.count}</td>
                        <td><span className="bd bun">{d.maxAge} days</span></td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>Rs. {fI(d.amount)}</td>
                        <td>
                          <button
                            className="btn sm"
                            style={{ background: "#ecfdf5", color: "#059669", fontWeight: 700 }}
                            onClick={() => setPayFor(clientId)}
                          >
                            Add Payment
                          </button>{" "}
                          <button className="btn sm bg" onClick={() => router.push(`/ledger/${clientId}`)}>
                            Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length ? (
                    recent.map((i) => (
                      <tr key={i._id}>
                        <td>{i.invoiceNumber}</td>
                        <td>{fD(i.date)}</td>
                        <td>{clientName(i.clientId)}</td>
                        <td>Rs. {fI(i.total)}</td>
                        <td><StatusBadge status={i.status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="em">No invoices yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {payFor && (
        <PaymentModal
          presetClientId={payFor}
          onClose={() => setPayFor(null)}
          onSaved={() => {
            setPayFor(null);
            refreshInvoices();
            refreshPayments();
          }}
        />
      )}
    </>
  );
}
