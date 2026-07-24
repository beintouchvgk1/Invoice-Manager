import { Schema, model, models } from "mongoose";

export const RoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "Description for this role" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.Role || model("Role", RoleSchema);
