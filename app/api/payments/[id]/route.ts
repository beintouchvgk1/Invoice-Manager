import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { recalcInvoice } from "@/lib/recalcInvoice";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail, conflict } from "@/lib/response";
import { isObjectId, isPositiveNumber, isValidDateStr } from "@/lib/validators";
import { updatedAtMismatch } from "@/lib/conflictCheck";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "payments.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid payment id", 400);
  const body = await req.json().catch(() => null);
  if (!body || !isObjectId(body.clientId)) return fail("Client is required", 400);
  if (!isValidDateStr(body.date)) return fail("Date is required", 400);
  if (!isPositiveNumber(body.amount)) return fail("Amount is required", 400);
  if (body.invoiceId && !isObjectId(body.invoiceId)) return fail("Invalid invoice reference", 400);

  await connectDB();
  const payment = await Payment.findById(id);
  if (!payment) return fail("Payment not found", 404);
  if (updatedAtMismatch(payment, body.baseUpdatedAt)) {
    return conflict("This payment was changed elsewhere since you last saw it.", payment.toJSON());
  }

  const oldInvoiceId = payment.invoiceId;
  payment.clientId = body.clientId;
  payment.invoiceId = body.invoiceId || null;
  payment.date = body.date;
  payment.amount = body.amount;
  payment.mode = body.mode === "Bank" ? "Bank" : "Cash";
  payment.reference = body.reference?.trim() || "";
  payment.notes = body.notes?.trim() || "";
  await payment.save();

  if (oldInvoiceId && String(oldInvoiceId) !== String(payment.invoiceId)) await recalcInvoice(oldInvoiceId);
  if (payment.invoiceId) await recalcInvoice(payment.invoiceId);

  return ok(payment);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "payments.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid payment id", 400);
  const body = await req.json().catch(() => null);

  await connectDB();
  const payment = await Payment.findById(id);
  if (!payment) return fail("Payment not found", 404);
  if (updatedAtMismatch(payment, body?.baseUpdatedAt)) {
    return conflict("This payment was changed elsewhere since you last saw it.", payment.toJSON());
  }
  const invoiceId = payment.invoiceId;
  await payment.deleteOne();
  if (invoiceId) await recalcInvoice(invoiceId);

  return ok({ deleted: true });
}
