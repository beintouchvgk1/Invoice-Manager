// Not routed through services/http.ts — that wrapper assumes a {success,data}
// JSON envelope, but a successful response here is the backup file itself
// (streamed as application/json with a Content-Disposition filename), not an
// API envelope. Only the failure path is JSON-enveloped (see lib/response.ts's
// fail()), so it's parsed directly below instead.
export const backupService = {
  async download(): Promise<void> {
    const res = await fetch("/api/backup");
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Backup failed (${res.status})`);
    }

    const disposition = res.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "invoice_manager_db_backup.json";

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
