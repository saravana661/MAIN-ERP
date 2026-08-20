import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

export const Role = mongoose.model("Role", roleSchema);

