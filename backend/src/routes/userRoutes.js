import { Router } from 'express'
import multer from 'multer'

import {
  createUser,
  deleteUser,
  getUsers,
  importStudents,
  updateUser,
} from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

router.use(asyncHandler(requireAuth))
router.use(requireRole('admin'))

router.get('/', asyncHandler(getUsers))
router.post('/', asyncHandler(createUser))
router.post('/import-students', upload.single('file'), asyncHandler(importStudents))
router.put('/:id', asyncHandler(updateUser))
router.delete('/:id', asyncHandler(deleteUser))

export default router
