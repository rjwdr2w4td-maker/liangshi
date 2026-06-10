import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init.js'
import type { Plot, ApiResponse } from '../../shared/types.js'

const router = Router()

function mapRowToPlot(row: any): Plot {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    area: row.area,
    location: row.location ? JSON.parse(row.location) : { lat: 0, lng: 0 },
    boundaries: row.boundaries ? JSON.parse(row.boundaries) : [],
    soilType: row.soil_type,
    plotCode: row.plot_code ?? undefined,
    landType: row.land_type ?? undefined,
    irrigation: row.irrigation ?? undefined,
    ownership: row.ownership ?? undefined,
    remark: row.remark ?? undefined,
    createdAt: row.created_at
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { page = '1', pageSize = '10', entityId, regionId } = req.query
    
    const pageNum = parseInt(page as string, 10)
    const pageSizeNum = parseInt(pageSize as string, 10)
    const offset = (pageNum - 1) * pageSizeNum
    
    const whereConditions: string[] = []
    const params: any[] = []
    
    if (entityId) {
      whereConditions.push('entity_id = ?')
      params.push(entityId)
    }
    
    if (regionId) {
      whereConditions.push('entity_id IN (SELECT id FROM entities WHERE region_id = ?)')
      params.push(regionId)
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : ''
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM plots ${whereClause}`)
    const countResult = countStmt.get(...params) as { total: number }
    
    const dataStmt = db.prepare(`
      SELECT * FROM plots 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const rows = dataStmt.all(...params, pageSizeNum, offset) as any[]
    
    const plots = rows.map(mapRowToPlot)
    
    const response: ApiResponse<{ plots: Plot[], total: number, page: number, pageSize: number }> = {
      success: true,
      data: {
        plots,
        total: countResult.total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取地块列表失败'
    }
    res.status(500).json(response)
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    
    const stmt = db.prepare('SELECT * FROM plots WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) {
      const response: ApiResponse<null> = {
        success: false,
        error: '地块不存在'
      }
      res.status(404).json(response)
      return
    }
    
    const plot = mapRowToPlot(row)
    
    const response: ApiResponse<Plot> = {
      success: true,
      data: plot
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取地块详情失败'
    }
    res.status(500).json(response)
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { entityId, name, area, location, boundaries, soilType, plotCode, landType, irrigation, ownership, remark } = req.body
    
    if (!entityId || !name || !area) {
      const response: ApiResponse<null> = {
        success: false,
        error: '缺少必填字段'
      }
      res.status(400).json(response)
      return
    }
    
    const entityStmt = db.prepare('SELECT id FROM entities WHERE id = ?')
    const entity = entityStmt.get(entityId) as any
    
    if (!entity) {
      const response: ApiResponse<null> = {
        success: false,
        error: '关联的主体不存在'
      }
      res.status(400).json(response)
      return
    }
    
    const id = `plot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO plots (
        id, 
        entity_id, 
        name, 
        area, 
        location, 
        boundaries, 
        soil_type, 
        plot_code,
        land_type,
        irrigation,
        ownership,
        remark,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, 
      entityId, 
      name, 
      area, 
      location ? JSON.stringify(location) : null,
      boundaries ? JSON.stringify(boundaries) : null,
      soilType || null,
      plotCode || null,
      landType || null,
      irrigation || null,
      ownership || null,
      remark || null,
      now
    )
    
    const plot: Plot = {
      id,
      entityId,
      name,
      area,
      location: location || { lat: 0, lng: 0 },
      boundaries: boundaries || [],
      soilType: soilType || undefined,
      plotCode: plotCode || undefined,
      landType: landType || undefined,
      irrigation: irrigation || undefined,
      ownership: ownership || undefined,
      remark: remark || undefined,
      createdAt: now
    }
    
    const response: ApiResponse<Plot> = {
      success: true,
      data: plot,
      message: '地块创建成功'
    }
    
    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '创建地块失败'
    }
    res.status(500).json(response)
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { name, area, location, boundaries, soilType, plotCode, landType, irrigation, ownership, remark } = req.body
    
    const checkStmt = db.prepare('SELECT * FROM plots WHERE id = ?')
    const existing = checkStmt.get(id) as any
    
    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: '地块不存在'
      }
      res.status(404).json(response)
      return
    }
    
    const updateStmt = db.prepare(`
      UPDATE plots 
      SET name = COALESCE(?, name),
          area = COALESCE(?, area),
          location = COALESCE(?, location),
          boundaries = COALESCE(?, boundaries),
          soil_type = COALESCE(?, soil_type),
          plot_code = COALESCE(?, plot_code),
          land_type = COALESCE(?, land_type),
          irrigation = COALESCE(?, irrigation),
          ownership = COALESCE(?, ownership),
          remark = COALESCE(?, remark)
      WHERE id = ?
    `)
    
    updateStmt.run(
      name, 
      area, 
      location ? JSON.stringify(location) : null,
      boundaries ? JSON.stringify(boundaries) : null,
      soilType || null,
      plotCode || null,
      landType || null,
      irrigation || null,
      ownership || null,
      remark || null,
      id
    )
    
    const updatedStmt = db.prepare('SELECT * FROM plots WHERE id = ?')
    const updated = updatedStmt.get(id) as any
    const plot = mapRowToPlot(updated)
    
    const response: ApiResponse<Plot> = {
      success: true,
      data: plot,
      message: '地块更新成功'
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '更新地块失败'
    }
    res.status(500).json(response)
  }
})

export default router
