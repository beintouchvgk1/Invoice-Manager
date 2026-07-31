import { Schema, model, models } from "mongoose";

export const PaymentSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    receiptNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ["Cash", "Bank"], default: "Cash" },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
    // See models/Client.ts's clientOpId — same idempotent-replay guard, doubly
    // important here since a duplicate create would also burn an extra receipt
    // number from the atomic counter.
    clientOpId: { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default models.Payment || model("Payment", PaymentSchema);
