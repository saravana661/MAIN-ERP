import { Unit } from "../models/Unit.js";
import { AppError } from "../utils/AppError.js";

export async function toBaseQuantity({ item, quantity, unitCode, session }) {
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    throw new AppError("Quantity must be greater than zero.");
  }
  const unit = await Unit.findOne({ code: String(unitCode).toUpperCase(), active: true }).session(session);
  if (!unit) throw new AppError(`Unit ${unitCode} is not configured or active.`);
  const base = await Unit.findOne({ code: item.baseUnit, active: true }).session(session);
  if (!base) throw new AppError(`Base unit ${item.baseUnit} for ${item.name} is not configured.`);
  if (unit.dimension !== base.dimension) {
    throw new AppError(`${unitCode} cannot be used for ${item.name}; it has a different unit dimension.`);
  }
  return Number(quantity) * unit.conversionToBase / base.conversionToBase;
}

export async function fromBaseQuantity({ item, baseQuantity, displayUnit, session }) {
  const unit = await Unit.findOne({ code: String(displayUnit).toUpperCase(), active: true }).session(session);
  const base = await Unit.findOne({ code: item.baseUnit, active: true }).session(session);
  if (!unit || !base || unit.dimension !== base.dimension) {
    throw new AppError("Invalid unit conversion request.");
  }
  return Number(baseQuantity) * base.conversionToBase / unit.conversionToBase;
}

