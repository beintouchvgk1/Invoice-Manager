import { Schema, model, models } from "mongoose";

export const GroupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export default models.Group || model("Group", GroupSchema);
