import { Schema, model, models, type InferSchemaType } from "mongoose";

const InvoiceItemSchema = new Schema(
  {
    category: { type: String, default: "" },
    description: { type: String, default: "" },
    detail: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    items: { type: [InvoiceItemSchema], default: [] },
    notes: { type: String, default: "" },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["Unpaid", "Partial", "Paid"], default: "Unpaid" },
    paymentType: { type: String, enum: ["credit", "cash"], default: "credit" },
  },
  { timestamps: true }
);

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema>;

export default models.Invoice || model("Invoice", InvoiceSchema);
