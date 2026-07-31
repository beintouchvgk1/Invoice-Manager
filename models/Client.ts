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
    // Set by an offline-queued create on replay so a retried sync (e.g. the
    // response was lost after the server actually committed) can't double-create
    // the record — see lib/offline/mutate.ts and app/api/clients/route.ts's POST.
    clientOpId: { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default models.Client || model("Client", ClientSchema);
