"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { CustomerTable } from "@/components/Client/CustomerTable";
import { CustomerModal } from "@/components/Client/CustomerModal";
import { PaymentModal } from "@/components/Payment/PaymentModal";
import { ConfirmModal } from "@/components/Common/ConfirmModal";
import { Pagination } from "@/components/Common/Pagination";
import { useCustomers } from "@/hooks/useCustomers";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/useToast";
import { useListControls } from "@/hooks/useListControls";
import { customerService } from "@/services/customer.service";
import { offlineDelete } from "@/lib/offline/mutate";
import type { Client } from "@/lib/types";

export default function CustomersPage() {
  const router = useRouter();
  const { customers, loading, refresh } = useCustomers();
  const { invoices, refresh: refreshInvoices } = useInvoices();
  const { payments, refresh: refreshPayments } = usePayments();
  const { can } = useCurrentUser();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Client | null | undefined>(undefined);
  const [payingFor, setPayingFor] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [groupFilter, setGroupFilter] = useState("");

  const groupOptions = useMemo(
    () => Array.from(new Set(customers.map((c) => c.groupName).filter(Boolean))).sort(),
    [customers]
  );
  const groupFiltered = useMemo(
    () => (groupFilter ? customers.filter((c) => c.groupName === groupFilter) : customers),
    [customers, groupFilter]
  );
  const searchText = (c: Client) => [c.name, c.mobile, c.addressLine1, c.addressLine2, c.city, c.groupName].filter(Boolean).join(" ");
  const { search, setSearch, page, setPage, limit, setLimit, paged, total, totalPages } = useListControls(groupFiltered, searchText);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await offlineDelete("clients", customerService, deleteTarget._id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Header
        title="Clients"
        actions={can("customers.create") && <button className="btn bp sm" onClick={() => setEditing(null)}>+ New Client</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={4} rows={7} />
        ) : (
          <>
            <div className="list-toolbar">
              <input
                className="list-search"
                placeholder="Search by name, mobile, address, group..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="list-filter" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                <option value="">All Groups</option>
                {groupOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <CustomerTable
              clients={paged}
              invoices={invoices}
              payments={payments}
              onLedger={(c) => router.push(`/ledger/${c._id}`)}
              onAddPayment={setPayingFor}
              onEdit={setEditing}
              onDelete={setDeleteTarget}
              canEdit={can("customers.edit")}
              canDelete={can("customers.delete")}
            />
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
          </>
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

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
