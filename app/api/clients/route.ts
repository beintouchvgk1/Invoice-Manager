import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";

export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "customers.view"))) return fail("Unauthorized", 401);
  await connectDB();
  const group = req.nextUrl.searchParams.get("group");
  const filter = group ? { groupName: group } : {};
  const clients = await Client.find(filter).sort({ name: 1 }).lean();
  return ok(clients);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "customers.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Client name is required", 400);

  await connectDB();
  const client = await Client.create({
    name: body.name.trim(),
    groupName: body.groupName?.trim() || "",
    addressLine1: body.addressLine1?.trim() || "",
    addressLine2: body.addressLine2?.trim() || "",
    addressLine3: body.addressLine3?.trim() || "",
    city: body.city?.trim() || "",
    state: body.state?.trim() || "",
    pincode: body.pincode?.trim() || "",
    mobile: body.mobile?.trim() || "",
  });
  return ok(client, 201);
}
