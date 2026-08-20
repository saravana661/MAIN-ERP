import mongoose from "mongoose";

const packagingSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    packageName: { type: String, required: true, trim: true },
    packageUnit: { type: String, required: true, trim: true, uppercase: true },
    baseQuantity: { type: Number, required: true, min: 0.000001 },
    sellingRate: { type: Number, required: true, min: 0 },
    barcode: { type: String, trim: true, sparse: true, unique: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

packagingSchema.index({ item: 1, packageName: 1 }, { unique: true });

export const Packaging = mongoose.model("Packaging", packagingSchema);

