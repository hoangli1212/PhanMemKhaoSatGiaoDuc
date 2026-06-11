import cors from 'cors'
import express from 'express'

import healthRoutes from './routes/healthRoutes.js'
import surveyRoutes from './routes/surveyRoutes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/health', healthRoutes)
app.use('/api/surveys', surveyRoutes)

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
  })
})

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  })
})

export default app
