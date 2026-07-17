import { Schema, model, models, type InferSchemaType } from "mongoose";

const PaymentSchema = new Schema(
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

export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;

export default models.Payment || model("Payment", PaymentSchema);
