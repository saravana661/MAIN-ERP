import { StockBalance } from "../models/StockBalance.js";
import { StockTransaction } from "../models/StockTransaction.js";
import { nextSequence } from "../utils/sequence.js";
import { AppError } from "../utils/AppError.js";

const OUTBOUND_TYPES = new Set(["SALE", "PURCHASE_RETURN", "ADJUSTMENT_OUT"]);

export class InventoryService {
  static async postMovement({
    session,
    item,
    transactionType,
    referenceType,
    referenceNumber,
    quantity,
    unit,
    baseQuantity,
    rate = 0,
    costPerBase = rate,
    amount = 0,
    remarks,
    createdBy
  }) {
    const isOutbound = OUTBOUND_TYPES.has(transactionType);
    const signedQuantity = isOutbound ? -Math.abs(baseQuantity) : Math.abs(baseQuantity);
    let balance = await StockBalance.findOne({ item: item._id }).session(session);
    if (!balance) {
      balance = new StockBalance({ item: item._id, baseUnit: item.baseUnit, currentBaseQty: 0 });
    }

    const previousStock = balance.currentBaseQty;
    const resultingStock = previousStock + signedQuantity;
    if (resultingStock < -0.000001) {
      throw new AppError(`Insufficient stock for ${item.name}. Available: ${previousStock} ${item.baseUnit}; required: ${Math.abs(baseQuantity)} ${item.baseUnit}.`, 409);
    }

    if (!isOutbound && costPerBase > 0) {
      const previousValue = previousStock * balance.averageCost;
      balance.averageCost = (previousValue + Math.abs(baseQuantity) * costPerBase) / Math.max(resultingStock, 0.000001);
      balance.lastPurchaseRate = rate;
    }
    balance.currentBaseQty = Math.max(0, resultingStock);
    balance.stockValue = balance.currentBaseQty * balance.averageCost;
    balance.lastUpdatedAt = new Date();
    await balance.save({ session });

    const sequence = await nextSequence("stock-transaction", session);
    const [movement] = await StockTransaction.create(
      [{
        transactionNumber: `STK-${new Date().getFullYear()}-${String(sequence).padStart(6, "0")}`,
        item: item._id,
        transactionType,
        referenceType,
        referenceNumber,
        quantity,
        unit,
        baseQuantity: signedQuantity,
        rate,
        amount,
        previousStock,
        resultingStock: balance.currentBaseQty,
        remarks,
        createdBy
      }],
      { session }
    );
    return { balance, movement };
  }

  static async getCurrentStock(itemId, session) {
    return StockBalance.findOne({ item: itemId }).populate("item", "itemCode name baseUnit reorderLevel").session(session);
  }
}
