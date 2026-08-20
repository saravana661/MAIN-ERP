import { Invoice } from "../models/Invoice.js";
import { PurchaseReceipt } from "../models/PurchaseReceipt.js";
import { StockBalance } from "../models/StockBalance.js";
import { StockTransaction } from "../models/StockTransaction.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const startOfToday = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; };

export const dashboard = asyncHandler(async (_req, res) => {
  const today = startOfToday();
  const [todaySales, todayPurchase, balances, recentTransactions, todayBills] = await Promise.all([
    Invoice.aggregate([{ $match: { invoiceDate: { $gte: today }, status: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
    PurchaseReceipt.aggregate([{ $match: { grnDate: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$grandTotal" } } }]),
    StockBalance.find().populate("item", "itemCode name reorderLevel active"),
    StockTransaction.find().populate("item", "itemCode name baseUnit").sort({ createdAt: -1 }).limit(12),
    Invoice.countDocuments({ invoiceDate: { $gte: today }, status: "COMPLETED" })
  ]);
  const activeBalances = balances.filter((balance) => balance.item?.active);
  const lowStock = activeBalances.filter((balance) => balance.currentBaseQty <= balance.item.reorderLevel);
  res.json({ data: {
    todaySales: todaySales[0]?.total || 0,
    todayPurchase: todayPurchase[0]?.total || 0,
    currentStockValue: activeBalances.reduce((sum, balance) => sum + balance.stockValue, 0),
    lowStockItems: lowStock.length,
    todayBills,
    totalItems: activeBalances.length,
    recentTransactions,
    lowStock: lowStock.slice(0, 10)
  } });
});

