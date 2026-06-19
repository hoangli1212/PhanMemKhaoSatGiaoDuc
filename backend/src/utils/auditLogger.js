import { query } from '../config/db.js'

export async function writeAuditLog(req, { action, entityType, entityId, description, metadata = null }) {
  if (!req.user) return

  await query(
    `INSERT INTO audit_logs
       (actor_id, actor_name, action, entity_type, entity_id, description, metadata)
     VALUES
       (:actor_id, :actor_name, :action, :entity_type, :entity_id, :description, :metadata)`,
    {
      actor_id: req.user.id,
      actor_name: req.user.full_name,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      description: description || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  )
}
