import { query } from '../config/db.js'

export async function getAuditLogs(req, res) {
  const rows = await query(
    `SELECT
       id,
       actor_id,
       actor_name,
       action,
       entity_type,
       entity_id,
       description,
       metadata,
       created_at
     FROM audit_logs
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
  )

  return res.json(rows)
}
