import mongoose from "mongoose";

const orderLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unit: { type: String, required: true, uppercase: true, trim: true },
    baseQuantity: { type: Number, required: true, min: 0.000001 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    poDate: { type: Date, default: Date.now, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    referenceNumber: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    expectedDeliveryDate: { type: Date },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
      default: "DRAFT"
    },
    items: { type: [orderLineSchema], validate: [(items) => items.length > 0, "At least one item is required"] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

