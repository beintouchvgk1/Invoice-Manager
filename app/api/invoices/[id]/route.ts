import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail, conflict } from "@/lib/response";
import { isObjectId, isValidDateStr, validateInvoiceItems } from "@/lib/validators";
import { updatedAtMismatch } from "@/lib/conflictCheck";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "invoices.view"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid invoice id", 400);
  await connectDB();
  const invoice = await Invoice.findById(id).lean();
  if (!invoice) return fail("Invoice not found", 404);
  return ok(invoice);
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "invoices.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid invoice id", 400);
  const body = await req.json().catch(() => null);
  if (!body || !isObjectId(body.clientId)) return fail("Client is required", 400);
  if (!isValidDateStr(body.date)) return fail("Invoice date is required", 400);
  if (!validateInvoiceItems(body.items)) return fail("Add at least one valid service item", 400);

  await connectDB();
  const existing = await Invoice.findById(id);
  if (!existing) return fail("Invoice not found", 404);
  if (updatedAtMismatch(existing, body.baseUpdatedAt)) {
    return conflict("This invoice was changed elsewhere since you last saw it.", existing.toJSON());
  }

  const items = body.items
    .map((i: { category?: string; description?: string; detail?: string; amount: number }) => ({
      category: i.category || "",
      description: (i.description || "").trim(),
      detail: (i.detail || "").trim(),
      amount: parseFloat(String(i.amount || 0)),
    }))
    .filter((i: { description: string; amount: number }) => i.description || i.amount > 0);
  if (!items.length) return fail("Add at least one valid service item", 400);

  const total = items.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
  const paymentType = body.paymentType === "cash" ? "cash" : "credit";

  existing.date = body.date;
  existing.clientId = body.clientId;
  existing.items = items;
  existing.notes = body.notes?.trim() || "";
  existing.total = total;
  existing.paymentType = paymentType;

  // Preserve original behavior: switching an existing invoice to credit keeps
  // its current paidAmount/status; leaving/setting it to cash resets paidAmount=total, status=Paid.
  if (paymentType === "credit") {
    // keep existing.paidAmount / existing.status as-is
  } else {
    existing.paidAmount = total;
    existing.status = "Paid";
  }

  await existing.save();
  return ok(existing);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "invoices.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid invoice id", 400);
  const body = await req.json().catch(() => null);

  await connectDB();
  const invoice = await Invoice.findById(id);
  if (!invoice) return fail("Invoice not found", 404);
  if (updatedAtMismatch(invoice, body?.baseUpdatedAt)) {
    return conflict("This invoice was changed elsewhere since you last saw it.", invoice.toJSON());
  }

  // Preserve payments already recorded against this invoice as client advances,
  // matching the original app's delete behavior.
  await Payment.updateMany({ invoiceId: invoice._id }, { $set: { clientId: invoice.clientId, invoiceId: null } });
  await invoice.deleteOne();

  return ok({ deleted: true });
}
