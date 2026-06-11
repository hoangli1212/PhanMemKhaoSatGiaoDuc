import cors from 'cors'
import express from 'express'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'edu-survey-backend',
  })
})

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
