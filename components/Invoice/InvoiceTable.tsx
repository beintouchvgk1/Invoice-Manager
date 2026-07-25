"use client";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/Common/Badge";
import { fI, fD, ageD, ost } from "@/lib/calc";
import type { Client, Invoice } from "@/lib/types";

export function InvoiceTable({
  invoices,
  clients,
  onDelete,
  onPrint,
  onAddPayment,
  canEdit,
  canDelete,
}: {
  invoices: Invoice[];
  clients: Client[];
  onDelete: (id: string) => void;
  onPrint: (invoice: Invoice) => void;
  onAddPayment: (invoice: Invoice) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const clientName = (clientId: string) => clients.find((c) => c._id === clientId)?.name || "Unknown";
  const rows = invoices.slice().reverse();

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Date</th>
            <th>Client</th>
            <th>Total</th>
            <th>Status</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((inv) => {
              const overdue = ost(inv) > 0 && ageD(inv.date) > 30;
              return (
                <tr key={inv._id} style={overdue ? { background: "#fef2f2" } : undefined}>
                  <td>{inv.invoiceNumber}{overdue && <> <span className="bd bun">{ageD(inv.date)}d</span></>}</td>
                  <td>{fD(inv.date)}</td>
                  <td>{clientName(inv.clientId)}</td>
                  <td>Rs. {fI(inv.total)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td><span style={{ fontSize: 11, color: "#64748b" }}>{inv.paymentType === "cash" ? "Cash" : "Credit"}</span></td>
                  <td>
                    <div className="ac">
                      <button className="btn sm bs" onClick={() => onPrint(inv)}>PDF</button>
                      {canEdit && (
                        <button className="btn sm bp" onClick={() => router.push(`/invoices/${inv._id}/edit`)}>Edit</button>
                      )}
                      {canEdit && inv.paymentType !== "cash" && inv.status !== "Paid" && (
                        <button
                          className="btn sm"
                          style={{ background: "#ecfdf5", color: "#059669", fontWeight: 700 }}
                          onClick={() => onAddPayment(inv)}
                        >
                          + Payment
                        </button>
                      )}
                      {canDelete && <button className="btn sm brd" onClick={() => onDelete(inv._id)}>Del</button>}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr><td colSpan={7} className="em">No invoices yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
