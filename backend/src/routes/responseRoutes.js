import { Router } from 'express'

import {
  exportStatsExcel,
  getResponseStats,
  submitResponse,
} from '../controllers/responseController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(asyncHandler(requireAuth))

router.post('/', requireRole('student', 'respondent'), asyncHandler(submitResponse))
router.get('/stats', requireRole('admin', 'survey_creator'), asyncHandler(getResponseStats))
router.get('/stats/export.xlsx', requireRole('admin', 'survey_creator'), asyncHandler(exportStatsExcel))

export default router
