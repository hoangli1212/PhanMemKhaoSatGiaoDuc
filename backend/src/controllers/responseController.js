import pool, { query } from '../config/db.js'
import xlsx from 'xlsx'

function normalizeAnswerRows(responseId, answers = []) {
  const rows = []

  for (const answer of answers) {
    if (!answer.question_id) continue

    if (Array.isArray(answer.option_ids) && answer.option_ids.length > 0) {
      for (const optionId of answer.option_ids) {
        rows.push({
          response_id: responseId,
          question_id: Number(answer.question_id),
          option_id: Number(optionId),
          answer_text: null,
          rating_value: null,
        })
      }
      continue
    }

    rows.push({
      response_id: responseId,
      question_id: Number(answer.question_id),
      option_id: answer.option_id ? Number(answer.option_id) : null,
      answer_text: answer.answer_text || null,
      rating_value: answer.rating_value ? Number(answer.rating_value) : null,
    })
  }

  return rows
}

export async function submitResponse(req, res) {
  const surveyId = Number(req.body.survey_id)
  const answers = Array.isArray(req.body.answers) ? req.body.answers : []

  if (!surveyId || answers.length === 0) {
    return res.status(400).json({ message: 'survey_id and answers are required' })
  }

  const surveyRows = await query('SELECT id, status FROM surveys WHERE id = :id', { id: surveyId })
  if (surveyRows.length === 0) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  if (surveyRows[0].status !== 'published') {
    return res.status(400).json({ message: 'Survey is not open for responses' })
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [responseResult] = await connection.execute(
      `INSERT INTO responses (survey_id, respondent_id)
       VALUES (:survey_id, :respondent_id)`,
      {
        survey_id: surveyId,
        respondent_id: req.user?.id || null,
      },
    )

    const answerRows = normalizeAnswerRows(responseResult.insertId, answers)

    for (const row of answerRows) {
      await connection.execute(
        `INSERT INTO answers
           (response_id, question_id, option_id, answer_text, rating_value)
         VALUES
           (:response_id, :question_id, :option_id, :answer_text, :rating_value)`,
        row,
      )
    }

    await connection.commit()
    return res.status(201).json({
      id: responseResult.insertId,
      survey_id: surveyId,
      answers_saved: answerRows.length,
    })
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

export async function getResponseStats(req, res) {
  const stats = await getStatsData()

  return res.json(stats)
}

async function getStatsData() {
  const surveyRows = await query(
    `SELECT
       s.id,
       s.title,
       s.status,
       s.target_group,
       COUNT(DISTINCT q.id) AS question_count,
       COUNT(DISTINCT r.id) AS response_count
     FROM surveys s
     LEFT JOIN questions q ON q.survey_id = s.id
     LEFT JOIN responses r ON r.survey_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
  )

  const optionRows = await query(
    `SELECT
       q.survey_id,
       q.id AS question_id,
       q.content,
       q.question_type,
       qo.id AS option_id,
       qo.option_text,
       COUNT(a.id) AS selected_count
     FROM questions q
     LEFT JOIN question_options qo ON qo.question_id = q.id
     LEFT JOIN answers a ON a.question_id = q.id AND a.option_id = qo.id
     WHERE q.question_type IN ('single_choice', 'multiple_choice')
     GROUP BY q.id, qo.id
     ORDER BY q.survey_id ASC, q.sort_order ASC, qo.sort_order ASC`,
  )

  const ratingRows = await query(
    `SELECT
       q.survey_id,
       q.id AS question_id,
       q.content,
       AVG(a.rating_value) AS average_rating,
       COUNT(a.rating_value) AS rating_count
     FROM questions q
     LEFT JOIN answers a ON a.question_id = q.id
     WHERE q.question_type = 'rating'
     GROUP BY q.id
     ORDER BY q.survey_id ASC, q.sort_order ASC`,
  )

  return {
    surveys: surveyRows,
    choice_summary: optionRows,
    rating_summary: ratingRows,
  }
}

export async function exportStatsExcel(req, res) {
  const stats = await getStatsData()

  const workbook = xlsx.utils.book_new()
  const surveyRows = stats.surveys.map((survey) => ({
    'Mã khảo sát': survey.id,
    'Tên khảo sát': survey.title,
    'Đối tượng': survey.target_group,
    'Số câu hỏi': survey.question_count,
    'Số phản hồi': survey.response_count,
    'Trạng thái': survey.status,
  }))
  const choiceRows = stats.choice_summary.map((item) => ({
    'Mã khảo sát': item.survey_id,
    'Mã câu hỏi': item.question_id,
    'Nội dung câu hỏi': item.content,
    'Loại câu hỏi': item.question_type,
    'Phương án': item.option_text || '',
    'Số lượt chọn': item.selected_count,
  }))
  const ratingRows = stats.rating_summary.map((item) => ({
    'Mã khảo sát': item.survey_id,
    'Mã câu hỏi': item.question_id,
    'Nội dung câu hỏi': item.content,
    'Điểm trung bình': item.average_rating ? Number(item.average_rating).toFixed(2) : '',
    'Số lượt đánh giá': item.rating_count,
  }))

  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(surveyRows), 'Tong quan')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(choiceRows), 'Lua chon')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(ratingRows), 'Thang diem')

  const buffer = xlsx.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-thong-ke-khao-sat.xlsx"')
  return res.send(buffer)
}
