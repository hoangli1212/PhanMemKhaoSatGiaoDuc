import { query } from '../config/db.js'
import { writeAuditLog } from '../utils/auditLogger.js'

const allowedSurveyStatuses = new Set(['draft', 'published', 'closed'])
const allowedTargetGroups = new Set(['student', 'lecturer', 'alumni', 'employer', 'all'])

function normalizeNullableDate(value) {
  return value ? new Date(value) : null
}

function isSurveyOpenByDate(survey) {
  const now = new Date()
  const startDate = survey.start_date ? new Date(survey.start_date) : null
  const endDate = survey.end_date ? new Date(survey.end_date) : null
  return (!startDate || startDate <= now) && (!endDate || endDate >= now)
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

  if (payload.start_date && payload.end_date && new Date(payload.end_date) < new Date(payload.start_date)) {
    errors.push('end_date must be greater than or equal to start_date')
  }

  return errors
}

function canManageSurvey(user, survey) {
  return user?.role === 'admin' || Number(survey.creator_id) === Number(user?.id)
}

export async function getSurveys(req, res) {
  const params = {}
  const whereParts = []

  if (req.user?.role === 'survey_creator') {
    whereParts.push('s.creator_id = :creator_id')
    params.creator_id = req.user.id
  }

  if (['student', 'respondent'].includes(req.user?.role)) {
    whereParts.push("s.status = 'published'")
    whereParts.push('(s.target_group = :target_group OR s.target_group = "all")')
    whereParts.push('(s.start_date IS NULL OR s.start_date <= NOW())')
    whereParts.push('(s.end_date IS NULL OR s.end_date >= NOW())')
    params.target_group = req.user.stakeholder_group || 'student'
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
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
       CASE WHEN EXISTS (
         SELECT 1 FROM responses r
         WHERE r.survey_id = s.id AND r.respondent_id = :current_user_id
       ) THEN 1 ELSE 0 END AS is_completed,
       s.created_at,
       s.updated_at
     FROM surveys s
     JOIN users u ON u.id = s.creator_id
     ${whereClause}
     ORDER BY s.created_at DESC`,
    {
      ...params,
      current_user_id: req.user?.id || 0,
    },
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

  if (req.user?.role === 'survey_creator' && !canManageSurvey(req.user, rows[0])) {
    return res.status(403).json({ message: 'Permission denied' })
  }

  return res.json(rows[0])
}

export async function getSurveyForm(req, res) {
  const surveyRows = await query(
    `SELECT
       s.id,
       s.title,
       s.description,
       s.target_group,
       s.start_date,
       s.end_date,
       s.status
     FROM surveys s
     WHERE s.id = :id`,
    { id: req.params.id },
  )

  if (surveyRows.length === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  const survey = surveyRows[0]
  if (['student', 'respondent'].includes(req.user?.role)) {
    const targetGroup = req.user.stakeholder_group || 'student'
    if (survey.status !== 'published' || ![targetGroup, 'all'].includes(survey.target_group)) {
      return res.status(403).json({ message: 'Survey is not available for this user' })
    }
    if (!isSurveyOpenByDate(survey)) {
      return res.status(403).json({ message: 'Survey is not open at this time' })
    }
  }

  const questionRows = await query(
    `SELECT id, survey_id, content, question_type, is_required, sort_order
     FROM questions
     WHERE survey_id = :id
     ORDER BY sort_order ASC, id ASC`,
    { id: req.params.id },
  )

  const optionRows = await query(
    `SELECT qo.id, qo.question_id, qo.option_text, qo.sort_order
     FROM question_options qo
     JOIN questions q ON q.id = qo.question_id
     WHERE q.survey_id = :id
     ORDER BY qo.sort_order ASC, qo.id ASC`,
    { id: req.params.id },
  )

  const questions = questionRows.map((question) => ({
    ...question,
    options: optionRows.filter((option) => option.question_id === question.id),
  }))

  return res.json({
    ...surveyRows[0],
    questions,
  })
}

export async function createSurvey(req, res) {
  const payload = {
    ...req.body,
    creator_id: req.user.id,
  }
  const errors = validateSurveyPayload(payload)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid survey payload', errors })
  }

  if (payload.status === 'published') {
    return res.status(400).json({
      message: 'Survey must be created as draft before adding questions',
    })
  }

  const result = await query(
    `INSERT INTO surveys
      (title, description, creator_id, target_group, start_date, end_date, status)
     VALUES
      (:title, :description, :creator_id, :target_group, :start_date, :end_date, :status)`,
    {
      title: payload.title.trim(),
      description: payload.description || null,
      creator_id: Number(payload.creator_id),
      target_group: payload.target_group || 'all',
      start_date: normalizeNullableDate(payload.start_date),
      end_date: normalizeNullableDate(payload.end_date),
      status: payload.status || 'draft',
    },
  )

  const rows = await query('SELECT * FROM surveys WHERE id = :id', { id: result.insertId })
  await writeAuditLog(req, {
    action: 'create',
    entityType: 'survey',
    entityId: result.insertId,
    description: `Created survey: ${payload.title}`,
  })
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
  if (!canManageSurvey(req.user, current)) {
    return res.status(403).json({ message: 'Permission denied' })
  }

  if (req.body.status === 'published') {
    const questionRows = await query('SELECT COUNT(*) AS count FROM questions WHERE survey_id = :id', { id: req.params.id })
    if (Number(questionRows[0].count) === 0) {
      return res.status(400).json({ message: 'Survey must have at least one question before publishing' })
    }
  }

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
      creator_id: current.creator_id,
      target_group: req.body.target_group ?? current.target_group,
      start_date: req.body.start_date !== undefined ? normalizeNullableDate(req.body.start_date) : current.start_date,
      end_date: req.body.end_date !== undefined ? normalizeNullableDate(req.body.end_date) : current.end_date,
      status: req.body.status ?? current.status,
    },
  )

  const rows = await query('SELECT * FROM surveys WHERE id = :id', { id: req.params.id })
  await writeAuditLog(req, {
    action: 'update',
    entityType: 'survey',
    entityId: req.params.id,
    description: `Updated survey: ${rows[0].title}`,
  })
  return res.json(rows[0])
}

export async function deleteSurvey(req, res) {
  const currentRows = await query('SELECT * FROM surveys WHERE id = :id', { id: req.params.id })
  if (currentRows.length === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  if (!canManageSurvey(req.user, currentRows[0])) {
    return res.status(403).json({ message: 'Permission denied' })
  }

  const result = await query('DELETE FROM surveys WHERE id = :id', { id: req.params.id })

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  await writeAuditLog(req, {
    action: 'delete',
    entityType: 'survey',
    entityId: req.params.id,
    description: `Deleted survey: ${currentRows[0].title}`,
  })
  return res.status(204).send()
}
