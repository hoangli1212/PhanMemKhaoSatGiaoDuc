import { Router } from 'express'

import { checkDatabaseConnection } from '../config/db.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'edu-survey-backend',
  })
})

router.get(
  '/db',
  asyncHandler(async (req, res) => {
    const connected = await checkDatabaseConnection()

    res.json({
      status: connected ? 'ok' : 'error',
      database: connected ? 'connected' : 'disconnected',
    })
  }),
)

export default router
