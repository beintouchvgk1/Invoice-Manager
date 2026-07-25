import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/Client";
import Group from "@/models/Group";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import Role from "@/models/Role";
import User from "@/models/User";
import Settings from "@/models/Settings";
import { requirePermission } from "@/lib/requireAuth";
import { fail } from "@/lib/response";
import { buildBackupFilename } from "@/lib/backup";
import type { DatabaseBackupPayload } from "@/lib/types";

// A full, in-process JSON export of every collection — see lib/types.ts's
// DatabaseBackupPayload for why this isn't a mongodump/BSON archive. Includes
// User.password (bcrypt hashes) since a backup that can't restore working logins
// isn't a real backup — the downloaded file should be treated as sensitive and
// stored securely, same as any other database credential.
export async function GET(req: NextRequest) {
  if (!(await requirePermission(req, "backup.export"))) return fail("Unauthorized", 401);

  await connectDB();
  const [clients, groups, invoices, payments, roles, users, settings] = await Promise.all([
    Client.find().lean(),
    Group.find().lean(),
    Invoice.find().lean(),
    Payment.find().lean(),
    Role.find().lean(),
    User.find().lean(),
    Settings.find().lean(),
  ]);

  const now = new Date();
  const payload: DatabaseBackupPayload = {
    meta: { exportedAt: now.toISOString(), app: "vgk-invoice-manager", version: 1 },
    collections: { clients, groups, invoices, payments, roles, users, settings },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${buildBackupFilename(now)}"`,
      "Cache-Control": "no-store",
    },
  });
}
