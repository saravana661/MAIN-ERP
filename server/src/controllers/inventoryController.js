import { Item } from "../models/Item.js";
import { StockBalance } from "../models/StockBalance.js";
import { StockTransaction } from "../models/StockTransaction.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fromBaseQuantity } from "../services/conversionService.js";

export const currentStock = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.lowStock === "true") filter.$expr = { $lte: ["$currentBaseQty", "$item.reorderLevel"] };
  const balances = await StockBalance.find().populate("item", "itemCode name category baseUnit reorderLevel sellingPrice active").sort({ updatedAt: -1 });
  const data = balances
    .filter((balance) => balance.item?.active)
    .filter((balance) => req.query.lowStock !== "true" || balance.currentBaseQty <= balance.item.reorderLevel)
    .map((balance) => ({
      ...balance.toObject(),
      displayQuantity: { value: balance.currentBaseQty, unit: balance.baseUnit },
      reorderStatus: balance.currentBaseQty <= balance.item.reorderLevel ? "LOW" : "OK"
    }));
  res.json({ data });
});

export const stockLedger = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.item) filter.item = req.query.item;
  if (req.query.type) filter.transactionType = req.query.type;
  if (req.query.fromDate || req.query.toDate) {
    filter.createdAt = {};
    if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) filter.createdAt.$lte = new Date(`${req.query.toDate}T23:59:59.999Z`);
  }
  const data = await StockTransaction.find(filter)
    .populate("item", "itemCode name baseUnit")
    .populate("createdBy", "name")
    .sort({ createdAt: -1 })
    .limit(Math.min(1000, Number(req.query.limit) || 200));
  res.json({ data });
});

export const stockSummary = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.itemId);
  if (!item) throw new AppError("Item not found.", 404);
  const balance = await StockBalance.findOne({ item: item._id });
  const displayUnit = req.query.unit || item.baseUnit;
  const quantity = balance ? await fromBaseQuantity({ item, baseQuantity: balance.currentBaseQty, displayUnit }) : 0;
  res.json({ data: { item, currentBaseQty: balance?.currentBaseQty || 0, baseUnit: item.baseUnit, quantity, displayUnit } });
});

