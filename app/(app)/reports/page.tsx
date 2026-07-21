"use client";
import { useMemo, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { Loader } from "@/components/Common/Loader";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { fI, fD, ageD, ost } from "@/lib/calc";

type Tab = "out" | "rcv" | "age" | "grp";

export default function ReportsPage() {
  const { customers, loading: l1 } = useCustomers();
  const { invoices, loading: l2 } = useInvoices();
  const { payments, loading: l3 } = usePayments();
  const [tab, setTab] = useState<Tab>("out");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loading = l1 || l2 || l3;
  const clientName = useMemo(() => {
    const m = new Map(customers.map((c) => [c._id, c.name]));
    return (clientId: string) => m.get(clientId) || "Unknown";
  }, [customers]);
  const clientGroup = useMemo(() => new Map(customers.map((c) => [c._id, c.groupName || ""])), [customers]);

  return (
    <>
      <Header title="Reports" />
      <div id="ct">
        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="rp-filter">
              <button className={`rtab${tab === "out" ? " active" : ""}`} onClick={() => setTab("out")}>Outstanding Receivable</button>
              <button className={`rtab${tab === "rcv" ? " active" : ""}`} onClick={() => setTab("rcv")}>Payment Received (Income)</button>
              <button className={`rtab${tab === "age" ? " active" : ""}`} onClick={() => setTab("age")}>Ageing Analysis</button>
              <button className={`rtab${tab === "grp" ? " active" : ""}`} onClick={() => setTab("grp")}>Group-wise Outstanding</button>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label>From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <label>To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <button className="btn bs sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button>
              </div>
            </div>

            <div className="tw">
              {tab === "out" && <OutstandingReport invoices={invoices} fromDate={fromDate} toDate={toDate} clientName={clientName} />}
              {tab === "rcv" && <ReceivedReport payments={payments} invoices={invoices} fromDate={fromDate} toDate={toDate} clientName={clientName} />}
              {tab === "age" && <AgeingReport invoices={invoices} clientName={clientName} />}
              {tab === "grp" && <GroupReport invoices={invoices} fromDate={fromDate} toDate={toDate} clientName={clientName} clientGroup={clientGroup} />}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function OutstandingReport({
  invoices,
  fromDate,
  toDate,
  clientName,
}: {
  invoices: ReturnType<typeof useInvoices>["invoices"];
  fromDate: string;
  toDate: string;
  clientName: (id: string) => string;
}) {
  let rows = invoices.filter((i) => ost(i) > 0);
  if (fromDate) rows = rows.filter((i) => i.date >= fromDate);
  if (toDate) rows = rows.filter((i) => i.date <= toDate);
  rows = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((s, i) => s + ost(i), 0);

  return (
    <table>
      <thead>
        <tr><th>Invoice No</th><th>Date</th><th>Age</th><th>Client</th><th style={{ textAlign: "right" }}>Invoice Total</th><th style={{ textAlign: "right" }}>Received</th><th style={{ textAlign: "right" }}>Outstanding</th></tr>
      </thead>
      <tbody>
        {rows.map((i) => {
          const age = ageD(i.date);
          return (
            <tr key={i._id} style={age > 30 ? { background: "#fef2f2" } : undefined}>
              <td>{i.invoiceNumber}</td>
              <td>{fD(i.date)}</td>
              <td>{age > 30 ? <span className="bd bun">{age}d</span> : `${age}d`}</td>
              <td>{clientName(i.clientId)}</td>
              <td style={{ textAlign: "right" }}>Rs. {fI(i.total)}</td>
              <td style={{ textAlign: "right" }}>Rs. {fI(i.paidAmount || 0)}</td>
              <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>Rs. {fI(ost(i))}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px" }}>TOTAL OUTSTANDING</td>
          <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px", color: "#dc2626" }}>Rs. {fI(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function ReceivedReport({
  payments,
  invoices,
  fromDate,
  toDate,
  clientName,
}: {
  payments: ReturnType<typeof usePayments>["payments"];
  invoices: ReturnType<typeof useInvoices>["invoices"];
  fromDate: string;
  toDate: string;
  clientName: (id: string) => string;
}) {
  let rows = payments.slice();
  if (fromDate) rows = rows.filter((r) => r.date >= fromDate);
  if (toDate) rows = rows.filter((r) => r.date <= toDate);
  rows = rows.sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((s, r) => s + parseFloat(String(r.amount || 0)), 0);
  const paymentClientId = (p: (typeof rows)[number]) => p.clientId || invoices.find((i) => i._id === p.invoiceId)?.clientId || "";

  return (
    <table>
      <thead>
        <tr><th>Receipt No</th><th>Date</th><th>Client</th><th>Against</th><th style={{ textAlign: "right" }}>Amount</th><th>Mode</th><th>Reference</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const inv = invoices.find((i) => i._id === r.invoiceId);
          return (
            <tr key={r._id}>
              <td>{r.receiptNumber}</td>
              <td>{fD(r.date)}</td>
              <td>{clientName(paymentClientId(r))}</td>
              <td>{inv ? inv.invoiceNumber : <span className="bd bok">Advance</span>}</td>
              <td style={{ textAlign: "right" }}>Rs. {fI(r.amount)}</td>
              <td>{r.mode || "Cash"}</td>
              <td>{r.reference || "—"}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px" }}>TOTAL INCOME RECEIVED</td>
          <td style={{ fontWeight: 700, textAlign: "right", padding: "8px 11px", color: "#059669" }}>Rs. {fI(total)}</td>
          <td colSpan={2}></td>
        </tr>
      </tfoot>
    </table>
  );
}

function AgeingReport({ invoices, clientName }: { invoices: ReturnType<typeof useInvoices>["invoices"]; clientName: (id: string) => string }) {
  const pending = invoices.filter((i) => ost(i) > 0);
  const b1 = pending.filter((i) => ageD(i.date) <= 30);
  const b2 = pending.filter((i) => ageD(i.date) > 30 && ageD(i.date) <= 60);
  const b3 = pending.filter((i) => ageD(i.date) > 60);
  const bSum = (arr: typeof pending) => arr.reduce((s, i) => s + ost(i), 0);
  const t1 = bSum(b1), t2 = bSum(b2), t3 = bSum(b3);

  function bucket(arr: typeof pending, label: string, color: string) {
    if (!arr.length) return null;
    const sorted = arr.slice().sort((a, b) => a.date.localeCompare(b.date));
    return (
      <>
        <tr><td colSpan={6} style={{ background: color + "15", fontWeight: 700, color, padding: "7px 11px" }}>{label} — Rs. {fI(bSum(arr))}</td></tr>
        {sorted.map((i) => (
          <tr key={i._id}>
            <td>{i.invoiceNumber}</td>
            <td>{fD(i.date)}</td>
            <td><span className="bd" style={{ background: color + "22", color }}>{ageD(i.date)} days</span></td>
            <td>{clientName(i.clientId)}</td>
            <td style={{ textAlign: "right" }}>Rs. {fI(i.total)}</td>
            <td style={{ textAlign: "right", fontWeight: 700, color }}>Rs. {fI(ost(i))}</td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14, padding: 16 }}>
        <div className="ldc" style={{ borderColor: "#059669", flex: 1 }}>
          <div className="ld-lb">0 – 30 Days</div>
          <div className="ld-vl" style={{ color: "#059669" }}>Rs. {fI(t1)}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{b1.length} invoice(s)</div>
        </div>
        <div className="ldc" style={{ borderColor: "#d97706", flex: 1 }}>
          <div className="ld-lb">31 – 60 Days</div>
          <div className="ld-vl" style={{ color: "#d97706" }}>Rs. {fI(t2)}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{b2.length} invoice(s)</div>
        </div>
        <div className="ldc" style={{ borderColor: "#dc2626", flex: 1 }}>
          <div className="ld-lb">60+ Days</div>
          <div className="ld-vl" style={{ color: "#dc2626" }}>Rs. {fI(t3)}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{b3.length} invoice(s)</div>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Invoice No</th><th>Date</th><th>Age</th><th>Client</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Outstanding</th></tr>
        </thead>
        <tbody>
          {pending.length ? (
            <>
              {bucket(b1, "0 – 30 DAYS", "#059669")}
              {bucket(b2, "31 – 60 DAYS", "#d97706")}
              {bucket(b3, "60+ DAYS — URGENT", "#dc2626")}
            </>
          ) : (
            <tr><td colSpan={6} className="em">No pending invoices. All clear!</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px" }}>TOTAL PENDING</td>
            <td style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px", color: "#dc2626" }}>Rs. {fI(t1 + t2 + t3)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

function GroupReport({
  invoices,
  fromDate,
  toDate,
  clientName,
  clientGroup,
}: {
  invoices: ReturnType<typeof useInvoices>["invoices"];
  fromDate: string;
  toDate: string;
  clientName: (id: string) => string;
  clientGroup: Map<string, string>;
}) {
  let rows = invoices.filter((i) => ost(i) > 0);
  if (fromDate) rows = rows.filter((i) => i.date >= fromDate);
  if (toDate) rows = rows.filter((i) => i.date <= toDate);

  const byClient = new Map<string, { total: number; paidAmount: number; outstanding: number; count: number }>();
  rows.forEach((i) => {
    const e = byClient.get(i.clientId) || { total: 0, paidAmount: 0, outstanding: 0, count: 0 };
    e.total += parseFloat(String(i.total || 0));
    e.paidAmount += parseFloat(String(i.paidAmount || 0));
    e.outstanding += ost(i);
    e.count++;
    byClient.set(i.clientId, e);
  });

  const groups = new Map<string, { clientId: string; name: string; d: { total: number; paidAmount: number; outstanding: number; count: number } }[]>();
  byClient.forEach((d, clientId) => {
    const g = clientGroup.get(clientId) || "Ungrouped";
    const arr = groups.get(g) || [];
    arr.push({ clientId, name: clientName(clientId), d });
    groups.set(g, arr);
  });

  const groupNames = Array.from(groups.keys()).sort((a, b) => {
    if (a === "Ungrouped") return 1;
    if (b === "Ungrouped") return -1;
    return a.localeCompare(b);
  });

  let grand = 0;
  const body: React.ReactNode[] = [];
  groupNames.forEach((g) => {
    const arr = groups.get(g)!.slice().sort((a, b) => b.d.outstanding - a.d.outstanding);
    const groupOutstanding = arr.reduce((s, x) => s + x.d.outstanding, 0);
    const groupTotal = arr.reduce((s, x) => s + x.d.total, 0);
    const groupPaid = arr.reduce((s, x) => s + x.d.paidAmount, 0);
    grand += groupOutstanding;
    body.push(
      <tr key={`h-${g}`}>
        <td colSpan={2} style={{ background: "#eff6ff", fontWeight: 700, color: "#1d4ed8", padding: "7px 11px" }}>
          {g} ({arr.length} client{arr.length > 1 ? "s" : ""})
        </td>
        <td style={{ background: "#eff6ff", textAlign: "right", fontWeight: 700, padding: "7px 11px" }}>Rs. {fI(groupTotal)}</td>
        <td style={{ background: "#eff6ff", textAlign: "right", fontWeight: 700, padding: "7px 11px" }}>Rs. {fI(groupPaid)}</td>
        <td style={{ background: "#eff6ff", textAlign: "right", fontWeight: 700, color: "#dc2626", padding: "7px 11px" }}>Rs. {fI(groupOutstanding)}</td>
      </tr>
    );
    arr.forEach((x) => {
      body.push(
        <tr key={x.clientId}>
          <td style={{ paddingLeft: 24 }}>{x.name}</td>
          <td>{x.d.count} invoice(s)</td>
          <td style={{ textAlign: "right" }}>Rs. {fI(x.d.total)}</td>
          <td style={{ textAlign: "right" }}>Rs. {fI(x.d.paidAmount)}</td>
          <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>Rs. {fI(x.d.outstanding)}</td>
        </tr>
      );
    });
  });

  return (
    <table>
      <thead>
        <tr><th>Group / Client</th><th>Invoices</th><th style={{ textAlign: "right" }}>Invoiced</th><th style={{ textAlign: "right" }}>Received</th><th style={{ textAlign: "right" }}>Outstanding</th></tr>
      </thead>
      <tbody>{body.length ? body : <tr><td colSpan={5} className="em">No outstanding invoices.</td></tr>}</tbody>
      <tfoot>
        <tr>
          <td colSpan={4} style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px" }}>TOTAL OUTSTANDING (ALL GROUPS)</td>
          <td style={{ textAlign: "right", fontWeight: 700, padding: "8px 11px", color: "#dc2626" }}>Rs. {fI(grand)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
