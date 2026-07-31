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

  // Idempotent replay guard for offline sync — if this exact queued create
  // already landed (e.g. the response was lost and the client retried), return
  // the existing record instead of creating a duplicate.
  if (isNonEmptyString(body.clientOpId)) {
    const existing = await Client.findOne({ clientOpId: body.clientOpId });
    if (existing) return ok(existing, 200);
  }

  try {
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
      clientOpId: isNonEmptyString(body.clientOpId) ? body.clientOpId : undefined,
    });
    return ok(client, 201);
  } catch (err) {
    // A racing replay of the exact same queued op (e.g. two tabs syncing at once)
    // can hit the clientOpId unique index a beat after our own findOne check —
    // whoever loses the race just returns the winner's doc instead of erroring.
    if (isNonEmptyString(body.clientOpId) && err && typeof err === "object" && "code" in err && err.code === 11000) {
      const winner = await Client.findOne({ clientOpId: body.clientOpId });
      if (winner) return ok(winner, 200);
    }
    throw err;
  }
}
