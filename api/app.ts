/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import entityRoutes from './routes/entities.js'
import plotRoutes from './routes/plots.js'
import tasksRoutes from './routes/tasks.js'
import sowingRoutes from './routes/sowing.js'
import harvestRoutes from './routes/harvest.js'
import statisticsRoutes from './routes/statistics.js'
import disasterRoutes from './routes/disaster.js'
import policyRoutes from './routes/policies.js'
import regionRoutes from './routes/regions.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/entities', entityRoutes)
app.use('/api/plots', plotRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/sowing', sowingRoutes)
app.use('/api/harvest', harvestRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/disaster', disasterRoutes)
app.use('/api/policies', policyRoutes)
app.use('/api/regions', regionRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
