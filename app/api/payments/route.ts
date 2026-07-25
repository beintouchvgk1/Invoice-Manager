import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Settings from "@/models/Settings";
import { recalcInvoice } from "@/lib/recalcInvoice";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isObjectId, isPositiveNumber, isValidDateStr } from "@/lib/validators";
import { formatReceiptNo } from "@/lib/invoiceNumber";

export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "payments.view"))) return fail("Unauthorized", 401);
  await connectDB();
  const payments = await Payment.find().sort({ date: -1, createdAt: -1 }).lean();
  return ok(payments);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "payments.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isObjectId(body.clientId)) return fail("Client is required", 400);
  if (!isValidDateStr(body.date)) return fail("Date is required", 400);
  if (!isPositiveNumber(body.amount)) return fail("Amount is required", 400);
  if (body.invoiceId && !isObjectId(body.invoiceId)) return fail("Invalid invoice reference", 400);

  await connectDB();

  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    // Atomic claim: avoids two concurrent requests computing the same receipt number.
    const claimed = await Settings.findOneAndUpdate(
      { _id: settings._id },
      { $inc: { "invoiceNumbering.nextReceiptCounter": 1 } },
      { new: false }
    );
    if (!claimed) return fail("Settings not found", 500);
    const receiptNumber = formatReceiptNo(claimed.invoiceNumbering.nextReceiptCounter || 1);

    const payment = await Payment.create({
      clientId: body.clientId,
      invoiceId: body.invoiceId || null,
      receiptNumber,
      date: body.date,
      amount: body.amount,
      mode: body.mode === "Bank" ? "Bank" : "Cash",
      reference: body.reference?.trim() || "",
      notes: body.notes?.trim() || "",
    });

    if (payment.invoiceId) await recalcInvoice(payment.invoiceId);

    return ok(payment, 201);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("That receipt number was just taken by another request. Please try saving again.", 409);
    }
    console.error("POST /api/payments failed:", err);
    return fail(err instanceof Error ? err.message : "Failed to create payment", 500);
  }
}
