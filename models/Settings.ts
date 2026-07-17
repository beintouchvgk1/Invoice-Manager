import { Schema, model, models, type InferSchemaType } from "mongoose";

const DEFAULT_CATEGORIES = [
  "Income Tax Return Filing",
  "Tax Audit u/s 44AB",
  "Tax Audit u/s 44AD",
  "GST Registration",
  "GST Return Filing (GSTR-1 & 3B)",
  "GST Annual Return (GSTR-9)",
  "Statutory Audit",
  "Internal Audit",
  "Company Incorporation",
  "Annual ROC Filing",
  "Accounting & Bookkeeping",
  "TDS Return Filing",
  "Project Finance / CMA Report",
  "Trademark / MSME Registration",
  "Balance Sheet Preparation",
  "Consultancy & Advisory",
  "Other Professional Services",
];

const FirmDetailsSchema = new Schema(
  {
    name: { type: String, default: "V G K & CO" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    mobile: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
  },
  { _id: false }
);

const BankAccountSchema = new Schema(
  {
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    branch: { type: String, default: "" },
    upiId: { type: String, default: "" },
  },
  { _id: false }
);

const InvoiceNumberingSchema = new Schema(
  {
    prefix: { type: String, default: "VGK" },
    financialYear: { type: String, default: "2024-25" },
    nextInvoiceCounter: { type: Number, default: 1 },
    nextReceiptCounter: { type: Number, default: 1 },
  },
  { _id: false }
);

const SettingsSchema = new Schema(
  {
    firmDetails: { type: FirmDetailsSchema, default: () => ({}) },
    bankAccount: { type: BankAccountSchema, default: () => ({}) },
    signature: { type: String, default: "" },
    invoiceNumbering: { type: InvoiceNumberingSchema, default: () => ({}) },
    categories: { type: [String], default: DEFAULT_CATEGORIES },
  },
  { timestamps: true }
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema>;

export default models.Settings || model("Settings", SettingsSchema);
