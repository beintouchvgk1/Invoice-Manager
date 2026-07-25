import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString, isObjectId } from "@/lib/validators";
import type { RouteParams } from "@/lib/types";

type Params = RouteParams;

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "customers.edit"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid client id", 400);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Client name is required", 400);

  await connectDB();
  const client = await Client.findByIdAndUpdate(
    id,
    {
      name: body.name.trim(),
      groupName: body.groupName?.trim() || "",
      addressLine1: body.addressLine1?.trim() || "",
      addressLine2: body.addressLine2?.trim() || "",
      addressLine3: body.addressLine3?.trim() || "",
      city: body.city?.trim() || "",
      state: body.state?.trim() || "",
      pincode: body.pincode?.trim() || "",
      mobile: body.mobile?.trim() || "",
    },
    { new: true }
  );
  if (!client) return fail("Client not found", 404);
  return ok(client);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await requirePermission(req, "customers.delete"))) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!isObjectId(id)) return fail("Invalid client id", 400);

  await connectDB();
  const client = await Client.findByIdAndDelete(id);
  if (!client) return fail("Client not found", 404);
  return ok({ deleted: true });
}
