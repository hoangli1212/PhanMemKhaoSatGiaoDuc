import jwt from 'jsonwebtoken'

import { query } from '../config/db.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me')
    const rows = await query(
      `SELECT id, student_code, full_name, class_name, email, role, stakeholder_group, status
       FROM users
       WHERE id = :id
       LIMIT 1`,
      { id: payload.sub },
    )

    if (rows.length === 0 || rows[0].status !== 'active') {
      return res.status(401).json({ message: 'User is not active' })
    }

    req.user = rows[0]
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' })
    }

    return next()
  }
}
