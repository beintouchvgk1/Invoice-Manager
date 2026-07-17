import { Schema, model, models, type InferSchemaType } from "mongoose";

const AdminSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export type AdminDoc = InferSchemaType<typeof AdminSchema>;

export default models.Admin || model("Admin", AdminSchema);
