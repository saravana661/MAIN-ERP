import { Router } from "express";
import { createMaster, deactivateMaster, getMasterById, listMasters, updateMaster } from "../controllers/masterController.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../utils/AppError.js";

const administrationResources = new Set(["users", "roles"]);

function permit(action) {
  return (req, _res, next) => {
    const resource = req.params.resource;
    const needed = `${administrationResources.has(resource) ? "users" : "masters"}:${action}`;
    const permissions = req.user.role?.permissions || [];
    if (permissions.includes("*") || permissions.includes(needed)) return next();
    return next(new AppError("You do not have permission to perform this action.", 403));
  };
}

export const masterRoutes = Router();
masterRoutes.use(authenticate);
masterRoutes.get("/:resource", permit("read"), listMasters);
masterRoutes.get("/:resource/:id", permit("read"), getMasterById);
masterRoutes.post("/:resource", permit("write"), createMaster);
masterRoutes.put("/:resource/:id", permit("write"), updateMaster);
masterRoutes.delete("/:resource/:id", permit("write"), deactivateMaster);

