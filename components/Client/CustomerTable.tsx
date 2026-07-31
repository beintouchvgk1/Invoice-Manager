"use client";
import { fI, ageD, ost } from "@/lib/calc";
import type { Client, Invoice, Payment } from "@/lib/types";

export function CustomerTable({
  clients,
  invoices,
  payments,
  onLedger,
  onAddPayment,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  onLedger: (client: Client) => void;
  onAddPayment: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const paymentClientId = (p: Payment) => p.clientId || invoices.find((i) => i._id === p.invoiceId)?.clientId;

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Client &amp; Address</th>
            <th>Mobile</th>
            <th>Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length ? (
            clients.map((c) => {
              const addr = [c.addressLine1, c.addressLine2, c.addressLine3, [c.city, c.state, c.pincode].filter(Boolean).join(", ")]
                .filter(Boolean)
                .join(", ");
              const clientInvoices = invoices.filter((i) => i.clientId === c._id);
              const clientPayments = payments.filter((p) => paymentClientId(p) === c._id);
              const hasHistory = clientInvoices.length > 0 || clientPayments.length > 0;
              const totalInvoiced = clientInvoices.reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
              const totalReceived = clientPayments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
              const net = totalInvoiced - totalReceived;
              const isOverdue = clientInvoices.some((i) => ost(i) > 0 && ageD(i.date) > 30);
              let bal;
              if (net > 0) {
                bal = isOverdue
                  ? <span className="bd bun">Rs. {fI(net)} OVERDUE</span>
                  : <span className="bd bok">Rs. {fI(net)} due</span>;
              } else if (net < 0) {
                bal = <span className="bd bpd">Advance Rs. {fI(-net)}</span>;
              } else {
                bal = <span className="bd bpd">Clear</span>;
              }

              return (
                <tr key={c._id} style={isOverdue ? { background: "#fef2f2" } : undefined}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.__offlinePending && (
                      <>
                        {" "}
                        <span className="bd bok" title="Made offline — will sync once you're back online">Pending Sync</span>
                      </>
                    )}
                    {c.groupName && (
                      <>
                        {" "}
                        <span className="bd" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{c.groupName}</span>
                      </>
                    )}
                    <br />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{addr}</span>
                  </td>
                  <td>{c.mobile || "—"}</td>
                  <td>{bal}</td>
                  <td>
                    <div className="ac">
                      <button className="btn sm bg" onClick={() => onLedger(c)}>Ledger</button>
                      <button
                        className="btn sm"
                        style={{ background: "#ecfdf5", color: "#059669", fontWeight: 700 }}
                        onClick={() => onAddPayment(c)}
                      >
                        + Payment
                      </button>
                      {canEdit && <button className="btn sm bp" onClick={() => onEdit(c)}>Edit</button>}
                      {canDelete && (
                        <button
                          className="btn sm brd"
                          disabled={hasHistory}
                          title={hasHistory ? "This client has invoices or payments and cannot be deleted" : undefined}
                          onClick={() => onDelete(c)}
                        >
                          Del
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={4} className="em">No clients yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
