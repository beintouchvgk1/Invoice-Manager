import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import { requireSuperAdmin } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";
import { isNonEmptyString } from "@/lib/validators";

export async function GET(req: NextRequest) {
  if (!(await requireSuperAdmin(req))) return fail("Unauthorized", 401);
  await connectDB();
  const roles = await Role.find().sort({ name: 1 }).lean();
  return ok(roles);
}

export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin(req))) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body || !isNonEmptyString(body.name)) return fail("Role name is required", 400);

  await connectDB();
  const name = body.name.trim();
  const existing = await Role.findOne({ name });
  if (existing) return fail("A role with this name already exists", 409);

  const role = await Role.create({
    name,
    description: isNonEmptyString(body.description) ? body.description.trim() : "",
    isActive: true,
  });
  return ok(role, 201);
}
