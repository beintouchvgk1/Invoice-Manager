export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isValidDateStr(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function isPositiveNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v) && v > 0;
}

export function isObjectId(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
}

export function validateInvoiceItems(
  items: unknown
): items is { category?: string; description?: string; detail?: string; amount: number }[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (i) =>
        i &&
        typeof i === "object" &&
        typeof (i as { amount?: unknown }).amount === "number"
    )
  );
}
