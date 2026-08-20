import mongoose from "mongoose";

const unitSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    dimension: {
      type: String,
      required: true,
      enum: ["WEIGHT", "VOLUME", "COUNT", "OTHER"]
    },
    baseUnit: { type: Boolean, default: false },
    conversionToBase: { type: Number, required: true, min: 0.000001 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Unit = mongoose.model("Unit", unitSchema);

