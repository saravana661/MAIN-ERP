import { AppError } from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, 404));
}

export function errorHandler(error, _req, res, _next) {
  const isValidation = error.name === "ValidationError";
  const isDuplicate = error.code === 11000;
  const status = error.statusCode || (isValidation || isDuplicate ? 400 : 500);
  const message = isDuplicate
    ? `A record already exists with this ${Object.keys(error.keyPattern || {}).join(", ")} value.`
    : isValidation
      ? Object.values(error.errors).map((entry) => entry.message).join(" ")
      : error.message || "An unexpected server error occurred.";

  if (status >= 500) console.error(error);
  res.status(status).json({ error: { message, details: error.details } });
}

