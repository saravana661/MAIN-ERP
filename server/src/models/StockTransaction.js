import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: { type: String, required: true, unique: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true, index: true },
    transactionType: {
      type: String,
      required: true,
      enum: [
        "PURCHASE",
        "SALE",
        "SALES_RETURN",
        "PURCHASE_RETURN",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
        "OPENING_STOCK"
      ]
    },
    referenceType: { type: String, required: true },
    referenceNumber: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, trim: true, uppercase: true },
    baseQuantity: { type: Number, required: true },
    rate: { type: Number, min: 0, default: 0 },
    amount: { type: Number, min: 0, default: 0 },
    previousStock: { type: Number, required: true },
    resultingStock: { type: Number, required: true },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

stockTransactionSchema.index({ item: 1, createdAt: -1 });

export const StockTransaction = mongoose.model("StockTransaction", stockTransactionSchema);

