import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { buildBackupPayload } from "@/lib/backupData";
import { isDriveConfigured, uploadBackupToDrive } from "@/lib/googleDrive";
import { isBackupDay, monthlyBackupTarget } from "@/lib/backup";
import { requireSuperAdmin } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";

// Exporting the whole database and pushing it to Drive takes longer than the
// default serverless limit on a busy month.
export const maxDuration = 60;
// Must never be prerendered or cached — it performs a side effect.
export const dynamic = "force-dynamic";

// Scheduled monthly backup → Google Drive.
//
//   invoice-data-backup/
//     2026/
//       Jan.json, Feb.json, ...
//     2025/
//       ...
//
// vercel.json fires this at 02:00 UTC on the 1st (07:30 IST); it archives the
// month that just ENDED — see lib/backup.ts for why that beats running on the
// last day. The day check is still enforced here so a stray/manual GET can't
// overwrite a month's archive with a partial snapshot.
//
// Access: either Vercel Cron's `Authorization: Bearer $CRON_SECRET`, or a
// signed-in super admin (for a manual run / verifying setup). It exports every
// collection including bcrypt password hashes, so it is never open.
async function runBackup(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const isCron = Boolean(env.cronSecret) && authHeader === `Bearer ${env.cronSecret}`;
  const isAdmin = !isCron && Boolean(await requireSuperAdmin(req));
  if (!isCron && !isAdmin) return fail("Unauthorized", 401);

  // A manual run shouldn't have to wait for month-end to prove the setup works;
  // the scheduled caller never sends this.
  const force = req.nextUrl.searchParams.get("force") === "1" && isAdmin;

  const now = new Date();
  if (!force && !isBackupDay(now)) {
    return ok({ skipped: true, reason: "Backups run on the 1st of each month — nothing to do today." });
  }

  if (!isDriveConfigured()) {
    return fail("Google Drive backup is not configured (missing GOOGLE_DRIVE_* environment variables).", 503);
  }
  if (!env.backupMongodbUri) {
    return fail("No production database URI configured for backup (set MONGODB_URI_PRODUCTION).", 503);
  }

  const { year, fileName } = monthlyBackupTarget(now);
  try {
    const payload = await buildBackupPayload(env.backupMongodbUri);
    const content = JSON.stringify(payload, null, 2);
    const result = await uploadBackupToDrive({ year, fileName, content });

    return ok({
      uploaded: true,
      path: result.folderPath,
      replacedExisting: result.replaced,
      sizeBytes: content.length,
      counts: Object.fromEntries(
        Object.entries(payload.collections).map(([name, rows]) => [name, rows.length])
      ),
    });
  } catch (err) {
    // Logged so a failed run is visible in the platform logs, not just in the
    // response nobody reads when a cron fires unattended.
    console.error("Monthly Drive backup failed:", err);
    return fail(err instanceof Error ? err.message : "Backup failed", 500);
  }
}

// Vercel Cron issues GET; POST is allowed so the same job can be kicked off
// manually from an admin tool or curl without a different code path.
export async function GET(req: NextRequest) {
  return runBackup(req);
}

export async function POST(req: NextRequest) {
  return runBackup(req);
}
