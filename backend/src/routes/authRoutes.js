import { Router } from 'express'

import { changePassword, login } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.post('/login', asyncHandler(login))
router.put('/change-password', asyncHandler(requireAuth), asyncHandler(changePassword))

export default router
