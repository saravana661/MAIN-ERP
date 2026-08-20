import { Router } from "express";
import { currentStock, stockLedger, stockSummary } from "../controllers/inventoryController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const inventoryRoutes = Router();
inventoryRoutes.use(authenticate, requirePermission("inventory:read"));
inventoryRoutes.get("/stock", currentStock);
inventoryRoutes.get("/ledger", stockLedger);
inventoryRoutes.get("/stock/:itemId", stockSummary);

