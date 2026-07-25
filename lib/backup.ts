function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

// "invoice_manager_db_backup_25-07-2026-143022.json" — DD-MM-YYYY (matches the
// firm's own date convention, see lib/calc.ts's fD()) plus an HHMMSS timestamp so
// two backups taken the same day never collide.
export function buildBackupFilename(date: Date): string {
  const d = pad(date.getUTCDate());
  const m = pad(date.getUTCMonth() + 1);
  const y = date.getUTCFullYear();
  const time = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(pad).join("");
  return `invoice_manager_db_backup_${d}-${m}-${y}-${time}.json`;
}
