import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { User } from '../../shared/types.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthRequest extends Request {
  user?: User
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User
    req.user = decoded
    next()
  } catch (error) {
    res.status(403).json({
      success: false,
      error: '无效或过期的令牌'
    })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证'
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: '权限不足'
      })
      return
    }

    next()
  }
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      regionId: user.regionId,
      phone: user.phone,
      email: user.email,
      createdAt: user.createdAt
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}
