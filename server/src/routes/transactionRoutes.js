import { Router } from "express";
import {
  cancelInvoice,
  createInvoice,
  createOpeningStock,
  createPurchaseOrder,
  createPurchaseReceipt,
  createStockAdjustment,
  getInvoice,
  listInvoices,
  listPurchaseOrders,
  listPurchaseReceipts,
  updatePurchaseOrderStatus
} from "../controllers/transactionController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const transactionRoutes = Router();
transactionRoutes.use(authenticate);
transactionRoutes.get("/purchase-orders", requirePermission("purchase:read"), listPurchaseOrders);
transactionRoutes.post("/purchase-orders", requirePermission("purchase:write"), createPurchaseOrder);
transactionRoutes.patch("/purchase-orders/:id/status", requirePermission("purchase:approve"), updatePurchaseOrderStatus);
transactionRoutes.get("/purchase-receipts", requirePermission("purchase:read"), listPurchaseReceipts);
transactionRoutes.post("/purchase-receipts", requirePermission("purchase:write"), createPurchaseReceipt);
transactionRoutes.get("/invoices", requirePermission("billing:read"), listInvoices);
transactionRoutes.get("/invoices/:id", requirePermission("billing:read"), getInvoice);
transactionRoutes.post("/invoices", requirePermission("billing:write"), createInvoice);
transactionRoutes.post("/invoices/:id/cancel", requirePermission("billing:cancel"), cancelInvoice);
transactionRoutes.post("/stock-adjustments", requirePermission("inventory:adjust"), createStockAdjustment);
transactionRoutes.post("/opening-stock", requirePermission("inventory:adjust"), createOpeningStock);
