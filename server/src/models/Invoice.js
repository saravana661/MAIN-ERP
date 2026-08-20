import mongoose from "mongoose";

const invoiceLineSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    packaging: { type: mongoose.Schema.Types.ObjectId, ref: "Packaging" },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unit: { type: String, required: true, trim: true, uppercase: true },
    baseQuantity: { type: Number, required: true, min: 0.000001 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    invoiceDate: { type: Date, default: Date.now, required: true },
    customer: {
      name: { type: String, trim: true, default: "Walk-in Customer" },
      mobile: { type: String, trim: true },
      address: { type: String, trim: true }
    },
    items: { type: [invoiceLineSchema], validate: [(items) => items.length > 0, "At least one item is required"] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, min: 0, default: 0 },
    tax: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, default: "CASH", trim: true, uppercase: true },
    status: { type: String, enum: ["COMPLETED", "CANCELLED"], default: "COMPLETED" },
    printSnapshot: { type: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

