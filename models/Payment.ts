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
  },
  { timestamps: true }
);

export default models.Payment || model("Payment", PaymentSchema);
