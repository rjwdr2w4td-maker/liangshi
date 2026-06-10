import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { getDatabase } from '../database/init.js'
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth.js'
import type { User, LoginRequest, LoginResponse, ApiResponse } from '../../shared/types.js'

const router = Router()

router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as LoginRequest

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      } as ApiResponse<never>)
      return
    }

    const db = getDatabase()
    const userRow = db.prepare(`
      SELECT id, username, password, name, role, region_id, phone, email, created_at
      FROM users
      WHERE username = ?
    `).get(username) as {
      id: string
      username: string
      password: string
      name: string
      role: string
      region_id: string
      phone: string | null
      email: string | null
      created_at: string
    } | undefined

    if (!userRow) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      } as ApiResponse<never>)
      return
    }

    const isValidPassword = await bcrypt.compare(password, userRow.password)
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      } as ApiResponse<never>)
      return
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      name: userRow.name,
      role: userRow.role as User['role'],
      regionId: userRow.region_id,
      phone: userRow.phone || undefined,
      email: userRow.email || undefined,
      createdAt: userRow.created_at
    }

    const token = generateToken(user)

    res.json({
      success: true,
      data: {
        user,
        token
      }
    } as ApiResponse<LoginResponse>)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    } as ApiResponse<never>)
  }
})

router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.user
  } as ApiResponse<User>)
})

router.post('/logout', (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    message: '登出成功'
  } as ApiResponse<never>)
})

export default router
