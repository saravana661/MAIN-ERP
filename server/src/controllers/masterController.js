import bcrypt from "bcryptjs";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Packaging } from "../models/Packaging.js";
import { Role } from "../models/Role.js";
import { Unit } from "../models/Unit.js";
import { User } from "../models/User.js";
import { Vendor } from "../models/Vendor.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../services/auditService.js";

const masters = {
  categories: { model: Category, search: ["name", "description"] },
  units: { model: Unit, search: ["code", "name"] },
  items: { model: Item, search: ["itemCode", "name", "barcode", "category"], populate: "createdBy updatedBy" },
  packaging: { model: Packaging, search: ["packageName", "barcode"], populate: "item" },
  vendors: { model: Vendor, search: ["vendorCode", "name", "mobile", "gstNumber"], populate: "createdBy updatedBy" },
  roles: { model: Role, search: ["name", "description"] },
  users: { model: User, search: ["name", "email"], populate: "role" }
};

function getMaster(key) {
  const resource = masters[key];
  if (!resource) throw new AppError("Unknown master resource.", 404);
  return resource;
}

function searchQuery(fields, search) {
  if (!search) return {};
  const regex = new RegExp(search, "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

export const listMasters = asyncHandler(async (req, res) => {
  const resource = getMaster(req.params.resource);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const filter = searchQuery(resource.search, req.query.search);
  if (req.query.active !== undefined && req.params.resource !== "roles" && req.params.resource !== "users") {
    filter.active = req.query.active === "true";
  }
  let query = resource.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  if (resource.populate) query = query.populate(resource.populate);
  const [data, total] = await Promise.all([query, resource.model.countDocuments(filter)]);
  res.json({ data, page, limit, total });
});

export const getMasterById = asyncHandler(async (req, res) => {
  const resource = getMaster(req.params.resource);
  let query = resource.model.findById(req.params.id);
  if (resource.populate) query = query.populate(resource.populate);
  const data = await query;
  if (!data) throw new AppError("Record not found.", 404);
  res.json({ data });
});

function preparePayload(resourceName, body, userId, existing) {
  const payload = { ...body };
  if (["categories", "items", "vendors"].includes(resourceName)) {
    if (existing) payload.updatedBy = userId;
    else payload.createdBy = userId;
  }
  if (resourceName === "packaging") {
    payload.packageUnit = String(payload.packageUnit || "PACKET").toUpperCase();
  }
  if (resourceName === "users") {
    delete payload.passwordHash;
  }
  return payload;
}

export const createMaster = asyncHandler(async (req, res) => {
  const resourceName = req.params.resource;
  const resource = getMaster(resourceName);
  const payload = preparePayload(resourceName, req.body, req.user._id);
  if (resourceName === "users") {
    if (!payload.password) throw new AppError("A password is required for a new user.");
    payload.passwordHash = await bcrypt.hash(payload.password, 12);
    delete payload.password;
  }
  const data = await resource.model.create(payload);
  await writeAudit({ actor: req.user._id, action: "CREATE", entityType: resourceName, entityId: data._id });
  res.status(201).json({ data: resource.populate ? await data.populate(resource.populate) : data });
});

export const updateMaster = asyncHandler(async (req, res) => {
  const resourceName = req.params.resource;
  const resource = getMaster(resourceName);
  const existing = await resource.model.findById(req.params.id);
  if (!existing) throw new AppError("Record not found.", 404);
  const payload = preparePayload(resourceName, req.body, req.user._id, existing);
  if (resourceName === "users") {
    if (payload.password) payload.passwordHash = await bcrypt.hash(payload.password, 12);
    delete payload.password;
  }
  const data = await resource.model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  await writeAudit({ actor: req.user._id, action: "UPDATE", entityType: resourceName, entityId: data._id });
  res.json({ data: resource.populate ? await data.populate(resource.populate) : data });
});

export const deactivateMaster = asyncHandler(async (req, res) => {
  const resource = getMaster(req.params.resource);
  if (["roles", "users"].includes(req.params.resource)) throw new AppError("Use the update endpoint to change this record.");
  const data = await resource.model.findByIdAndUpdate(req.params.id, { active: false, updatedBy: req.user._id }, { new: true });
  if (!data) throw new AppError("Record not found.", 404);
  await writeAudit({ actor: req.user._id, action: "DEACTIVATE", entityType: req.params.resource, entityId: data._id });
  res.json({ data });
});

