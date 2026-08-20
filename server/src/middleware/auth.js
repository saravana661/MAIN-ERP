import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) throw new AppError("Authentication is required.", 401);

  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.sub).populate("role");
  if (!user || !user.active) throw new AppError("Your account is unavailable.", 401);
  req.user = user;
  next();
});

export function requirePermission(...permissions) {
  return (req, _res, next) => {
    const granted = req.user.role?.permissions || [];
    if (granted.includes("*") || permissions.some((permission) => granted.includes(permission))) {
      return next();
    }
    return next(new AppError("You do not have permission to perform this action.", 403));
  };
}

