import type { Mongoose } from "mongoose";
import type { ROLES } from "@/lib/constants/roles";

// --- Next.js API route dynamic segment params (app/api/**/[id]/route.ts) ---
export type RouteParams<K extends string = "id"> = { params: Promise<Record<K, string>> };

// --- services/http.ts response envelope ---
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// --- lib/env.ts ---
export type AppEnv = "local" | "staging" | "production";

// --- lib/mongodb.ts global connection cache ---
export type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
  syncedModels: Set<string>;
};

// --- lib/jwt.ts ---
export type AuthPayload = {
  sub: string;
  email: string;
  role: string;
};

// --- lib/constants/roles.ts ---
export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// --- lib/calc.ts ---
export type InvoiceLike = { total?: number; paidAmount?: number };

// --- components/Common/Toast.tsx ---
export type ToastKind = "ok" | "err";

// --- components/Common/ToastProvider.tsx ---
export type ToastItem = { id: string; kind: ToastKind; message: string };
export type ToastContextValue = { showToast: (message: string, kind?: ToastKind) => void };

// --- components/Common/Button.tsx ---
export type ButtonVariant = "bp" | "bg" | "bs" | "brd";

// --- components/Layout/SidebarContext.tsx ---
export type SidebarContextValue = {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
};

// --- components/Invoice/InvoiceForm.tsx ---
export type InvoiceFormRow = InvoiceItem & { key: string };

// --- app/(app)/reports/page.tsx ---
export type ReportTab = "out" | "rcv" | "age" | "grp";

// --- app/(app)/ledger/[clientId]/page.tsx ---
export type LedgerEntry = { date: string; type: "inv" | "rec"; description: string; debit: number; credit: number };

export type Role = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
};

// GET /api/users always returns roleId populated (see requireAuth/route.ts .populate("roleId")),
// so on the frontend it's the full Role object, not a raw id.
export type User = {
  _id: string;
  email: string;
  phone?: string | null;
  roleId: Role;
  isActive: boolean;
};

export type Client = {
  _id: string;
  name: string;
  groupName?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  state?: string;
  pincode?: string;
  mobile?: string;
};

export type InvoiceItem = {
  category?: string;
  description?: string;
  detail?: string;
  amount: number;
};

export type Invoice = {
  _id: string;
  invoiceNumber: string;
  date: string;
  clientId: string;
  items: InvoiceItem[];
  notes?: string;
  total: number;
  paidAmount: number;
  status: "Unpaid" | "Partial" | "Paid";
  paymentType: "credit" | "cash";
};

export type Payment = {
  _id: string;
  clientId: string;
  invoiceId?: string | null;
  receiptNumber: string;
  date: string;
  amount: number;
  mode: "Cash" | "Bank";
  reference?: string;
  notes?: string;
};

export type Group = {
  name: string;
  members: Client[];
  memberCount: number;
  outstanding: number;
};

export type FirmDetails = {
  name: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  mobile: string;
  termsAndConditions: string;
};

export type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
};

export type InvoiceNumbering = {
  prefix: string;
  financialYear: string;
  nextInvoiceCounter: number;
  nextReceiptCounter: number;
};

export type Settings = {
  _id?: string;
  firmDetails: FirmDetails;
  bankAccount: BankAccount;
  signature: string;
  invoiceNumbering: InvoiceNumbering;
  categories: string[];
};
