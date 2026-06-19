import { Router } from 'express'

import { getAuditLogs } from '../controllers/auditController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(asyncHandler(requireAuth))
router.use(requireRole('admin'))

router.get('/', asyncHandler(getAuditLogs))

export default router
