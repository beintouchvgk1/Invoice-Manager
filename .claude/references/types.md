# TypeScript Types Reference

All domain types live in `lib/types.ts` — import from there, never redefine a shape inline.

```typescript
type Role = { _id: string; name: string; description?: string; isActive: boolean };

// GET /api/users always returns roleId populated (a full Role object), not a raw id.
type User = { _id: string; email: string; phone?: string; roleId: Role; isActive: boolean };

type Client = {
  _id: string;
  name: string;
  groupName?: string;
  addressLine1?: string; addressLine2?: string; addressLine3?: string;
  city?: string; state?: string; pincode?: string;
  mobile?: string;
};

type InvoiceItem = { category?: string; description?: string; detail?: string; amount: number };

type Invoice = {
  _id: string;
  invoiceNumber: string;
  date: string;              // "YYYY-MM-DD"
  clientId: string;
  items: InvoiceItem[];
  notes?: string;
  total: number;
  paidAmount: number;
  status: "Unpaid" | "Partial" | "Paid";
  paymentType: "credit" | "cash";
};

type Payment = {
  _id: string;
  clientId: string;
  invoiceId?: string | null;   // null/absent = advance payment, not tied to one invoice
  receiptNumber: string;
  date: string;
  amount: number;
  mode: "Cash" | "Bank";
  reference?: string;
  notes?: string;
};

type Group = { name: string; members: Client[]; memberCount: number; outstanding: number };

type Settings = {
  _id?: string;
  firmDetails: { name; email; address; city; pincode; mobile; termsAndConditions };
  bankAccount: { bankName; accountName; accountNumber; ifscCode; branch; upiId };
  signature: string;           // base64 data URL
  invoiceNumbering: { prefix; financialYear; nextInvoiceCounter; nextReceiptCounter };
  categories: string[];
};
```

## Derived/computed values — use `lib/calc.ts`, don't reimplement
- `ost(invoice)` — outstanding amount on an invoice (`total - paidAmount`)
- `ageD(date)` — age in days from an invoice/payment date
- `fI(n)` — formats a number as Indian-style currency amount (no `Rs.` prefix — add that in JSX)
- `fD(date)` / `td()` — display-format a date / get today's date string
