import { BillTemplate } from "../models/BillTemplate.js";
import { Settings } from "../models/Settings.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../services/auditService.js";

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.find();
  res.json({ data: Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) });
});

export const updateSetting = asyncHandler(async (req, res) => {
  if (!req.body.key) throw new AppError("Setting key is required.");
  const data = await Settings.findOneAndUpdate({ key: req.body.key }, { value: req.body.value, updatedBy: req.user._id }, { new: true, upsert: true, runValidators: true });
  await writeAudit({ actor: req.user._id, action: "UPDATE", entityType: "SETTING", entityId: data._id, metadata: { key: data.key } });
  res.json({ data });
});

export const listBillTemplates = asyncHandler(async (_req, res) => res.json({ data: await BillTemplate.find().sort({ name: 1 }) }));
export const saveBillTemplate = asyncHandler(async (req, res) => {
  const data = req.params.id
    ? await BillTemplate.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true, runValidators: true })
    : await BillTemplate.create({ ...req.body, updatedBy: req.user._id });
  if (!data) throw new AppError("Bill template not found.", 404);
  await writeAudit({ actor: req.user._id, action: req.params.id ? "UPDATE" : "CREATE", entityType: "BILL_TEMPLATE", entityId: data._id });
  res.status(req.params.id ? 200 : 201).json({ data });
});

