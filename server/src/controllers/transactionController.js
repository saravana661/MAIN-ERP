import mongoose from "mongoose";
import { Invoice } from "../models/Invoice.js";
import { Item } from "../models/Item.js";
import { Packaging } from "../models/Packaging.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { PurchaseReceipt } from "../models/PurchaseReceipt.js";
import { Vendor } from "../models/Vendor.js";
import { BillTemplate } from "../models/BillTemplate.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { nextSequence } from "../utils/sequence.js";
import { writeAudit } from "../services/auditService.js";
import { toBaseQuantity } from "../services/conversionService.js";
import { InventoryService } from "../services/inventoryService.js";

const money = (value) => Number(Number(value || 0).toFixed(2));
const dateId = () => new Date().getFullYear();

function calculateLine({ quantity, rate, discount = 0, tax = 0 }) {
  const subtotal = Number(quantity) * Number(rate);
  return money(subtotal - Number(discount) + Number(tax));
}

function calculateTotals(items, discount = 0, tax = 0) {
  const subtotal = money(items.reduce((sum, line) => sum + line.amount, 0));
  return { subtotal, discount: money(discount), tax: money(tax), grandTotal: money(subtotal - discount + tax) };
}

async function resolvePurchaseLines(items, session) {
  if (!Array.isArray(items) || items.length === 0) throw new AppError("At least one item is required.");
  return Promise.all(items.map(async (line) => {
    const item = await Item.findById(line.item).session(session);
    if (!item || !item.active) throw new AppError("A selected item is unavailable.");
    const baseQuantity = await toBaseQuantity({ item, quantity: Number(line.quantity), unitCode: line.unit, session });
    const rate = Number(line.rate);
    if (!Number.isFinite(rate) || rate < 0) throw new AppError("Purchase rate must be zero or more.");
    const discount = Number(line.discount || 0);
    const tax = Number(line.tax || 0);
    return { item: item._id, quantity: Number(line.quantity), unit: String(line.unit).toUpperCase(), baseQuantity, rate, discount, tax, amount: calculateLine({ quantity: line.quantity, rate, discount, tax }), itemDocument: item };
  }));
}

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const vendor = await Vendor.findById(req.body.vendor).session(session);
      if (!vendor || !vendor.active) throw new AppError("Selected vendor is unavailable.");
      const lines = await resolvePurchaseLines(req.body.items, session);
      const sequence = await nextSequence("purchase-order", session);
      const totals = calculateTotals(lines, req.body.discount, req.body.tax);
      [order] = await PurchaseOrder.create([{
        ...req.body,
        poNumber: `PO-${dateId()}-${String(sequence).padStart(6, "0")}`,
        items: lines.map(({ itemDocument, ...line }) => line),
        ...totals,
        createdBy: req.user._id
      }], { session });
      await writeAudit({ actor: req.user._id, action: "CREATE", entityType: "PURCHASE_ORDER", entityId: order._id, session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ data: order });
});

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const data = await PurchaseOrder.find().populate("vendor", "vendorCode name").populate("items.item", "itemCode name").sort({ poDate: -1 }).limit(200);
  res.json({ data });
});

export const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const allowed = ["DRAFT", "SUBMITTED", "APPROVED", "CANCELLED"];
  if (!allowed.includes(req.body.status)) throw new AppError("Invalid purchase-order status.");
  const data = await PurchaseOrder.findByIdAndUpdate(req.params.id, { status: req.body.status, updatedBy: req.user._id }, { new: true });
  if (!data) throw new AppError("Purchase order not found.", 404);
  await writeAudit({ actor: req.user._id, action: `STATUS_${data.status}`, entityType: "PURCHASE_ORDER", entityId: data._id });
  res.json({ data });
});

