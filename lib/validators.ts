export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// Digits with an optional single leading "+" — no spaces/dashes/letters. Phone is
// always an optional field, so an empty string is a separate "not provided" case
// callers should check for themselves rather than treating as valid/invalid here.
export function isValidPhone(v: unknown): v is string {
  return typeof v === "string" && /^\+?\d+$/.test(v.trim());
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

// Bg_02: a service line with an amount but no category used to be accepted
// (category was optional) — every line that counts as "entered" must now name
// a category, matching the client-side check in InvoiceForm.tsx's save().
export function validateInvoiceItems(
  items: unknown
): items is { category?: string; description?: string; detail?: string; amount: number }[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((i) => {
      if (!i || typeof i !== "object") return false;
      const row = i as { category?: unknown; description?: unknown; amount?: unknown };
      if (typeof row.amount !== "number") return false;
      const isEntered = (typeof row.description === "string" && row.description.trim()) || row.amount > 0;
      if (!isEntered) return true; // a genuinely blank row is filtered out by the caller, not a validation failure
      return isNonEmptyString(row.category);
    })
  );
}
