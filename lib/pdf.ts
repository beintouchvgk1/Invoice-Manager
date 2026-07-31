import { jsPDF } from "jspdf";
import { fI, fD, nW } from "./calc";
import type { Client, Invoice, Payment, Settings } from "./types";

function getLogoEl(): HTMLImageElement | null {
  return document.getElementById("logo") as HTMLImageElement | null;
}

// Stamps "Page X of Y" bottom-right of every page — only when the document
// actually spans more than one, so a normal single-page invoice/receipt/ledger
// looks exactly as it did before this was added.
function stampPageNumbers(doc: jsPDF, right: number) {
  const totalPages = doc.getNumberOfPages();
  if (totalPages < 2) return;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${totalPages}`, right, 293, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

export function genInvoicePDF(inv: Invoice, cl: Client | undefined, settings: Settings) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const client = cl || ({ name: "Unknown" } as Client);
  const firm = settings.firmDetails;
  const bank = settings.bankAccount;
  const ML = 15, PW = 180, CX = 105;
  let y = 10;

  // Bg_11: with more than ~4 categories the fixed-height page used to run out of
  // room and silently clip the signature/bank-details block. Push whatever doesn't
  // fit onto a new page instead of overflowing it.
  const PAGE_BOTTOM = 270;
  const ensureSpace = (need: number) => {
    if (y + need > PAGE_BOTTOM) {
      doc.addPage();
      y = 15;
    }
  };

  try {
    const lg = getLogoEl();
    if (lg) doc.addImage(lg, "PNG", CX - 11, y, 22, 22, "", "FAST");
  } catch {
    /* logo optional */
  }
  y += 26;
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(firm.name || "V G K & CO", CX, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Chartered Accountant", CX, y, { align: "center" });
  y += 7;
  doc.setFontSize(8.5);
  (firm.address || "").split("\n").filter((l) => l.trim()).forEach((l) => {
    doc.text(l.trim(), CX, y, { align: "center" });
    y += 4.5;
  });
  if (firm.city) { doc.text(firm.city + (firm.pincode ? " - " + firm.pincode : ""), CX, y, { align: "center" }); y += 4.5; }
  if (firm.mobile) { doc.text("Mobile no. : " + firm.mobile, CX, y, { align: "center" }); y += 4.5; }
  if (firm.email) { doc.text("Email : " + firm.email, CX, y, { align: "center" }); y += 4.5; }

  y += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.line(ML, y, ML + PW, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("INVOICE DATE :  " + fD(inv.date), ML, y);
  doc.text("INVOICE NO. :  " + inv.invoiceNumber, ML + PW, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TO,", ML, y);
  y += 5;
  doc.setFontSize(10);
  doc.text(client.name || "", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (client.addressLine1) { doc.text(client.addressLine1, ML, y); y += 5; }
  if (client.addressLine2) { doc.text(client.addressLine2, ML, y); y += 5; }
  if (client.addressLine3) { doc.text(client.addressLine3, ML, y); y += 5; }
  const ln4 = [client.city, client.state].filter(Boolean).join(", ") + (client.pincode ? " - " + client.pincode : "");
  if (ln4 && ln4 !== " - ") { doc.text(ln4, ML, y); y += 5; }
  if (client.mobile) { doc.text("Mob : " + client.mobile, ML, y); y += 5; }
  y += 4;

  const CSR = 12, CAMT = 32, CDSC = PW - CSR - CAMT;
  doc.setLineWidth(0.7);
  doc.line(ML, y, ML + PW, y);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("SR.", ML + CSR / 2, y + 5.5, { align: "center" });
  doc.text("FEES FOR RENDERING PROFESSIONAL SERVICES IN THE MATTER OF", ML + CSR + 2, y + 5.5);
  doc.text("AMOUNT", ML + PW, y + 5.5, { align: "right" });
  y += 9;
  doc.line(ML, y, ML + PW, y);
  doc.setLineWidth(0.2);
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  (inv.items || []).forEach((item, idx) => {
    const lh = 4.8;
    const catLines = item.category ? doc.splitTextToSize(item.category, CDSC - 4) : [];
    const dls = doc.splitTextToSize(item.description || "", CDSC - 4);
    const tls = item.detail ? doc.splitTextToSize(item.detail, CDSC - 10) : [];
    const rh = Math.max(10, (catLines.length + dls.length + tls.length) * lh + 4);
    ensureSpace(rh);
    let iy = y + lh + 1;
    doc.text(String(idx + 1), ML + CSR / 2, iy, { align: "center" });
    if (catLines.length) {
      doc.setFont("helvetica", "bold");
      catLines.forEach((l: string) => { doc.text(l, ML + CSR + 2, iy); iy += lh; });
      doc.setFont("helvetica", "normal");
    }
    dls.forEach((l: string) => { doc.text(l, ML + CSR + 2, iy); iy += lh; });
    if (tls.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      tls.forEach((l: string) => { doc.text(l, ML + CSR + 8, iy); iy += lh; });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }
    doc.text("Rs. " + fI(item.amount || 0), ML + PW, y + lh + 1, { align: "right" });
    y += rh;
  });
  for (let bi = (inv.items || []).length; bi < 3; bi++) y += 8;
  y += 4;

  const total = parseFloat(String(inv.total || 0));
  const tx = ML + CSR + CDSC;
  ensureSpace(30);
  doc.setLineWidth(0.7);
  doc.line(tx, y, ML + PW, y);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Rs. " + fI(total), ML + PW, y + 7, { align: "right" });
  doc.setFontSize(9);
  y += 11;
  doc.line(tx, y, ML + PW, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("RUPEES IN WORD :  " + nW(total), ML, y);
  doc.setFont("helvetica", "normal");
  y += 13;

  ensureSpace(45);
  const by = y;
  if (bank.bankName || bank.accountNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("PAYMENT DETAILS", ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (bank.bankName) { doc.text("Bank : " + bank.bankName, ML, y); y += 5; }
    if (bank.accountName) { doc.text("A/c Name : " + bank.accountName, ML, y); y += 5; }
    if (bank.accountNumber) { doc.text("A/c No. : " + bank.accountNumber, ML, y); y += 5; }
    if (bank.ifscCode) { doc.text("IFSC : " + bank.ifscCode, ML, y); y += 5; }
    if (bank.branch) { doc.text("Branch : " + bank.branch, ML, y); y += 5; }
    if (bank.upiId) { doc.text("UPI : " + bank.upiId, ML, y); y += 5; }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FOR, " + (firm.name || "V G K & CO").toUpperCase(), ML + PW, by, { align: "right" });
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, "PNG", ML + PW - 42, by + 3, 42, 16, "", "FAST");
    } catch {
      /* signature optional */
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Authorised Signatory", ML + PW, by + 24, { align: "right" });

  // Bg_08: terms & conditions were set in Settings but never rendered on the PDF.
  if (firm.termsAndConditions) {
    doc.setFontSize(7.5);
    const termLines = doc.splitTextToSize(firm.termsAndConditions, PW);
    let ty = Math.max(y, by + 30);
    if (ty + 4.5 + termLines.length * 3.8 > PAGE_BOTTOM) {
      doc.addPage();
      ty = 15;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TERMS & CONDITIONS", ML, ty);
    ty += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    termLines.forEach((l: string) => { doc.text(l, ML, ty); ty += 3.8; });
  }

  doc.setFontSize(7.5);
  doc.setLineWidth(0.4);
  doc.line(ML, 284, ML + PW, 284);
  doc.text([firm.name, firm.email, firm.mobile].filter(Boolean).join("  |  "), CX, 289, { align: "center" });

  stampPageNumbers(doc, ML + PW);
  doc.save(inv.invoiceNumber.split("/").join("_") + ".pdf");
}

export function genReceiptPDF(rec: Payment, invLabel: string, cl: Client | undefined, settings: Settings) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const client = cl || ({ name: "Unknown" } as Client);
  const firm = settings.firmDetails;
  const ML = 15, PW = 180, CX = 105;
  let y = 10;

  try {
    const lg = getLogoEl();
    if (lg) doc.addImage(lg, "PNG", CX - 9, y, 18, 18, "", "FAST");
  } catch {
    /* logo optional */
  }
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(firm.name || "V G K & CO", CX, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Chartered Accountant", CX, y, { align: "center" });
  y += 5;
  doc.setLineWidth(0.7);
  doc.line(ML, y, ML + PW, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PAYMENT RECEIPT", CX, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Receipt No. :  " + rec.receiptNumber, ML, y);
  doc.text("Date :  " + fD(rec.date), ML + PW, y, { align: "right" });
  y += 8;
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + PW, y);
  y += 6;

  ([
    ["Received From", client.name || ""],
    ["Against", invLabel || "—"],
    ["Amount Received", "Rs. " + fI(rec.amount)],
    ["Payment Mode", rec.mode || "Cash"],
    ["Reference / UTR", rec.reference || "—"],
  ] as [string, string][]).forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label + " :", ML, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, ML + 70, y);
    y += 7;
  });

  y += 4;
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + PW, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("AMOUNT IN WORDS :  " + nW(rec.amount), ML, y);
  y += 14;
  doc.text("FOR, " + (firm.name || "V G K & CO").toUpperCase(), ML + PW, y, { align: "right" });
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, "PNG", ML + PW - 42, y + 3, 42, 16, "", "FAST");
    } catch {
      /* signature optional */
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  y += 24;
  doc.text("Authorised Signatory", ML + PW, y, { align: "right" });

  stampPageNumbers(doc, ML + PW);
  doc.save(rec.receiptNumber.split("/").join("_") + ".pdf");
}

export function genLedgerPDF(
  cl: Client,
  entries: { date: string; description: string; debit: number; credit: number }[],
  settings: Settings
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const firm = settings.firmDetails;
  const ML = 15, PW = 180, CX = 105;
  let y = 10;

  try {
    const lg = getLogoEl();
    if (lg) doc.addImage(lg, "PNG", CX - 9, y, 18, 18, "", "FAST");
  } catch {
    /* logo optional */
  }
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(firm.name || "V G K & CO", CX, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Chartered Accountant", CX, y, { align: "center" });
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + PW, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LEDGER STATEMENT", CX, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(cl.name, ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  [cl.addressLine1, cl.addressLine2, cl.addressLine3, [cl.city, cl.state, cl.pincode].filter(Boolean).join(", ")].filter(Boolean).forEach((l) => {
    doc.text(l as string, ML, y);
    y += 4.5;
  });
  if (cl.mobile) { doc.text("Mob: " + cl.mobile, ML, y); y += 4.5; }
  y += 4;

  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + PW, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const cx = [ML, ML + 22, ML + 90, ML + 120, ML + 150];
  doc.text("Date", cx[0], y);
  doc.text("Particulars", cx[1], y);
  doc.text("Debit", cx[2] + 26, y, { align: "right" });
  doc.text("Credit", cx[3] + 26, y, { align: "right" });
  doc.text("Balance", cx[4] + 30, y, { align: "right" });
  y += 4;
  doc.line(ML, y, ML + PW, y);

  let bal = 0, tDr = 0, tCr = 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  entries.forEach((e) => {
    bal += e.debit - e.credit;
    tDr += e.debit;
    tCr += e.credit;
    y += 5;
    doc.text(fD(e.date), cx[0], y);
    const dl = doc.splitTextToSize(e.description, 65);
    dl.forEach((l: string, i: number) => doc.text(l, cx[1], y + i * 4));
    if (e.debit > 0) doc.text(fI(e.debit), cx[2] + 26, y, { align: "right" });
    if (e.credit > 0) doc.text(fI(e.credit), cx[3] + 26, y, { align: "right" });
    doc.text(fI(Math.abs(bal)) + (bal > 0 ? " Dr" : " Cr"), cx[4] + 30, y, { align: "right" });
    if (dl.length > 1) y += (dl.length - 1) * 4;
    doc.setLineWidth(0.1);
    doc.line(ML, y + 2, ML + PW, y + 2);
    if (y > 270) {
      doc.addPage();
      y = 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Date", cx[0], y);
      doc.text("Particulars", cx[1], y);
      doc.text("Debit", cx[2] + 26, y, { align: "right" });
      doc.text("Credit", cx[3] + 26, y, { align: "right" });
      doc.text("Balance", cx[4] + 30, y, { align: "right" });
      y += 4;
      doc.line(ML, y, ML + PW, y);
      doc.setFont("helvetica", "normal");
    }
  });

  y += 6;
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + PW, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", cx[1], y);
  doc.text(fI(tDr), cx[2] + 26, y, { align: "right" });
  doc.text(fI(tCr), cx[3] + 26, y, { align: "right" });
  const finalBal = tDr - tCr;
  doc.text(fI(Math.abs(finalBal)) + (finalBal > 0 ? " Dr" : finalBal < 0 ? " Cr" : ""), cx[4] + 30, y, { align: "right" });
  y += 5;
  doc.line(ML, y, ML + PW, y);

  stampPageNumbers(doc, ML + PW);
  doc.save("Ledger_" + cl.name.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf");
}
