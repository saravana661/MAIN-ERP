import { Router } from "express";
import { expenseReport, salesReport, stockReport, transactionReport, vendorReport } from "../controllers/reportController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const reportRoutes = Router();
reportRoutes.use(authenticate, requirePermission("reports:read"));
reportRoutes.get("/expense", expenseReport);
reportRoutes.get("/vendor", vendorReport);
reportRoutes.get("/transactions", transactionReport);
reportRoutes.get("/stock", stockReport);
reportRoutes.get("/sales", salesReport);

