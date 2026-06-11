import { Router } from 'express'

import {
  createSurvey,
  deleteSurvey,
  getSurveyById,
  getSurveys,
  updateSurvey,
} from '../controllers/surveyController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(getSurveys))
router.get('/:id', asyncHandler(getSurveyById))
router.post('/', asyncHandler(createSurvey))
router.put('/:id', asyncHandler(updateSurvey))
router.delete('/:id', asyncHandler(deleteSurvey))

export default router
