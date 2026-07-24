import type { InvoiceLike } from "@/lib/types";

export function fI(n: number | string | undefined): string {
  return parseFloat(String(n || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fD(d?: string): string {
  if (!d) return "";
  const p = d.split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function td(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ost(inv: InvoiceLike): number {
  return Math.max(0, parseFloat(String(inv.total || 0)) - parseFloat(String(inv.paidAmount || 0)));
}

export function ageD(d?: string): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((new Date(td()).getTime() - new Date(d).getTime()) / 86400000));
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function w3(n: number): string {
  if (!n) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + w3(n % 100) : "");
}

export function nW(amount: number | string): string {
  let n = Math.round(parseFloat(String(amount)) || 0);
  if (!n) return "Zero Rupees Only";
  const parts: string[] = [];
  ([[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [1, ""]] as [number, string][]).forEach(
    ([div, label]) => {
      const c = Math.floor(n / div);
      n = n % div;
      if (c) parts.push((w3(c) + " " + label).trim());
    }
  );
  return parts.join(" ") + " Rupees Only";
}
