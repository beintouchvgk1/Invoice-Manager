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
    //
    // Deliberately has NO default: a `default: null` cancels out `sparse`. A
    // sparse index skips documents that lack the field, but a document whose
    // value is explicitly null still counts as having it — so with a default,
    // the second record ever created without a clientOpId collided with the
    // first on this unique index ("E11000 dup key: { clientOpId: null }").
    // Leaving it unset keeps those documents out of the index entirely, which
    // is what sparse was there for. The index itself is unchanged.
    clientOpId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default models.Client || model("Client", ClientSchema);
