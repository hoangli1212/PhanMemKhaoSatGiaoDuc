import { Router } from 'express'

import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
} from '../controllers/questionController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(getQuestions))
router.get('/:id', asyncHandler(getQuestionById))
router.post('/', asyncHandler(createQuestion))
router.put('/:id', asyncHandler(updateQuestion))
router.delete('/:id', asyncHandler(deleteQuestion))

export default router
