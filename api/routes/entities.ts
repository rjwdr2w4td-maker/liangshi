import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init.js'
import type { Entity, EntityType, ApiResponse, CropType } from '../../shared/types.js'

const router = Router()

function safeJsonParse<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

function mapRowToEntity(row: any): Entity {
  return {
    id: row.id,
    name: row.name,
    type: row.type as EntityType,
    contactPerson: row.contact_person,
    phone: row.phone,
    regionId: row.region_id || undefined,
    age: row.age ?? undefined,
    gender: row.gender as 'male' | 'female' | undefined,
    idCard: row.id_card ?? undefined,
    address: row.address ?? undefined,
    email: row.email ?? undefined,
    remark: row.remark ?? undefined,
    plotIds: row.plot_ids ? safeJsonParse<string[]>(row.plot_ids) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { page = '1', pageSize = '10', type, regionId, name } = req.query
    
    const pageNum = parseInt(page as string, 10)
    const pageSizeNum = parseInt(pageSize as string, 10)
    const offset = (pageNum - 1) * pageSizeNum
    
    const whereConditions: string[] = []
    const params: any[] = []
    
    if (type) {
      whereConditions.push('type = ?')
      params.push(type)
    }
    
    if (regionId) {
      whereConditions.push('region_id = ?')
      params.push(regionId)
    }
    
    if (name) {
      whereConditions.push('name LIKE ?')
      params.push(`%${name}%`)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : ''
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM entities ${whereClause}`)
    const countResult = countStmt.get(...params) as { total: number }
    
    const dataStmt = db.prepare(`
      SELECT * FROM entities 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = dataStmt.all(...params, pageSizeNum, offset) as any[]
    
    const entities = rows.map(mapRowToEntity)
    
    const response: ApiResponse<{ entities: Entity[], total: number, page: number, pageSize: number }> = {
      success: true,
      data: {
        entities,
        total: countResult.total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取主体列表失败'
    }
    res.status(500).json(response)
  }
})

router.get('/:id/plots', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const rows = db.prepare('SELECT * FROM plots WHERE entity_id = ? ORDER BY created_at DESC').all(id) as any[]
    const plots = rows.map(row => ({
      id: row.id,
      entityId: row.entity_id,
      name: row.name,
      area: row.area,
      location: row.location ? JSON.parse(row.location) : { lat: 0, lng: 0 },
      boundaries: row.boundaries ? JSON.parse(row.boundaries) : [],
      soilType: row.soil_type || undefined,
      plotCode: row.plot_code ?? undefined,
      landType: row.land_type ?? undefined,
      irrigation: row.irrigation ?? undefined,
      ownership: row.ownership ?? undefined,
      remark: row.remark ?? undefined,
      createdAt: row.created_at
    }))

    res.json({
      success: true,
      data: {
        plots,
        total: plots.length
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取主体地块失败'
    })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    
    const stmt = db.prepare('SELECT * FROM entities WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) {
      const response: ApiResponse<null> = {
        success: false,
        error: '主体不存在'
      }
      res.status(404).json(response)
      return
    }
    
    const entity = mapRowToEntity(row)
    
    const response: ApiResponse<Entity> = {
      success: true,
      data: entity
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取主体详情失败'
    }
    res.status(500).json(response)
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { 
      name, 
      type, 
      contactPerson, 
      phone, 
      age,
      gender,
      idCard,
      address,
      email,
      remark,
      plotIds
    } = req.body
    
    if (!name || !type || !contactPerson || !phone) {
      const response: ApiResponse<null> = {
        success: false,
        error: '缺少必填字段'
      }
      res.status(400).json(response)
      return
    }
    
    const validTypes: EntityType[] = ['large_farmer', 'family_farm', 'cooperative', 'small_farmer']
    if (!validTypes.includes(type)) {
      const response: ApiResponse<null> = {
        success: false,
        error: '无效的主体类型'
      }
      res.status(400).json(response)
      return
    }
    
    const id = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO entities (
        id, 
        name, 
        type, 
        contact_person, 
        phone, 
        age,
        gender,
        id_card,
        address,
        email,
        remark,
        plot_ids,
        created_at, 
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, 
      name, 
      type, 
      contactPerson, 
      phone, 
      typeof age === 'number' ? age : null,
      gender || null,
      idCard || null,
      address || null,
      email || null,
      remark || null,
      Array.isArray(plotIds) ? JSON.stringify(plotIds) : null,
      now, 
      now
    )
    
    const entity: Entity = {
      id,
      name,
      type,
      contactPerson,
      phone,
      age: typeof age === 'number' ? age : undefined,
      gender: gender as 'male' | 'female' | undefined,
      idCard: idCard || undefined,
      address: address || undefined,
      email: email || undefined,
      remark: remark || undefined,
      plotIds: Array.isArray(plotIds) ? plotIds : undefined,
      createdAt: now,
      updatedAt: now
    }
    
    const response: ApiResponse<Entity> = {
      success: true,
      data: entity,
      message: '主体创建成功'
    }
    
    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '创建主体失败'
    }
    res.status(500).json(response)
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { 
      name, 
      type, 
      contactPerson, 
      phone, 
      age,
      gender,
      idCard,
      address,
      email,
      remark,
      plotIds
    } = req.body
    
    const checkStmt = db.prepare('SELECT * FROM entities WHERE id = ?')
    const existing = checkStmt.get(id) as any
    
    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: '主体不存在'
      }
      res.status(404).json(response)
      return
    }
    
    if (type) {
      const validTypes: EntityType[] = ['large_farmer', 'family_farm', 'cooperative', 'small_farmer']
      if (!validTypes.includes(type)) {
        const response: ApiResponse<null> = {
          success: false,
          error: '无效的主体类型'
        }
        res.status(400).json(response)
        return
      }
    }
    
    const now = new Date().toISOString()
    
    const updateStmt = db.prepare(`
      UPDATE entities 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          contact_person = COALESCE(?, contact_person),
          phone = COALESCE(?, phone),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          id_card = COALESCE(?, id_card),
          address = COALESCE(?, address),
          email = COALESCE(?, email),
          remark = COALESCE(?, remark),
          plot_ids = COALESCE(?, plot_ids),
          updated_at = ?
      WHERE id = ?
    `)
    
    updateStmt.run(
      name, 
      type, 
      contactPerson, 
      phone, 
      typeof age === 'number' ? age : null,
      gender || null,
      idCard || null,
      address || null,
      email || null,
      remark || null,
      Array.isArray(plotIds) ? JSON.stringify(plotIds) : null,
      now, 
      id
    )
    
    const updatedStmt = db.prepare('SELECT * FROM entities WHERE id = ?')
    const updated = updatedStmt.get(id) as any
    const entity = mapRowToEntity(updated)
    
    const response: ApiResponse<Entity> = {
      success: true,
      data: entity,
      message: '主体更新成功'
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '更新主体失败'
    }
    res.status(500).json(response)
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    
    const checkStmt = db.prepare('SELECT * FROM entities WHERE id = ?')
    const existing = checkStmt.get(id) as any
    
    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: '主体不存在'
      }
      res.status(404).json(response)
      return
    }
    
    const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?')
    deleteStmt.run(id)
    
    const response: ApiResponse<null> = {
      success: true,
      message: '主体删除成功'
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '删除主体失败'
    }
    res.status(500).json(response)
  }
})

export default router
