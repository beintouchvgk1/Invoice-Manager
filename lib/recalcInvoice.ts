import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { Types } from "mongoose";

export async function recalcInvoice(invoiceId: string | Types.ObjectId | null | undefined) {
  if (!invoiceId) return;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  const payments = await Payment.find({ invoiceId: invoice._id });
  const paidAmount = payments.reduce((s, p) => s + parseFloat(String(p.amount || 0)), 0);

  invoice.paidAmount = paidAmount;
  invoice.status = paidAmount >= invoice.total ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid";
  await invoice.save();
}
