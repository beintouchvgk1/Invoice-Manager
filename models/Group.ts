import { Schema, model, models, type InferSchemaType } from "mongoose";

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export type GroupDoc = InferSchemaType<typeof GroupSchema>;

export default models.Group || model("Group", GroupSchema);
