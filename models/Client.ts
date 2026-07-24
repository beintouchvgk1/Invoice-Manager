import { Schema, model, models } from "mongoose";

export const ClientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    groupName: { type: String, default: "", trim: true },
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    addressLine3: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    mobile: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.Client || model("Client", ClientSchema);
