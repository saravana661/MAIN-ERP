import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { BillTemplate } from "../models/BillTemplate.js";
import { Role } from "../models/Role.js";
import { Settings } from "../models/Settings.js";
import { Unit } from "../models/Unit.js";
import { User } from "../models/User.js";

const roles = [
  { name: "ADMIN", description: "Full system access", permissions: ["*"] },
  { name: "PURCHASE_USER", description: "Manage purchasing and master data", permissions: ["dashboard:read", "masters:read", "masters:write", "purchase:read", "purchase:write", "reports:read"] },
  { name: "BILLING_USER", description: "Create and view sales invoices", permissions: ["dashboard:read", "masters:read", "billing:read", "billing:write", "settings:read"] },
  { name: "INVENTORY_USER", description: "View and adjust inventory", permissions: ["dashboard:read", "masters:read", "inventory:read", "inventory:adjust", "reports:read"] },
  { name: "REPORT_USER", description: "Read dashboards and reports", permissions: ["dashboard:read", "reports:read", "inventory:read"] }
];
const units = [
  { code: "GRAM", name: "Gram", dimension: "WEIGHT", baseUnit: true, conversionToBase: 1 },
  { code: "KG", name: "Kilogram", dimension: "WEIGHT", conversionToBase: 1000 },
  { code: "ML", name: "Millilitre", dimension: "VOLUME", baseUnit: true, conversionToBase: 1 },
  { code: "LITER", name: "Litre", dimension: "VOLUME", conversionToBase: 1000 },
  { code: "PIECE", name: "Piece", dimension: "COUNT", baseUnit: true, conversionToBase: 1 },
  { code: "PACKET", name: "Packet", dimension: "COUNT", conversionToBase: 1 },
  { code: "BOX", name: "Box", dimension: "COUNT", conversionToBase: 1 },
  { code: "BOTTLE", name: "Bottle", dimension: "COUNT", conversionToBase: 1 }
];

try {
  await connectDatabase();
  for (const role of roles) await Role.findOneAndUpdate({ name: role.name }, role, { upsert: true, new: true });
  for (const unit of units) await Unit.findOneAndUpdate({ code: unit.code }, unit, { upsert: true, new: true, setDefaultsOnInsert: true });
  const adminRole = await Role.findOne({ name: "ADMIN" });
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name: process.env.SEED_ADMIN_NAME || "System Administrator", email, passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "ChangeMe!123", 12), role: adminRole._id });
  }
  await Settings.findOneAndUpdate({ key: "company" }, { value: { name: "Main ERP Grocery Wholesale", address: "", phone: "", email: "", gstNumber: "" } }, { upsert: true, new: true });
  await BillTemplate.findOneAndUpdate({ name: "Default A4 Invoice" }, { name: "Default A4 Invoice", pageFormat: "A4", header: "TAX INVOICE", footer: "Thank you for your business.", showTax: true, showDiscount: true, showPayment: true, active: true }, { upsert: true, new: true });
  console.info("Seed complete.");
} finally {
  await mongoose.disconnect();
}
