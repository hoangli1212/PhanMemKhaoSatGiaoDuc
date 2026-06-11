import { query } from '../config/db.js'

const allowedSurveyStatuses = new Set(['draft', 'published', 'closed'])
const allowedTargetGroups = new Set(['student', 'lecturer', 'alumni', 'employer', 'all'])

function normalizeNullableDate(value) {
  return value ? new Date(value) : null
}

function validateSurveyPayload(payload, partial = false) {
  const errors = []

  if (!partial || payload.title !== undefined) {
    if (!payload.title || String(payload.title).trim().length === 0) {
      errors.push('title is required')
    }
  }

  if (!partial || payload.creator_id !== undefined) {
    if (!payload.creator_id || Number.isNaN(Number(payload.creator_id))) {
      errors.push('creator_id is required')
    }
  }

  if (payload.target_group !== undefined && !allowedTargetGroups.has(payload.target_group)) {
    errors.push('target_group is invalid')
  }

  if (payload.status !== undefined && !allowedSurveyStatuses.has(payload.status)) {
    errors.push('status is invalid')
  }

  return errors
}

export async function getSurveys(req, res) {
  const rows = await query(
    `SELECT
       s.id,
       s.title,
       s.description,
       s.creator_id,
       u.full_name AS creator_name,
       s.target_group,
       s.start_date,
       s.end_date,
       s.status,
       s.created_at,
       s.updated_at
     FROM surveys s
     JOIN users u ON u.id = s.creator_id
     ORDER BY s.created_at DESC`,
  )

  res.json(rows)
}

export async function getSurveyById(req, res) {
  const rows = await query(
    `SELECT
       s.id,
       s.title,
       s.description,
       s.creator_id,
       u.full_name AS creator_name,
       s.target_group,
       s.start_date,
       s.end_date,
       s.status,
       s.created_at,
       s.updated_at
     FROM surveys s
     JOIN users u ON u.id = s.creator_id
     WHERE s.id = :id`,
    { id: req.params.id },
  )

  if (rows.length === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  return res.json(rows[0])
}

export async function createSurvey(req, res) {
  const errors = validateSurveyPayload(req.body)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid survey payload', errors })
  }

  const result = await query(
    `INSERT INTO surveys
      (title, description, creator_id, target_group, start_date, end_date, status)
     VALUES
      (:title, :description, :creator_id, :target_group, :start_date, :end_date, :status)`,
    {
      title: req.body.title.trim(),
      description: req.body.description || null,
      creator_id: Number(req.body.creator_id),
      target_group: req.body.target_group || 'all',
      start_date: normalizeNullableDate(req.body.start_date),
      end_date: normalizeNullableDate(req.body.end_date),
      status: req.body.status || 'draft',
    },
  )

  const rows = await query('SELECT * FROM surveys WHERE id = :id', { id: result.insertId })
  return res.status(201).json(rows[0])
}

export async function updateSurvey(req, res) {
  const errors = validateSurveyPayload(req.body, true)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid survey payload', errors })
  }

  const currentRows = await query('SELECT * FROM surveys WHERE id = :id', { id: req.params.id })
  if (currentRows.length === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  const current = currentRows[0]
  await query(
    `UPDATE surveys
     SET
       title = :title,
       description = :description,
       creator_id = :creator_id,
       target_group = :target_group,
       start_date = :start_date,
       end_date = :end_date,
       status = :status
     WHERE id = :id`,
    {
      id: req.params.id,
      title: req.body.title?.trim() ?? current.title,
      description: req.body.description ?? current.description,
      creator_id: req.body.creator_id !== undefined ? Number(req.body.creator_id) : current.creator_id,
      target_group: req.body.target_group ?? current.target_group,
      start_date: req.body.start_date !== undefined ? normalizeNullableDate(req.body.start_date) : current.start_date,
      end_date: req.body.end_date !== undefined ? normalizeNullableDate(req.body.end_date) : current.end_date,
      status: req.body.status ?? current.status,
    },
  )

  const rows = await query('SELECT * FROM surveys WHERE id = :id', { id: req.params.id })
  return res.json(rows[0])
}

export async function deleteSurvey(req, res) {
  const result = await query('DELETE FROM surveys WHERE id = :id', { id: req.params.id })

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  return res.status(204).send()
}
