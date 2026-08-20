import { Router } from "express";
import { getSettings, listBillTemplates, saveBillTemplate, updateSetting } from "../controllers/settingsController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const settingsRoutes = Router();
settingsRoutes.use(authenticate);
settingsRoutes.get("/", requirePermission("settings:read"), getSettings);
settingsRoutes.put("/", requirePermission("settings:write"), updateSetting);
settingsRoutes.get("/bill-templates", requirePermission("settings:read"), listBillTemplates);
settingsRoutes.post("/bill-templates", requirePermission("settings:write"), saveBillTemplate);
settingsRoutes.put("/bill-templates/:id", requirePermission("settings:write"), saveBillTemplate);

