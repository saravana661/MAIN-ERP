import { Router } from "express";
import { invoicePdf } from "../controllers/pdfController.js";
import { authenticate, requirePermission } from "../middleware/auth.js";

export const pdfRoutes = Router();
pdfRoutes.get("/invoices/:id", authenticate, requirePermission("billing:read"), invoicePdf);