export const createPurchaseReceipt = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let receipt;
  try {
    await session.withTransaction(async () => {
      const vendor = await Vendor.findById(req.body.vendor).session(session);
      if (!vendor || !vendor.active) throw new AppError("Selected vendor is unavailable.");
      const lines = await resolvePurchaseLines(req.body.items, session);
      const sequence = await nextSequence("purchase-receipt", session);
      const totals = calculateTotals(lines, req.body.discount, req.body.tax);
      [receipt] = await PurchaseReceipt.create([{
        ...req.body,
        grnNumber: `GRN-${dateId()}-${String(sequence).padStart(6, "0")}`,
        items: lines.map(({ itemDocument, ...line }) => line),
        ...totals,
        createdBy: req.user._id
      }], { session });
      for (const line of lines) {
        await InventoryService.postMovement({
          session, item: line.itemDocument, transactionType: "PURCHASE", referenceType: "PURCHASE_RECEIPT",
          referenceNumber: receipt.grnNumber, quantity: line.quantity, unit: line.unit, baseQuantity: line.baseQuantity,
          rate: line.rate, amount: line.amount, createdBy: req.user._id, remarks: receipt.remarks,
          costPerBase: line.rate * line.quantity / line.baseQuantity
        });
        await Item.findByIdAndUpdate(line.item, { lastPurchaseRate: line.rate, updatedBy: req.user._id }, { session });
      }
      if (receipt.purchaseOrder) await PurchaseOrder.findByIdAndUpdate(receipt.purchaseOrder, { status: "RECEIVED", updatedBy: req.user._id }, { session });
      await writeAudit({ actor: req.user._id, action: "RECEIVE", entityType: "PURCHASE_RECEIPT", entityId: receipt._id, session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ data: receipt });
});

export const listPurchaseReceipts = asyncHandler(async (_req, res) => {
  const data = await PurchaseReceipt.find().populate("vendor", "vendorCode name").populate("items.item", "itemCode name").sort({ grnDate: -1 }).limit(200);
  res.json({ data });
});

export const createInvoice = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) throw new AppError("At least one billed item is required.");
  const session = await mongoose.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      const lines = await Promise.all(req.body.items.map(async (line) => {
        const item = await Item.findById(line.item).session(session);
        const packaging = await Packaging.findOne({ _id: line.packaging, item: line.item, active: true }).session(session);
        if (!item || !item.active || !packaging) throw new AppError("A selected item or package is unavailable.");
        const quantity = Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new AppError("Billing quantity must be greater than zero.");
        const rate = line.rate === undefined ? packaging.sellingRate : Number(line.rate);
        const discount = Number(line.discount || 0);
        const tax = Number(line.tax || 0);
        return {
          item: item._id, packaging: packaging._id, description: `${item.name} - ${packaging.packageName}`,
          quantity, unit: packaging.packageUnit, baseQuantity: quantity * packaging.baseQuantity,
          rate, discount, tax, amount: calculateLine({ quantity, rate, discount, tax }), itemDocument: item
        };
      }));
      const sequence = await nextSequence("invoice", session);
      const template = await BillTemplate.findOne({ active: true }).sort({ updatedAt: -1 }).session(session);
      const totals = calculateTotals(lines, req.body.discount, req.body.tax);
      [invoice] = await Invoice.create([{
        invoiceNumber: `INV-${dateId()}-${String(sequence).padStart(6, "0")}`,
        invoiceDate: req.body.invoiceDate || new Date(), customer: req.body.customer || {},
        items: lines.map(({ itemDocument, ...line }) => line), ...totals,
        paymentMethod: String(req.body.paymentMethod || "CASH").toUpperCase(), createdBy: req.user._id,
        printSnapshot: template ? template.toObject() : undefined
      }], { session });
      for (const line of lines) {
        await InventoryService.postMovement({
          session, item: line.itemDocument, transactionType: "SALE", referenceType: "INVOICE", referenceNumber: invoice.invoiceNumber,
          quantity: line.quantity, unit: line.unit, baseQuantity: line.baseQuantity, rate: line.rate, amount: line.amount,
          createdBy: req.user._id
        });
      }
      await writeAudit({ actor: req.user._id, action: "CREATE", entityType: "INVOICE", entityId: invoice._id, session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ data: invoice });
});

