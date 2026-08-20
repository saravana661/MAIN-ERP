import { Invoice } from "../models/Invoice.js";
import { PurchaseReceipt } from "../models/PurchaseReceipt.js";
import { StockBalance } from "../models/StockBalance.js";
import { StockTransaction } from "../models/StockTransaction.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function dateRange(field, query) {
  if (!query.fromDate && !query.toDate) return {};
  const value = {};
  if (query.fromDate) value.$gte = new Date(query.fromDate);
  if (query.toDate) value.$lte = new Date(`${query.toDate}T23:59:59.999Z`);
  return { [field]: value };
}

function reply(res, data, filename) {
  if (res.req.query.format !== "csv") return res.json({ data });
  if (!data.length) return res.type("text/csv").attachment(`${filename}.csv`).send("");
  const keys = Object.keys(flatten(data[0]));
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [keys.join(","), ...data.map((row) => keys.map((key) => escape(flatten(row)[key])).join(","))].join("\n");
  return res.type("text/csv").attachment(`${filename}.csv`).send(csv);
}

function flatten(value, prefix = "", target = {}) {
  for (const [key, entry] of Object.entries(value?.toObject ? value.toObject() : value || {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry) && !(entry instanceof Date) && !entry._bsontype) flatten(entry, name, target);
    else target[name] = Array.isArray(entry) ? entry.map((item) => JSON.stringify(item)).join(" | ") : entry;
  }
  return target;
}

export const expenseReport = asyncHandler(async (req, res) => {
  const receipts = await PurchaseReceipt.find(dateRange("grnDate", req.query)).populate("vendor", "vendorCode name").populate("items.item", "itemCode name category").sort({ grnDate: -1 });
  const data = receipts.flatMap((receipt) => receipt.items
    .filter((line) => !req.query.vendor || String(receipt.vendor?._id) === req.query.vendor)
    .filter((line) => !req.query.item || String(line.item?._id) === req.query.item)
    .map((line) => ({ date: receipt.grnDate, grnNumber: receipt.grnNumber, vendor: receipt.vendor?.name, item: line.item?.name, quantity: line.quantity, unit: line.unit, rate: line.rate, discount: line.discount, tax: line.tax, amount: line.amount })));
  reply(res, data, "purchase-expense-report");
});

export const vendorReport = asyncHandler(async (req, res) => {
  const receipts = await PurchaseReceipt.find(dateRange("grnDate", req.query)).populate("vendor", "vendorCode name");
  const grouped = new Map();
  for (const receipt of receipts) {
    if (!receipt.vendor || (req.query.vendor && String(receipt.vendor._id) !== req.query.vendor)) continue;
    const key = String(receipt.vendor._id);
    const summary = grouped.get(key) || { vendor: receipt.vendor.name, vendorCode: receipt.vendor.vendorCode, purchaseCount: 0, totalQuantity: 0, totalPurchaseAmount: 0, lastPurchaseDate: receipt.grnDate, rateTotal: 0, rateCount: 0 };
    summary.purchaseCount += 1;
    summary.totalPurchaseAmount += receipt.grandTotal;
    for (const line of receipt.items) { summary.totalQuantity += line.quantity; summary.rateTotal += line.rate; summary.rateCount += 1; }
    if (receipt.grnDate > summary.lastPurchaseDate) summary.lastPurchaseDate = receipt.grnDate;
    grouped.set(key, summary);
  }
  const data = [...grouped.values()].map(({ rateTotal, rateCount, ...row }) => ({ ...row, averagePurchaseRate: rateCount ? Number((rateTotal / rateCount).toFixed(2)) : 0 }));
  reply(res, data, "vendor-report");
});

export const transactionReport = asyncHandler(async (req, res) => {
  const filter = { ...dateRange("createdAt", req.query) };
  if (req.query.type) filter.transactionType = req.query.type;
  if (req.query.item) filter.item = req.query.item;
  if (req.query.referenceNumber) filter.referenceNumber = new RegExp(req.query.referenceNumber, "i");
  const data = await StockTransaction.find(filter).populate("item", "itemCode name baseUnit").populate("createdBy", "name").sort({ createdAt: -1 }).limit(2000);
  reply(res, data, "transaction-report");
});

export const stockReport = asyncHandler(async (_req, res) => {
  const balances = await StockBalance.find().populate("item", "itemCode name category baseUnit reorderLevel");
  const movements = await StockTransaction.find().select("item transactionType baseQuantity");
  const flows = new Map();
  for (const movement of movements) {
    const key = String(movement.item);
    const row = flows.get(key) || { openingStock: 0, purchaseQty: 0, salesQty: 0, purchaseReturnQty: 0, salesReturnQty: 0, adjustmentInQty: 0, adjustmentOutQty: 0 };
    const quantity = Math.abs(movement.baseQuantity);
    if (movement.transactionType === "OPENING_STOCK") row.openingStock += quantity;
    if (movement.transactionType === "PURCHASE") row.purchaseQty += quantity;
    if (movement.transactionType === "SALE") row.salesQty += quantity;
    if (movement.transactionType === "PURCHASE_RETURN") row.purchaseReturnQty += quantity;
    if (movement.transactionType === "SALES_RETURN") row.salesReturnQty += quantity;
    if (movement.transactionType === "ADJUSTMENT_IN") row.adjustmentInQty += quantity;
    if (movement.transactionType === "ADJUSTMENT_OUT") row.adjustmentOutQty += quantity;
    flows.set(key, row);
  }
  const data = balances.map((balance) => ({
    itemCode: balance.item?.itemCode, item: balance.item?.name, category: balance.item?.category,
    currentBaseQty: balance.currentBaseQty, baseUnit: balance.baseUnit, averageCost: balance.averageCost,
    stockValue: balance.stockValue, reorderLevel: balance.item?.reorderLevel,
    ...(flows.get(String(balance.item?._id)) || {}),
    status: balance.currentBaseQty <= (balance.item?.reorderLevel || 0) ? "LOW" : "OK"
  }));
  reply(res, data, "stock-report");
});

export const salesReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ ...dateRange("invoiceDate", req.query), status: "COMPLETED" }).sort({ invoiceDate: -1 });
  const data = invoices.map((invoice) => ({ date: invoice.invoiceDate, invoiceNumber: invoice.invoiceNumber, customer: invoice.customer?.name, paymentMethod: invoice.paymentMethod, subtotal: invoice.subtotal, discount: invoice.discount, tax: invoice.tax, grandTotal: invoice.grandTotal }));
  reply(res, data, "sales-report");
});
