import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { Types } from "mongoose";

// Bg_23: a payment recorded without an invoice ("advance") was only ever
// reflected in the client's ledger — the invoices themselves stayed Unpaid,
// because recalcInvoice() only ever sums payments explicitly linked to that
// invoice. So a client who paid Rs. 10,000 up front still showed every new
// invoice as fully outstanding.
//
// This recomputes every credit invoice for one client from scratch: its own
// directly-linked payments first, then whatever unallocated advance credit is
// left over, applied oldest-invoice-first (the order the QA report asked for —
// fill B1 completely, spill the remainder into B2, and so on).
//
// Deliberately NOT folded into recalcInvoice(): that helper is called from
// three payment routes with a single invoice id and no client context, and
// rewriting it would change behavior for every one of those callers. This runs
// after it instead, and simply recomputes the same field more completely.
export async function reallocateClientAdvances(clientId: string | Types.ObjectId | null | undefined) {
  if (!clientId) return;

  const [invoices, payments] = await Promise.all([
    // FIFO by invoice date, then by creation order for same-day invoices so the
    // result is deterministic rather than dependent on Mongo's natural order.
    Invoice.find({ clientId }).sort({ date: 1, createdAt: 1 }),
    Payment.find({ clientId }),
  ]);
  if (!invoices.length) return;

  const directByInvoice = new Map<string, number>();
  let advancePool = 0;
  for (const p of payments) {
    const amount = parseFloat(String(p.amount || 0));
    if (p.invoiceId) {
      const key = String(p.invoiceId);
      directByInvoice.set(key, (directByInvoice.get(key) || 0) + amount);
    } else {
      advancePool += amount;
    }
  }

  for (const invoice of invoices) {
    // A cash invoice is settled at creation (app/api/invoices/route.ts sets
    // paidAmount = total, status = Paid, with no Payment row behind it).
    // Recomputing it from payment rows would wrongly reset it to Unpaid, and
    // it has nothing outstanding for an advance to cover anyway.
    if (invoice.paymentType === "cash") continue;

    const total = parseFloat(String(invoice.total || 0));
    const direct = directByInvoice.get(String(invoice._id)) || 0;

    let applied = direct;
    const remaining = total - direct;
    if (remaining > 0 && advancePool > 0) {
      const take = Math.min(remaining, advancePool);
      applied += take;
      advancePool -= take;
    }

    const status = applied >= total && total > 0 ? "Paid" : applied > 0 ? "Partial" : "Unpaid";
    // Only write when something actually changed — avoids bumping updatedAt on
    // every invoice of the client, which would otherwise make the offline
    // sync's conflict precondition (baseUpdatedAt) fire spuriously.
    if (invoice.paidAmount !== applied || invoice.status !== status) {
      invoice.paidAmount = applied;
      invoice.status = status;
      await invoice.save();
    }
  }
}
