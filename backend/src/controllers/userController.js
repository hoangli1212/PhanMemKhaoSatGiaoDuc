import bcrypt from 'bcryptjs'
import xlsx from 'xlsx'

import { query } from '../config/db.js'

const allowedRoles = new Set(['admin', 'survey_creator', 'respondent', 'student'])
const allowedStatuses = new Set(['active', 'locked'])
const allowedGroups = new Set(['student', 'lecturer', 'alumni', 'employer', 'staff'])

function sanitizeUser(user) {
  return {
    id: user.id,
    student_code: user.student_code,
    full_name: user.full_name,
    class_name: user.class_name,
    email: user.email,
    role: user.role,
    stakeholder_group: user.stakeholder_group,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

function validateUserPayload(payload, partial = false) {
  const errors = []

  if (!partial || payload.full_name !== undefined) {
    if (!payload.full_name || String(payload.full_name).trim().length === 0) {
      errors.push('full_name is required')
    }
  }

  if (!partial || payload.email !== undefined) {
    if (!payload.email || !String(payload.email).includes('@')) {
      errors.push('valid email is required')
    }
  }

  if (!partial || payload.role !== undefined) {
    if (!allowedRoles.has(payload.role)) {
      errors.push('role is invalid')
    }
  }

  if (payload.status !== undefined && !allowedStatuses.has(payload.status)) {
    errors.push('status is invalid')
  }

  if (payload.stakeholder_group !== undefined && payload.stakeholder_group !== null && !allowedGroups.has(payload.stakeholder_group)) {
    errors.push('stakeholder_group is invalid')
  }

  if (!partial && (!payload.password || String(payload.password).length < 6)) {
    errors.push('password must be at least 6 characters')
  }

  return errors
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function getCell(row, names) {
  for (const name of names) {
    const normalizedName = normalizeHeader(name)
    const foundKey = Object.keys(row).find((key) => normalizeHeader(key) === normalizedName)
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return String(row[foundKey]).trim()
    }
  }
  return ''
}

function getRawCell(row, names) {
  const normalizedNames = names.map(normalizeHeader)
  const foundKey = Object.keys(row).find((key) => normalizedNames.includes(normalizeHeader(key)))
  return foundKey ? row[foundKey] : ''
}

function normalizeExcelDate(value) {
  if (!value) return ''

  if (value instanceof Date) {
    return value.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value)
    if (parsed) {
      return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
    }
  }

  return String(value).trim()
}

function rowToStudent(row, index) {
  const studentCode = getCell(row, ['ma_sinh_vien', 'ma sinh vien', 'mã sinh viên', 'm? sinh vi?n', 'masv', 'mssv', 'student_code'])
  const firstName = getCell(row, ['ho', 'họ', 'h?', 'last_name'])
  const lastName = getCell(row, ['ten', 'tên', 't?n', 'first_name'])
  const fullName = getCell(row, ['ho_ten', 'ho ten', 'họ tên', 'h? ten', 'full_name']) || `${firstName} ${lastName}`.trim()
  const className = getCell(row, ['lop', 'lớp', 'l?p', 'class', 'class_name'])
  const birthDate = normalizeExcelDate(getRawCell(row, ['ngay_sinh', 'ngay sinh', 'ngày sinh', 'ng?y sinh', 'birth_date', 'birthday']))

  const errors = []
  if (!studentCode) errors.push('missing student_code')
  if (!fullName) errors.push('missing full_name')
  if (!birthDate) errors.push('missing birth_date')

  return {
    row_number: index + 2,
    student_code: studentCode,
    full_name: fullName,
    class_name: className || null,
    email: `${studentCode}@student.local`,
    password: birthDate,
    errors,
  }
}

export async function getUsers(req, res) {
  const rows = await query(
    `SELECT id, student_code, full_name, class_name, email, role, stakeholder_group, status, created_at, updated_at
     FROM users
     ORDER BY created_at DESC, id DESC`,
  )

  return res.json(rows.map(sanitizeUser))
}

export async function createUser(req, res) {
  const errors = validateUserPayload(req.body)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid user payload', errors })
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10)
  const result = await query(
    `INSERT INTO users
       (student_code, full_name, class_name, email, password_hash, role, stakeholder_group, status)
     VALUES
       (:student_code, :full_name, :class_name, :email, :password_hash, :role, :stakeholder_group, :status)`,
    {
      student_code: req.body.student_code || null,
      full_name: req.body.full_name.trim(),
      class_name: req.body.class_name || null,
      email: req.body.email.trim(),
      password_hash: passwordHash,
      role: req.body.role,
      stakeholder_group: req.body.stakeholder_group || null,
      status: req.body.status || 'active',
    },
  )

  const rows = await query(
    `SELECT id, student_code, full_name, class_name, email, role, stakeholder_group, status, created_at, updated_at
     FROM users WHERE id = :id`,
    { id: result.insertId },
  )
  return res.status(201).json(sanitizeUser(rows[0]))
}

