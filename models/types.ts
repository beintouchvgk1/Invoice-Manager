// Mongoose-inferred document types, centralized here instead of inline in each schema
// file — every model file exports its Schema by name specifically so this file can
// derive the type from it. Domain-level types (used by the frontend/API responses)
// live in lib/types.ts instead; these Doc types describe the raw persisted shape.
import type { InferSchemaType } from "mongoose";
import type { RoleSchema } from "./Role";
import type { UserSchema } from "./User";
import type { ClientSchema } from "./Client";
import type { GroupSchema } from "./Group";
import type { InvoiceSchema } from "./Invoice";
import type { PaymentSchema } from "./Payment";
import type { SettingsSchema } from "./Settings";

export type RoleDoc = InferSchemaType<typeof RoleSchema>;
export type UserDoc = InferSchemaType<typeof UserSchema>;
export type ClientDoc = InferSchemaType<typeof ClientSchema>;
export type GroupDoc = InferSchemaType<typeof GroupSchema>;
export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;
export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;
export type SettingsDoc = InferSchemaType<typeof SettingsSchema>;
