import { AuditLog } from "../models/AuditLog.js";

export function writeAudit({ actor, action, entityType, entityId, metadata, session }) {
  return AuditLog.create([{ actor, action, entityType, entityId: String(entityId), metadata }], { session });
}