export async function updateUser(req, res) {
  const errors = validateUserPayload(req.body, true)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Invalid user payload', errors })
  }

  const rows = await query('SELECT * FROM users WHERE id = :id', { id: req.params.id })
  if (rows.length === 0) {
    return res.status(404).json({ message: 'User not found' })
  }

  const current = rows[0]
  const passwordHash = req.body.password ? await bcrypt.hash(req.body.password, 10) : current.password_hash

  await query(
    `UPDATE users
     SET
       student_code = :student_code,
       full_name = :full_name,
       class_name = :class_name,
       email = :email,
       password_hash = :password_hash,
       role = :role,
       stakeholder_group = :stakeholder_group,
       status = :status
     WHERE id = :id`,
    {
      id: req.params.id,
      student_code: req.body.student_code !== undefined ? req.body.student_code || null : current.student_code,
      full_name: req.body.full_name?.trim() ?? current.full_name,
      class_name: req.body.class_name !== undefined ? req.body.class_name || null : current.class_name,
      email: req.body.email?.trim() ?? current.email,
      password_hash: passwordHash,
      role: req.body.role ?? current.role,
      stakeholder_group: req.body.stakeholder_group !== undefined ? req.body.stakeholder_group || null : current.stakeholder_group,
      status: req.body.status ?? current.status,
    },
  )

  const updated = await query(
    `SELECT id, student_code, full_name, class_name, email, role, stakeholder_group, status, created_at, updated_at
     FROM users WHERE id = :id`,
    { id: req.params.id },
  )
  return res.json(sanitizeUser(updated[0]))
}

export async function deleteUser(req, res) {
  const result = await query('DELETE FROM users WHERE id = :id', { id: req.params.id })

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.status(204).send()
}

export async function importStudents(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Excel file is required' })
  }

  const workbook = xlsx.read(req.file.buffer, {
    type: 'buffer',
    cellDates: true,
  })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return res.status(400).json({ message: 'Excel file does not contain any sheet' })
  }

  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  const students = rows.map(rowToStudent)
  const invalidRows = students.filter((student) => student.errors.length > 0)
  const validStudents = students.filter((student) => student.errors.length === 0)
  let created = 0
  let updated = 0
  const imported = []

  for (const student of validStudents) {
    const passwordHash = await bcrypt.hash(student.password, 10)
    const existingRows = await query(
      `SELECT id FROM users
       WHERE student_code = :student_code OR email = :email
       LIMIT 1`,
      {
        student_code: student.student_code,
        email: student.email,
      },
    )

    if (existingRows.length > 0) {
      await query(
        `UPDATE users
         SET full_name = :full_name,
             class_name = :class_name,
             password_hash = :password_hash,
             role = 'student',
             stakeholder_group = 'student',
             status = 'active'
         WHERE id = :id`,
        {
          id: existingRows[0].id,
          full_name: student.full_name,
          class_name: student.class_name,
          password_hash: passwordHash,
        },
      )
      updated += 1
    } else {
      await query(
        `INSERT INTO users
           (student_code, full_name, class_name, email, password_hash, role, stakeholder_group, status)
         VALUES
           (:student_code, :full_name, :class_name, :email, :password_hash, 'student', 'student', 'active')`,
        {
          student_code: student.student_code,
          full_name: student.full_name,
          class_name: student.class_name,
          email: student.email,
          password_hash: passwordHash,
        },
      )
      created += 1
    }

    imported.push({
      row_number: student.row_number,
      student_code: student.student_code,
      full_name: student.full_name,
      class_name: student.class_name,
    })
  }

  return res.status(201).json({
    total_rows: students.length,
    imported_count: imported.length,
    created,
    updated,
    skipped: invalidRows.length,
    imported,
    invalid_rows: invalidRows.map((student) => ({
      row_number: student.row_number,
      student_code: student.student_code,
      full_name: student.full_name,
      errors: student.errors,
    })),
  })
}
