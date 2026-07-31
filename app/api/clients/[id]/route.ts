import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail, conflict } from "@/lib/response";
import { isNonEmptyString, isObjectId, isValidPhone } from "@/lib/validators";
import { updatedAtMismatch } from "@/lib/conflictCheck";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "customers.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid client id", 400);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Client name is required", 400);
  if (body.mobile?.trim() && !isValidPhone(body.mobile)) return fail("Enter a valid mobile number", 400);

  await connectDB();
  const client = await Client.findById(id);
  if (!client) return fail("Client not found", 404);
  if (updatedAtMismatch(client, body.baseUpdatedAt)) {
    return conflict("This client was changed elsewhere since you last saw it.", client.toJSON());
  }

  client.name = body.name.trim();
  client.groupName = body.groupName?.trim() || "";
  client.addressLine1 = body.addressLine1?.trim() || "";
  client.addressLine2 = body.addressLine2?.trim() || "";
  client.addressLine3 = body.addressLine3?.trim() || "";
  client.city = body.city?.trim() || "";
  client.state = body.state?.trim() || "";
  client.pincode = body.pincode?.trim() || "";
  client.mobile = body.mobile?.trim() || "";
  await client.save();
  return ok(client);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "customers.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid client id", 400);
  const body = await req.json().catch(() => null);

  await connectDB();
  const client = await Client.findById(id);
  if (!client) return fail("Client not found", 404);
  if (updatedAtMismatch(client, body?.baseUpdatedAt)) {
    return conflict("This client was changed elsewhere since you last saw it.", client.toJSON());
  }

  // Bg_06: deleting a client that still has invoices/payments used to succeed
  // silently, leaving those records pointing at a client that no longer
  // exists (rendered as "Unknown" everywhere). Block it instead — the client
  // must be reassigned/cleared of its history first.
  const [invoiceCount, paymentCount] = await Promise.all([
    Invoice.countDocuments({ clientId: id }),
    Payment.countDocuments({ clientId: id }),
  ]);
  if (invoiceCount > 0 || paymentCount > 0) {
    return fail(
      "This client has invoices or payments recorded against them and cannot be deleted. Remove or reassign those first.",
      409
    );
  }

  await client.deleteOne();
  return ok({ deleted: true });
}
