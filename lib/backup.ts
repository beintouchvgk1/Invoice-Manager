function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

// The firm is in Surat, so "the last date of the month" has to mean the last
// date in India, not in UTC. Vercel runs cron in UTC, and 18:00 UTC is already
// 23:30 next-day-boundary-adjacent in IST — evaluating the date in UTC would
// pick the wrong day around month ends.
const BACKUP_TIME_ZONE = "Asia/Kolkata";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Calendar parts of `date` as seen in India.
export function backupDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BACKUP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// The job runs on the 1st and archives the month that just ENDED, rather than
// on the last day archiving the month still in progress. Two reasons:
//
//   1. Cron can't express "last day of month" — Vercel's day-of-month field
//      only accepts 1-31, with no `L`. Approximating it with `28-31` + a
//      runtime check meant up to 4 firings a month to do one unit of work.
//   2. More importantly it was fragile: Hobby-plan cron has ±59min of drift,
//      so a 23:30 IST run on the 31st could land after midnight, fail the
//      "is it the last day?" test, and silently skip that month entirely.
//
// Running on the 1st is immune to that drift (the whole day is valid) and the
// archived month is genuinely complete — the old approach always missed the
// final hours of the month it was naming.
export function isBackupDay(date: Date): boolean {
  return backupDateParts(date).day === 1;
}

// The month that just ended, relative to `date`. On 1 Jan this correctly rolls
// back to December of the previous year.
export function monthlyBackupTarget(date: Date): { year: string; fileName: string } {
  const { year, month } = backupDateParts(date);
  const targetMonth = month === 1 ? 12 : month - 1;
  const targetYear = month === 1 ? year - 1 : year;
  return { year: String(targetYear), fileName: `${MONTH_NAMES[targetMonth - 1]}.json` };
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
