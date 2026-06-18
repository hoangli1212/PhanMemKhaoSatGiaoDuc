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

export async function getSurveyStatsDetail(req, res) {
  const detail = await getSurveyDetailData(req.params.surveyId)

  if (!detail) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  return res.json(detail)
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

async function getSurveyDetailData(surveyId) {
  const surveyRows = await query(
    `SELECT
       s.id,
       s.title,
       s.description,
       s.status,
       s.target_group,
       s.start_date,
       s.end_date,
       u.full_name AS creator_name
     FROM surveys s
     JOIN users u ON u.id = s.creator_id
     WHERE s.id = :surveyId`,
    { surveyId },
  )

  if (surveyRows.length === 0) return null

  const survey = surveyRows[0]
  const studentRows = await query(
    `SELECT id, student_code, full_name, class_name, email
     FROM users
     WHERE role = 'student' AND status = 'active'
     ORDER BY class_name ASC, full_name ASC`,
  )

  const completedRows = await query(
    `SELECT
       u.id,
       u.student_code,
       u.full_name,
       u.class_name,
       u.email,
       MIN(r.submitted_at) AS submitted_at,
       COUNT(r.id) AS submission_count
     FROM responses r
     JOIN users u ON u.id = r.respondent_id
     WHERE r.survey_id = :surveyId AND u.role = 'student'
     GROUP BY u.id
     ORDER BY submitted_at DESC`,
    { surveyId },
  )

  const completedIds = new Set(completedRows.map((student) => Number(student.id)))
  const incompleteRows = studentRows.filter((student) => !completedIds.has(Number(student.id)))

  const questionRows = await query(
    `SELECT id, content, question_type, is_required, sort_order
     FROM questions
     WHERE survey_id = :surveyId
     ORDER BY sort_order ASC, id ASC`,
    { surveyId },
  )

  const optionSummaryRows = await query(
    `SELECT
       q.id AS question_id,
       q.content,
       qo.id AS option_id,
       qo.option_text,
       COUNT(a.id) AS selected_count
     FROM questions q
     JOIN question_options qo ON qo.question_id = q.id
     LEFT JOIN answers a ON a.question_id = q.id AND a.option_id = qo.id
     WHERE q.survey_id = :surveyId
     GROUP BY q.id, qo.id
     ORDER BY q.sort_order ASC, qo.sort_order ASC, qo.id ASC`,
    { surveyId },
  )

  const ratingSummaryRows = await query(
    `SELECT
       q.id AS question_id,
       q.content,
       AVG(a.rating_value) AS average_rating,
       COUNT(a.rating_value) AS rating_count
     FROM questions q
     LEFT JOIN answers a ON a.question_id = q.id
     WHERE q.survey_id = :surveyId AND q.question_type = 'rating'
     GROUP BY q.id
     ORDER BY q.sort_order ASC, q.id ASC`,
    { surveyId },
  )

  const answerRows = await query(
    `SELECT
       r.id AS response_id,
       r.submitted_at,
       u.student_code,
       u.full_name,
       u.class_name,
       q.id AS question_id,
       q.content AS question_content,
       q.question_type,
       qo.option_text,
       a.answer_text,
       a.rating_value
     FROM responses r
     JOIN users u ON u.id = r.respondent_id
     JOIN answers a ON a.response_id = r.id
     JOIN questions q ON q.id = a.question_id
     LEFT JOIN question_options qo ON qo.id = a.option_id
     WHERE r.survey_id = :surveyId
     ORDER BY r.submitted_at DESC, u.full_name ASC, q.sort_order ASC, q.id ASC`,
    { surveyId },
  )

  return {
    survey,
    summary: {
      total_students: studentRows.length,
      completed_students: completedRows.length,
      incomplete_students: incompleteRows.length,
      question_count: questionRows.length,
      response_count: completedRows.reduce((sum, row) => sum + Number(row.submission_count || 0), 0),
    },
    completed_students: completedRows,
    incomplete_students: incompleteRows,
    questions: questionRows,
    choice_summary: optionSummaryRows,
    rating_summary: ratingSummaryRows,
    answers: answerRows,
  }
}

export async function exportSurveyDetailExcel(req, res) {
  const detail = await getSurveyDetailData(req.params.surveyId)

  if (!detail) {
    return res.status(404).json({ message: 'Survey not found' })
  }

  const workbook = xlsx.utils.book_new()
  const overviewRows = [
    { 'Nội dung': 'Tên khảo sát', 'Giá trị': detail.survey.title },
    { 'Nội dung': 'Người tạo', 'Giá trị': detail.survey.creator_name },
    { 'Nội dung': 'Đối tượng', 'Giá trị': detail.survey.target_group },
    { 'Nội dung': 'Trạng thái', 'Giá trị': detail.survey.status },
    { 'Nội dung': 'Tổng sinh viên', 'Giá trị': detail.summary.total_students },
    { 'Nội dung': 'Đã hoàn thành', 'Giá trị': detail.summary.completed_students },
    { 'Nội dung': 'Chưa hoàn thành', 'Giá trị': detail.summary.incomplete_students },
    { 'Nội dung': 'Số câu hỏi', 'Giá trị': detail.summary.question_count },
  ]
  const completedRows = detail.completed_students.map((student) => ({
    'Mã sinh viên': student.student_code,
    'Họ tên': student.full_name,
    'Lớp': student.class_name || '',
    'Email': student.email || '',
    'Thời gian nộp': student.submitted_at,
    'Số lần nộp': student.submission_count,
  }))
  const incompleteRows = detail.incomplete_students.map((student) => ({
    'Mã sinh viên': student.student_code,
    'Họ tên': student.full_name,
    'Lớp': student.class_name || '',
    'Email': student.email || '',
  }))
  const questionRows = detail.questions.map((question) => ({
    'Mã câu hỏi': question.id,
    'Nội dung': question.content,
    'Loại câu hỏi': question.question_type,
    'Bắt buộc': question.is_required ? 'Có' : 'Không',
    'Thứ tự': question.sort_order,
  }))
  const choiceRows = detail.choice_summary.map((item) => ({
    'Mã câu hỏi': item.question_id,
    'Câu hỏi': item.content,
    'Phương án': item.option_text || '',
    'Số lượt chọn': item.selected_count,
  }))
  const ratingRows = detail.rating_summary.map((item) => ({
    'Mã câu hỏi': item.question_id,
    'Câu hỏi': item.content,
    'Điểm trung bình': item.average_rating ? Number(item.average_rating).toFixed(2) : '',
    'Số lượt đánh giá': item.rating_count,
  }))
  const answerRows = detail.answers.map((answer) => ({
    'Mã sinh viên': answer.student_code,
    'Họ tên': answer.full_name,
    'Lớp': answer.class_name || '',
    'Thời gian nộp': answer.submitted_at,
    'Câu hỏi': answer.question_content,
    'Loại câu hỏi': answer.question_type,
    'Câu trả lời': answer.option_text || answer.answer_text || answer.rating_value || '',
  }))

  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(overviewRows), 'Tong quan')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(completedRows), 'Da hoan thanh')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(incompleteRows), 'Chua hoan thanh')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(questionRows), 'Cau hoi')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(choiceRows), 'Thong ke lua chon')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(ratingRows), 'Thong ke diem')
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(answerRows), 'Cau tra loi')

  const buffer = xlsx.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="bao-cao-chi-tiet-khao-sat-${detail.survey.id}.xlsx"`)
  return res.send(buffer)
}
