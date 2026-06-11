import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { query } from '../config/db.js'

function sanitizeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
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
      role: user.role,
    },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
  )
}

export async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
    })
  }

  const rows = await query(
    `SELECT id, full_name, email, password_hash, role, stakeholder_group, status
     FROM users
     WHERE email = :email
     LIMIT 1`,
    { email },
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
