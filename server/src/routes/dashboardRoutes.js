import { Router } from "express";
import { dashboard } from "../controllers/dashboardController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const dashboardRoutes = Router();
dashboardRoutes.get("/", authenticate, requirePermission("dashboard:read"), dashboard);

