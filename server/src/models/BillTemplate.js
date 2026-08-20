import mongoose from "mongoose";

const billTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    pageFormat: { type: String, enum: ["A4", "A5", "THERMAL_80", "THERMAL_58"], default: "A4" },
    header: { type: String, trim: true },
    footer: { type: String, trim: true },
    terms: { type: String, trim: true },
    showTax: { type: Boolean, default: true },
    showDiscount: { type: Boolean, default: true },
    showPayment: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const BillTemplate = mongoose.model("BillTemplate", billTemplateSchema);

