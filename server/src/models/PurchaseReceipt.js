import mongoose from "mongoose";

const receiptLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unit: { type: String, required: true, uppercase: true, trim: true },
    baseQuantity: { type: Number, required: true, min: 0.000001 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date }
  },
  { _id: false }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, unique: true, index: true },
    grnDate: { type: Date, default: Date.now, required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    items: { type: [receiptLineSchema], validate: [(items) => items.length > 0, "At least one item is required"] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const PurchaseReceipt = mongoose.model("PurchaseReceipt", purchaseReceiptSchema);

