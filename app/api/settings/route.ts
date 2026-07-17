import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { requireAuth } from "@/lib/requireAuth";
import { ok, fail } from "@/lib/response";

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return fail("Unauthorized", 401);
  await connectDB();
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return ok(settings);
}

export async function PUT(req: NextRequest) {
  if (!requireAuth(req)) return fail("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid payload", 400);

  await connectDB();
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings({});

  const firm = body.firmDetails || {};
  settings.firmDetails.name = firm.name?.trim() || settings.firmDetails.name;
  settings.firmDetails.email = firm.email?.trim() ?? settings.firmDetails.email;
  settings.firmDetails.address = firm.address ?? settings.firmDetails.address;
  settings.firmDetails.city = firm.city?.trim() ?? settings.firmDetails.city;
  settings.firmDetails.pincode = firm.pincode?.trim() ?? settings.firmDetails.pincode;
  settings.firmDetails.mobile = firm.mobile?.trim() ?? settings.firmDetails.mobile;
  settings.firmDetails.termsAndConditions = firm.termsAndConditions?.trim() ?? settings.firmDetails.termsAndConditions;

  const bank = body.bankAccount || {};
  settings.bankAccount.bankName = bank.bankName?.trim() ?? settings.bankAccount.bankName;
  settings.bankAccount.accountName = bank.accountName?.trim() ?? settings.bankAccount.accountName;
  settings.bankAccount.accountNumber = bank.accountNumber?.trim() ?? settings.bankAccount.accountNumber;
  settings.bankAccount.ifscCode = bank.ifscCode?.trim() ?? settings.bankAccount.ifscCode;
  settings.bankAccount.branch = bank.branch?.trim() ?? settings.bankAccount.branch;
  settings.bankAccount.upiId = bank.upiId?.trim() ?? settings.bankAccount.upiId;

  if (body.signature !== undefined) settings.signature = body.signature;

  const numbering = body.invoiceNumbering || {};
  if (numbering.prefix) settings.invoiceNumbering.prefix = String(numbering.prefix).toUpperCase().trim();
  if (numbering.financialYear) settings.invoiceNumbering.financialYear = String(numbering.financialYear).trim();
  if (numbering.nextInvoiceCounter !== undefined) {
    settings.invoiceNumbering.nextInvoiceCounter = parseInt(numbering.nextInvoiceCounter) || 1;
  }

  if (Array.isArray(body.categories)) settings.categories = body.categories;

  await settings.save();
  return ok(settings);
}