export const listInvoices = asyncHandler(async (_req, res) => {
  const data = await Invoice.find().populate("items.item", "itemCode name").sort({ invoiceDate: -1 }).limit(200);
  res.json({ data });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const data = await Invoice.findById(req.params.id).populate("items.item", "itemCode name").populate("items.packaging");
  if (!data) throw new AppError("Invoice not found.", 404);
  res.json({ data });
});

export const cancelInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      invoice = await Invoice.findById(req.params.id).populate("items.item").session(session);
      if (!invoice) throw new AppError("Invoice not found.", 404);
      if (invoice.status === "CANCELLED") throw new AppError("This invoice has already been cancelled.");
      for (const line of invoice.items) {
        await InventoryService.postMovement({
          session, item: line.item, transactionType: "SALES_RETURN", referenceType: "INVOICE_CANCELLATION",
          referenceNumber: invoice.invoiceNumber, quantity: line.quantity, unit: line.unit, baseQuantity: line.baseQuantity,
          rate: line.rate, amount: line.amount, createdBy: req.user._id, remarks: req.body.reason || "Invoice cancellation"
        });
      }
      invoice.status = "CANCELLED";
      await invoice.save({ session });
      await writeAudit({ actor: req.user._id, action: "CANCEL", entityType: "INVOICE", entityId: invoice._id, session, metadata: { reason: req.body.reason } });
    });
  } finally { await session.endSession(); }
  res.json({ data: invoice });
});

export const createStockAdjustment = asyncHandler(async (req, res) => {
  const { item: itemId, quantity, unit, direction, reason } = req.body;
  const item = await Item.findById(itemId);
  if (!item) throw new AppError("Item not found.", 404);
  const baseQuantity = await toBaseQuantity({ item, quantity: Number(quantity), unitCode: unit });
  const type = direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
  const session = await mongoose.startSession();
  let movement;
  try {
    await session.withTransaction(async () => {
      const sequence = await nextSequence("adjustment", session);
      const result = await InventoryService.postMovement({
        session, item, transactionType: type, referenceType: "STOCK_ADJUSTMENT",
        referenceNumber: `ADJ-${dateId()}-${String(sequence).padStart(6, "0")}`,
        quantity: Number(quantity), unit: String(unit).toUpperCase(), baseQuantity,
        createdBy: req.user._id, remarks: reason
      });
      movement = result.movement;
      await writeAudit({ actor: req.user._id, action: type, entityType: "STOCK_ADJUSTMENT", entityId: movement._id, session, metadata: { reason } });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ data: movement });
});

export const createOpeningStock = asyncHandler(async (req, res) => {
  const { item: itemId, quantity, unit, remarks } = req.body;
  const item = await Item.findById(itemId);
  if (!item) throw new AppError("Item not found.", 404);
  const baseQuantity = await toBaseQuantity({ item, quantity: Number(quantity), unitCode: unit });
  const session = await mongoose.startSession();
  let movement;
  try {
    await session.withTransaction(async () => {
      const sequence = await nextSequence("opening-stock", session);
      const result = await InventoryService.postMovement({
        session, item, transactionType: "OPENING_STOCK", referenceType: "OPENING_STOCK",
        referenceNumber: `OPEN-${dateId()}-${String(sequence).padStart(6, "0")}`,
        quantity: Number(quantity), unit: String(unit).toUpperCase(), baseQuantity,
        createdBy: req.user._id, remarks
      });
      movement = result.movement;
      await writeAudit({ actor: req.user._id, action: "OPENING_STOCK", entityType: "OPENING_STOCK", entityId: movement._id, session });
    });
  } finally { await session.endSession(); }
  res.status(201).json({ data: movement });
});
