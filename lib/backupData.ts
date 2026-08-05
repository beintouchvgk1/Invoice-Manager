import mongoose from "mongoose";
import { ClientSchema } from "@/models/Client";
import { GroupSchema } from "@/models/Group";
import { InvoiceSchema } from "@/models/Invoice";
import { PaymentSchema } from "@/models/Payment";
import { RoleSchema } from "@/models/Role";
import { UserSchema } from "@/models/User";
import { SettingsSchema } from "@/models/Settings";
import type { DatabaseBackupPayload } from "@/lib/types";

// Exports every collection from ONE EXPLICIT database, on its own short-lived
// connection.
//
// Why not just reuse connectDB() + the compiled models like app/api/backup's
// download route does: those are bound to whichever database APP_ENV selected
// for this deployment. The scheduled backup must archive production data even
// if the cron happens to fire from a preview/staging deployment, so it opens a
// separate connection to the URI it's told to and registers the same schemas on
// it. Nothing here touches the app's cached default connection.
export async function buildBackupPayload(uri: string): Promise<DatabaseBackupPayload> {
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const Client = conn.model("Client", ClientSchema);
    const Group = conn.model("Group", GroupSchema);
    const Invoice = conn.model("Invoice", InvoiceSchema);
    const Payment = conn.model("Payment", PaymentSchema);
    const Role = conn.model("Role", RoleSchema);
    const User = conn.model("User", UserSchema);
    const Settings = conn.model("Settings", SettingsSchema);

    const [clients, groups, invoices, payments, roles, users, settings] = await Promise.all([
      Client.find().lean(),
      Group.find().lean(),
      Invoice.find().lean(),
      Payment.find().lean(),
      Role.find().lean(),
      User.find().lean(),
      Settings.find().lean(),
    ]);

    return {
      meta: { exportedAt: new Date().toISOString(), app: "vgk-invoice-manager", version: 1 },
      collections: { clients, groups, invoices, payments, roles, users, settings },
    } as DatabaseBackupPayload;
  } finally {
    // Serverless invocations are short-lived; leaving this open would leak a
    // connection per run against the Atlas connection limit.
    await conn.close().catch(() => {});
  }
}
