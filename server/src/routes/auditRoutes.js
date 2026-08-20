import { Router } from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const auditRoutes = Router();
auditRoutes.get("/", authenticate, requirePermission("reports:read"), listAuditLogs);

