import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Client from "@/models/Client";
import { requireAuth } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";
import type { RouteParams } from "@/lib/types";

// `id` here is the URL-encoded current group name (groups are keyed by name, not ObjectId,
// since a group can exist implicitly just by being referenced on a client record).
type Params = RouteParams;

export async function PUT(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return fail("Unauthorized", 401);
  const { id } = await params;
  const oldName = decodeURIComponent(id);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Group name is required", 400);
  const newName = body.name.trim();

  await connectDB();
  await Group.findOneAndUpdate({ name: oldName }, { name: newName }, { upsert: true });
  if (newName !== oldName) {
    await Client.updateMany({ groupName: oldName }, { groupName: newName });
  }
  return ok({ name: newName });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return fail("Unauthorized", 401);
  const { id } = await params;
  const name = decodeURIComponent(id);

  await connectDB();
  await Group.deleteOne({ name });
  await Client.updateMany({ groupName: name }, { groupName: "" });
  return ok({ deleted: true });
}
