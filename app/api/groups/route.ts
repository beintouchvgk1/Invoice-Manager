import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Client from "@/models/Client";
import Invoice from "@/models/Invoice";
import { requirePermission } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";
import { ost } from "@/lib/calc";

export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "groups.view"))) return fail("Unauthorized", 401);
  await connectDB();

  const [groupDocs, clients] = await Promise.all([Group.find().lean(), Client.find().lean()]);
  const names = new Set<string>(groupDocs.map((g) => g.name));
  clients.forEach((c) => {
    if (c.groupName) names.add(c.groupName);
  });

  const invoices = await Invoice.find({ clientId: { $in: clients.map((c) => c._id) } }).lean();
  const outByClient = new Map<string, number>();
  invoices.forEach((inv) => {
    const key = String(inv.clientId);
    outByClient.set(key, (outByClient.get(key) || 0) + ost({ total: inv.total, paidAmount: inv.paidAmount }));
  });

  const groups = Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const members = clients.filter((c) => c.groupName === name);
      const outstanding = members.reduce((s, c) => s + (outByClient.get(String(c._id)) || 0), 0);
      return { name, members, memberCount: members.length, outstanding };
    });

  return ok(groups);
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission(req, "groups.create"))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Group name is required", 400);

  await connectDB();
  const name = body.name.trim();
  const existing = await Group.findOne({ name });
  if (existing) return fail("Group already exists", 409);

  const group = await Group.create({ name });
  return ok(group, 201);
}
