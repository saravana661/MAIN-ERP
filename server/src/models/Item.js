import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    subCategory: { type: String, trim: true },
    brand: { type: String, trim: true },
    barcode: { type: String, trim: true, sparse: true, unique: true },
    hsnCode: { type: String, trim: true },
    taxRate: { type: Number, min: 0, default: 0 },
    baseUnit: { type: String, required: true, trim: true, uppercase: true },
    purchaseUnit: { type: String, required: true, trim: true, uppercase: true },
    salesUnit: { type: String, required: true, trim: true, uppercase: true },
    reorderLevel: { type: Number, min: 0, default: 0 },
    minimumStock: { type: Number, min: 0, default: 0 },
    maximumStock: { type: Number, min: 0 },
    lastPurchaseRate: { type: Number, min: 0, default: 0 },
    averageCost: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    minimumSellingPrice: { type: Number, min: 0, default: 0 },
    mrp: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

itemSchema.index({ itemCode: 1 });
itemSchema.index({ name: "text", itemCode: "text", barcode: "text" });

export const Item = mongoose.model("Item", itemSchema);

