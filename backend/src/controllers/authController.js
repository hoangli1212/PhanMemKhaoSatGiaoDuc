import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { query } from '../config/db.js'

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
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      student_code: user.student_code,
      role: user.role,
    },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
  )
}

export async function login(req, res) {
  const { email, username, password } = req.body
  const identifier = email || username

  if (!identifier || !password) {
    return res.status(400).json({
      message: 'Username/email and password are required',
    })
  }

  const rows = await query(
    `SELECT id, student_code, full_name, class_name, email, password_hash, role, stakeholder_group, status
     FROM users
     WHERE email = :identifier OR student_code = :identifier
     LIMIT 1`,
    { identifier },
  )

  if (rows.length === 0) {
    return res.status(401).json({
      message: 'Invalid email or password',
    })
  }

  const user = rows[0]

  if (user.status !== 'active') {
    return res.status(403).json({
      message: 'Account is locked',
    })
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash)

  if (!passwordMatches) {
    return res.status(401).json({
      message: 'Invalid email or password',
    })
  }

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user),
  })
}

export async function changePassword(req, res) {
  const { current_password, new_password } = req.body

  if (!current_password || !new_password || String(new_password).length < 6) {
    return res.status(400).json({
      message: 'Current password and a new password of at least 6 characters are required',
    })
  }

  const rows = await query(
    `SELECT id, password_hash
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id: req.user.id },
  )

  if (rows.length === 0) {
    return res.status(404).json({ message: 'User not found' })
  }

  const passwordMatches = await bcrypt.compare(current_password, rows[0].password_hash)
  if (!passwordMatches) {
    return res.status(400).json({ message: 'Current password is incorrect' })
  }

  const passwordHash = await bcrypt.hash(new_password, 10)
  await query(
    `UPDATE users
     SET password_hash = :passwordHash
     WHERE id = :id`,
    {
      id: req.user.id,
      passwordHash,
    },
  )

  return res.json({ message: 'Password changed successfully' })
}
