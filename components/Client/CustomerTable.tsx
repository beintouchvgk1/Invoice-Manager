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
}: {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  onLedger: (client: Client) => void;
  onAddPayment: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
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
              const totalInvoiced = clientInvoices.reduce((s, i) => s + parseFloat(String(i.total || 0)), 0);
              const totalReceived = payments
                .filter((p) => paymentClientId(p) === c._id)
                .reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);
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
                <tr key={c._id} style={isOverdue ? { background: "#fff5f5" } : undefined}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.groupName && (
                      <>
                        {" "}
                        <span className="bd" style={{ background: "#eef2fa", color: "#1B3A6B" }}>{c.groupName}</span>
                      </>
                    )}
                    <br />
                    <span style={{ fontSize: 11, color: "#888" }}>{addr}</span>
                  </td>
                  <td>{c.mobile || "—"}</td>
                  <td>{bal}</td>
                  <td>
                    <div className="ac">
                      <button className="btn sm bg" onClick={() => onLedger(c)}>Ledger</button>
                      <button
                        className="btn sm"
                        style={{ background: "#e8f9ed", color: "#1a8a3a", fontWeight: 700 }}
                        onClick={() => onAddPayment(c)}
                      >
                        + Payment
                      </button>
                      <button className="btn sm bp" onClick={() => onEdit(c)}>Edit</button>
                      <button className="btn sm brd" onClick={() => onDelete(c)}>Del</button>
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
