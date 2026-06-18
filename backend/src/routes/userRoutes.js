import { Router } from 'express'

import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(asyncHandler(requireAuth))
router.use(requireRole('admin'))

router.get('/', asyncHandler(getUsers))
router.post('/', asyncHandler(createUser))
router.put('/:id', asyncHandler(updateUser))
router.delete('/:id', asyncHandler(deleteUser))

export default router
