import type { Mongoose } from "mongoose";
import type { ROLES } from "@/lib/constants/roles";
import type { PERMISSION_MODULES } from "@/lib/constants/permissions";

// --- Next.js API route dynamic segment params (app/api/**/[id]/route.ts) ---
export type RouteParams<K extends string = "id"> = { params: Promise<Record<K, string>> };

// --- services/http.ts response envelope ---
// `conflict` is only ever present on a 409 from the offline-sync baseUpdatedAt
// precondition (see lib/response.ts's conflict()) — the current server doc, so
// the client can resolve without a second round-trip.
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; conflict?: unknown };

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

// --- lib/constants/permissions.ts ---
export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = PermissionModule["actions"][number];

// --- hooks/useCurrentUser.ts ---
export type CurrentUser = { email: string | null; role: string | null; permissions: string[]; loading: boolean };

// --- lib/offline/db.ts ---
// Every offline-cached resource — each is a single Dexie row (key "data") holding
// the last-known-good snapshot (a list for most resources, a single object for
// "settings"). Whole-snapshot replace, not delta sync (see lib/offline/cache.ts).
export type OfflineResource = "invoices" | "clients" | "groups" | "payments" | "roles" | "users" | "settings";
export type CacheRow<T> = { key: "data"; data: T; cachedAt: string };

// --- hooks/useOfflineResource.ts ---
export type OfflineResourceState<T> = { data: T; loading: boolean; error: string | null; refresh: () => Promise<void> };

// --- lib/offline/queue.ts / mutate.ts / syncEngine.ts ---
// Only resources with a real `_id` + `updatedAt` and no computed/aggregate read
// shape get the full write-queue + conflict-detection treatment. "groups" is
// deliberately excluded: its list endpoint returns a computed aggregate
// ({name, members, memberCount, outstanding}), not the raw Group document, so
// there's no clean optimistic-cache shape to queue against — group edits stay
// online-only, same as roles/users (see references/offline.md).
export type OfflineWritableResource = "clients" | "payments" | "invoices" | "settings";

export type QueuedOpType = "create" | "update" | "delete";
export type QueuedOpStatus = "pending" | "inflight" | "conflict" | "failed";

export type QueuedOp = {
  opId: string;
  seq: number;
  resource: OfflineWritableResource;
  opType: QueuedOpType;
  targetId: string;
  payload: Record<string, unknown>;
  baseUpdatedAt: string | null;
  status: QueuedOpStatus;
  serverVersion: Record<string, unknown> | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

export type ConflictRecord = QueuedOp & { status: "conflict"; serverVersion: Record<string, unknown> };

export type SyncStatus = { pendingCount: number; conflictCount: number; failedCount: number; syncing: boolean };

// --- lib/offline/mutate.ts ---
// The shape every services/{name}.service.ts write-capable service already has —
// used generically so offlineCreate/offlineUpdate/offlineDelete don't need a
// bespoke wrapper per resource.
export type WritableService<T> = {
  create: (data: Partial<T> & Record<string, unknown>) => Promise<T>;
  update: (id: string, data: Partial<T> & Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
};

// --- app/api/backup/route.ts ---
// A full, application-level export of every collection — used for the "Download
// Database Backup" feature. Deliberately plain JSON (not a mongodump/BSON archive):
// the app runs on Vercel serverless functions, which can't shell out to the
// mongodump binary or write to a persistent filesystem, so an in-process
// Mongoose export is the only approach that actually works in production.
// Each collection is the raw `.lean()` result (includes `_id`/timestamps/`__v`),
// so this stays a loose record shape rather than the stricter `*Doc` types in
// models/types.ts (which describe the pre-persistence schema shape, not what
// comes back off the wire).
export type DatabaseBackupPayload = {
  meta: { exportedAt: string; app: string; version: number };
  collections: Record<"clients" | "groups" | "invoices" | "payments" | "roles" | "users" | "settings", Record<string, unknown>[]>;
};

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
  permissions: string[];
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
  // Already serialized by every route today (Mongoose's default toJSON/lean()
  // keep timestamps) — exposed here because offline sync's conflict detection
  // needs it. __offlinePending is cache-only: never sent to/from the server,
  // set locally on an optimistic row queued while offline.
  updatedAt?: string;
  __offlinePending?: boolean;
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
  updatedAt?: string;
  // Cache-only: set on an invoice created/edited offline, whose real
  // invoiceNumber can't be assigned until the atomic counter is reached during
  // sync (see references/offline.md's "pending sync" flow). Never sent to the
  // server, never true on anything that ever touched the API.
  __offlinePending?: boolean;
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
  updatedAt?: string;
  __offlinePending?: boolean;
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
  updatedAt?: string;
  __offlinePending?: boolean;
};
