import { Router } from 'express'

import {
  createSurvey,
  deleteSurvey,
  getSurveyForm,
  getSurveyById,
  getSurveys,
  updateSurvey,
} from '../controllers/surveyController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.use(asyncHandler(requireAuth))

router.get('/', asyncHandler(getSurveys))
router.get('/:id/form', asyncHandler(getSurveyForm))
router.get('/:id', asyncHandler(getSurveyById))
router.post('/', requireRole('admin', 'survey_creator'), asyncHandler(createSurvey))
router.put('/:id', requireRole('admin', 'survey_creator'), asyncHandler(updateSurvey))
router.delete('/:id', requireRole('admin', 'survey_creator'), asyncHandler(deleteSurvey))

export default router
