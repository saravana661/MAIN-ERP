import mongoose from "mongoose";

const stockBalanceSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, unique: true },
    currentBaseQty: { type: Number, required: true, default: 0 },
    baseUnit: { type: String, required: true, trim: true, uppercase: true },
    averageCost: { type: Number, min: 0, default: 0 },
    stockValue: { type: Number, min: 0, default: 0 },
    lastPurchaseRate: { type: Number, min: 0, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const StockBalance = mongoose.model("StockBalance", stockBalanceSchema);

