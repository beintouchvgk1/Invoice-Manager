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
