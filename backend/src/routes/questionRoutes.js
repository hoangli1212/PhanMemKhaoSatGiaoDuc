import { Router } from 'express'

import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
} from '../controllers/questionController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(asyncHandler(requireAuth))

router.get('/', asyncHandler(getQuestions))
router.get('/:id', asyncHandler(getQuestionById))
router.post('/', requireRole('admin', 'survey_creator'), asyncHandler(createQuestion))
router.put('/:id', requireRole('admin', 'survey_creator'), asyncHandler(updateQuestion))
router.delete('/:id', requireRole('admin', 'survey_creator'), asyncHandler(deleteQuestion))

export default router
