import type { Invoice } from "@/lib/types";

export function StatusBadge({ status }: { status: Invoice["status"] }) {
  if (status === "Paid") return <span className="bd bpd">Paid</span>;
  if (status === "Partial") return <span className="bd bok">Partial</span>;
  return <span className="bd bun">Unpaid</span>;
}
