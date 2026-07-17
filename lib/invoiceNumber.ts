function pad(n: number): string {
  return n < 10 ? "00" + n : n < 100 ? "0" + n : "" + n;
}

export function formatInvoiceNo(prefix: string, fy: string, counter: number): string {
  return `${prefix}/${fy}/${pad(counter)}`;
}

export function formatReceiptNo(counter: number): string {
  return `REC/${pad(counter)}`;
}
