import pool, { query } from '../config/db.js'

const allowedQuestionTypes = new Set(['single_choice', 'multiple_choice', 'rating', 'text'])

function validateQuestionPayload(payload, partial = false) {
  const errors = []

  if (!partial || payload.survey_id !== undefined) {
    if (!payload.survey_id || Number.isNaN(Number(payload.survey_id))) {
      errors.push('survey_id is required')
    }
  }

  if (!partial || payload.content !== undefined) {
    if (!payload.content || String(payload.content).trim().length === 0) {
      errors.push('content is required')
    }
  }

  if (!partial || payload.question_type !== undefined) {
    if (!allowedQuestionTypes.has(payload.question_type)) {
      errors.push('question_type is invalid')
    }
  }

  if (payload.options !== undefined && !Array.isArray(payload.options)) {
    errors.push('options must be an array')
  }

  return errors
}

function normalizeOptions(options = []) {
  return options
    .map((option, index) => ({
      option_text: typeof option === 'string' ? option : option.option_text,
      sort_order: typeof option === 'string' ? index + 1 : option.sort_order || index + 1,
    }))
    .filter((option) => option.option_text && String(option.option_text).trim().length > 0)
}

async function getQuestionWithOptions(id) {
  const rows = await query('SELECT * FROM questions WHERE id = :id', { id })
  if (rows.length === 0) return null

  const options = await query(
    `SELECT id, question_id, option_text, sort_order
     FROM question_options
     WHERE question_id = :id
     ORDER BY sort_order ASC, id ASC`,
    { id },
  )

  return {
    ...rows[0],
    options,
  }
}

export async function getQuestions(req, res) {
  const params = {}
  let whereClause = ''

  if (req.query.survey_id) {
    whereClause = 'WHERE q.survey_id = :survey_id'
    params.survey_id = req.query.survey_id
  }

  const rows = await query(
    `SELECT
       q.id,
       q.survey_id,
       s.title AS survey_title,
       q.content,
       q.question_type,
       q.is_required,
       q.sort_order,
       q.created_at,
       q.updated_at
     FROM questions q
     JOIN surveys s ON s.id = q.survey_id
     ${whereClause}
     ORDER BY q.survey_id ASC, q.sort_order ASC, q.id ASC`,
    params,
  )

  res.json(rows)
}

export async function getQuestionById(req, res) {
  const question = await getQuestionWithOptions(req.params.id)

  if (!question) {
    return res.status(404).json({ message: 'Question not found' })
  }

  return res.json(question)
}

export async function createQuestion(req, res) {
  const errors = validateQuestionPayload(req.body)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid question payload', errors })
  }

  const options = normalizeOptions(req.body.options)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [result] = await connection.execute(
      `INSERT INTO questions
        (survey_id, content, question_type, is_required, sort_order)
       VALUES
        (:survey_id, :content, :question_type, :is_required, :sort_order)`,
      {
        survey_id: Number(req.body.survey_id),
        content: req.body.content.trim(),
        question_type: req.body.question_type,
        is_required: req.body.is_required ?? true,
        sort_order: req.body.sort_order || 0,
      },
    )

    for (const option of options) {
      await connection.execute(
        `INSERT INTO question_options (question_id, option_text, sort_order)
         VALUES (:question_id, :option_text, :sort_order)`,
        {
          question_id: result.insertId,
          option_text: option.option_text.trim(),
          sort_order: option.sort_order,
        },
      )
    }

    await connection.commit()

    const question = await getQuestionWithOptions(result.insertId)
    return res.status(201).json(question)
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function updateQuestion(req, res) {
  const errors = validateQuestionPayload(req.body, true)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid question payload', errors })
  }

  const currentRows = await query('SELECT * FROM questions WHERE id = :id', { id: req.params.id })
  if (currentRows.length === 0) {
    return res.status(404).json({ message: 'Question not found' })
  }

  const current = currentRows[0]
  const options = req.body.options !== undefined ? normalizeOptions(req.body.options) : null
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    await connection.execute(
      `UPDATE questions
       SET
         survey_id = :survey_id,
         content = :content,
         question_type = :question_type,
         is_required = :is_required,
         sort_order = :sort_order
       WHERE id = :id`,
      {
        id: req.params.id,
        survey_id: req.body.survey_id !== undefined ? Number(req.body.survey_id) : current.survey_id,
        content: req.body.content?.trim() ?? current.content,
        question_type: req.body.question_type ?? current.question_type,
        is_required: req.body.is_required ?? current.is_required,
        sort_order: req.body.sort_order ?? current.sort_order,
      },
    )

    if (options) {
      await connection.execute('DELETE FROM question_options WHERE question_id = :question_id', {
        question_id: req.params.id,
      })

      for (const option of options) {
        await connection.execute(
          `INSERT INTO question_options (question_id, option_text, sort_order)
           VALUES (:question_id, :option_text, :sort_order)`,
          {
            question_id: req.params.id,
            option_text: option.option_text.trim(),
            sort_order: option.sort_order,
          },
        )
      }
    }

    await connection.commit()

    const question = await getQuestionWithOptions(req.params.id)
    return res.json(question)
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function deleteQuestion(req, res) {
  const result = await query('DELETE FROM questions WHERE id = :id', { id: req.params.id })

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Question not found' })
  }

  return res.status(204).send()
}
