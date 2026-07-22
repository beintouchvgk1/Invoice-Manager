"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { CustomerTable } from "@/components/Client/CustomerTable";
import { CustomerModal } from "@/components/Client/CustomerModal";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { customerService } from "@/services/customer.service";
import type { Client } from "@/lib/types";

export default function CustomersPage() {
  const router = useRouter();
  const { customers, loading, refresh } = useCustomers();
  const { invoices, refresh: refreshInvoices } = useInvoices();
  const { payments, refresh: refreshPayments } = usePayments();
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [payingFor, setPayingFor] = useState<Client | null>(null);

  async function handleDelete(client: Client) {
    if (!confirm("Delete this client?")) return;
    await customerService.remove(client._id);
    refresh();
  }

  return (
    <>
      <Header
        title="Clients"
        actions={<button className="btn bp sm" onClick={() => setEditing(null)}>+ New Client</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={4} rows={7} />
        ) : (
          <CustomerTable
            clients={customers}
            invoices={invoices}
            payments={payments}
            onLedger={(c) => router.push(`/ledger/${c._id}`)}
            onAddPayment={setPayingFor}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        )}
      </div>

      {editing !== undefined && (
        <CustomerModal
          client={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refresh();
          }}
        />
      )}

      {payingFor && (
        <PaymentModal
          presetClientId={payingFor._id}
          onClose={() => setPayingFor(null)}
          onSaved={() => {
            setPayingFor(null);
            refreshInvoices();
            refreshPayments();
          }}
        />
      )}
    </>
  );
}
