import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Settings from "@/models/Settings";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isObjectId, isValidDateStr, validateInvoiceItems } from "@/lib/validators";
import { formatInvoiceNo, formatReceiptNo } from "@/lib/invoiceNumber";

export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "invoices.view"))) return fail("Unauthorized", 401);
  await connectDB();
  const clientId = req.nextUrl.searchParams.get("clientId");
  const filter = clientId && isObjectId(clientId) ? { clientId } : {};
  const invoices = await Invoice.find(filter).sort({ createdAt: 1 }).lean();
  return ok(invoices);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "invoices.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isObjectId(body.clientId)) return fail("Client is required", 400);
  if (!isValidDateStr(body.date)) return fail("Invoice date is required", 400);
  if (!validateInvoiceItems(body.items)) return fail("Add at least one valid service item", 400);

  await connectDB();
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
  const paidAmount = paymentType === "cash" ? total : 0;
  const status = paymentType === "cash" ? "Paid" : "Unpaid";

  try {
    // Ensure a settings doc exists, then atomically claim the next invoice counter
    // so two concurrent requests can never compute the same invoice number.
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    const claimed = await Settings.findOneAndUpdate(
      { _id: settings._id },
      { $inc: { "invoiceNumbering.nextInvoiceCounter": 1 } },
      { new: false }
    );
    if (!claimed) return fail("Settings not found", 500);

    const invoiceNumber = formatInvoiceNo(
      claimed.invoiceNumbering.prefix,
      claimed.invoiceNumbering.financialYear,
      claimed.invoiceNumbering.nextInvoiceCounter
    );

    const invoice = await Invoice.create({
      invoiceNumber,
      date: body.date,
      clientId: body.clientId,
      items,
      notes: body.notes?.trim() || "",
      total,
      paidAmount,
      status,
      paymentType,
    });

    if (paymentType === "cash") {
      const claimedReceipt = await Settings.findOneAndUpdate(
        { _id: settings._id },
        { $inc: { "invoiceNumbering.nextReceiptCounter": 1 } },
        { new: false }
      );
      const receiptNumber = formatReceiptNo(claimedReceipt?.invoiceNumbering.nextReceiptCounter || 1);
      await Payment.create({
        clientId: body.clientId,
        invoiceId: invoice._id,
        receiptNumber,
        date: body.date,
        amount: total,
        mode: "Cash",
        reference: "",
        notes: "Auto-recorded (cash invoice)",
      });
    }

    return ok(invoice, 201);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return fail("That invoice number was just taken by another request. Please try saving again.", 409);
    }
    console.error("POST /api/invoices failed:", err);
    return fail(err instanceof Error ? err.message : "Failed to create invoice", 500);
  }
}
