import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init'
import type { ApiResponse, WeatherWarning, DisasterRecord } from '../../shared/types'
import { randomUUID } from 'crypto'

const router = Router()

function mapWarningRow(w: any): WeatherWarning {
  return {
    id: w.id,
    type: w.type,
    level: w.level,
    title: w.title,
    content: w.content,
    affectedRegions: w.affected_regions ? JSON.parse(w.affected_regions) : [],
    startTime: w.start_time,
    endTime: w.end_time,
    createdAt: w.created_at
  }
}

function mapRecordRow(r: any): DisasterRecord {
  return {
    id: r.id,
    type: r.type,
    regionId: r.region_id,
    regionName: r.region_name || undefined,
    warningId: r.warning_id || undefined,
    plotId: r.plot_id || undefined,
    plotName: r.plot_name || undefined,
    occurTime: r.occur_time,
    affectedArea: r.affected_area,
    damagedArea: r.damaged_area,
    lostArea: r.lost_area,
    estimatedLoss: r.estimated_loss,
    affectedCrops: r.affected_crops ? JSON.parse(r.affected_crops) : [],
    description: r.description,
    aiAnalysis: r.ai_analysis || undefined,
    reportUrl: r.report_url || undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

router.get('/warnings', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { level, type, active } = req.query

    let sql = 'SELECT * FROM weather_warnings'
    const conditions: string[] = []
    const params: any[] = []

    if (level) {
      conditions.push('level = ?')
      params.push(level)
    }
    if (type) {
      conditions.push('type = ?')
      params.push(type)
    }
    if (active === 'true') {
      conditions.push("datetime(end_time) >= datetime('now')")
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY created_at DESC'

    const warnings = db.prepare(sql).all(...params) as any[]
    res.json({ success: true, data: warnings.map(mapWarningRow) })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取预警信息失败'
    })
  }
})

router.post('/warnings', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { type, level, title, content, affectedRegions, startTime, endTime } = req.body

    if (!type || !level || !title || !startTime || !endTime) {
      res.status(400).json({ success: false, error: '缺少必要字段：type, level, title, startTime, endTime' })
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO weather_warnings (id, type, level, title, content, affected_regions, start_time, end_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, level, title, content || '',
      affectedRegions ? JSON.stringify(affectedRegions) : null,
      startTime, endTime, now
    )

    const newWarning = db.prepare('SELECT * FROM weather_warnings WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: mapWarningRow(newWarning), message: '预警发布成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '发布预警失败'
    })
  }
})

router.delete('/warnings/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const result = db.prepare('DELETE FROM weather_warnings WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '预警不存在' })
      return
    }
    res.json({ success: true, message: '预警删除成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除预警失败'
    })
  }
})

router.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { regionId, type, status, year } = req.query

    let sql = `
      SELECT dr.*, r.name as region_name, p.name as plot_name
      FROM disaster_records dr
      LEFT JOIN regions r ON dr.region_id = r.id
      LEFT JOIN plots p ON dr.plot_id = p.id
    `
    const conditions: string[] = []
    const params: any[] = []

    if (regionId) {
      conditions.push('dr.region_id = ?')
      params.push(regionId)
    }
    if (type) {
      conditions.push('dr.type = ?')
      params.push(type)
    }
    if (status) {
      conditions.push('dr.status = ?')
      params.push(status)
    }
    if (year) {
      conditions.push("strftime('%Y', dr.occur_time) = ?")
      params.push(String(year))
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY dr.occur_time DESC'

    const records = db.prepare(sql).all(...params) as any[]
    res.json({ success: true, data: records.map(mapRecordRow) })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取灾情记录失败'
    })
  }
})

router.get('/records/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const record = db.prepare(`
      SELECT dr.*, r.name as region_name, p.name as plot_name
      FROM disaster_records dr
      LEFT JOIN regions r ON dr.region_id = r.id
      LEFT JOIN plots p ON dr.plot_id = p.id
      WHERE dr.id = ?
    `).get(id) as any

    if (!record) {
      res.status(404).json({ success: false, error: '灾情记录不存在' })
      return
    }
    res.json({ success: true, data: mapRecordRow(record) })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取灾情详情失败'
    })
  }
})

router.post('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const {
      type, regionId, warningId, plotId, occurTime,
      affectedArea, damagedArea, lostArea, estimatedLoss,
      affectedCrops, description, aiAnalysis, reportUrl
    } = req.body

    if (!type || !regionId || !occurTime) {
      res.status(400).json({ success: false, error: '缺少必要字段：type, regionId, occurTime' })
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO disaster_records (
        id, type, region_id, warning_id, plot_id, occur_time,
        affected_area, damaged_area, lost_area, estimated_loss,
        affected_crops, description, ai_analysis, report_url,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, regionId, warningId || null, plotId || null, occurTime,
      affectedArea || 0, damagedArea || 0, lostArea || 0, estimatedLoss || 0,
      affectedCrops ? JSON.stringify(affectedCrops) : null,
      description || null, aiAnalysis || null, reportUrl || null,
      'reported', now, now
    )

    const newRecord = db.prepare(`
      SELECT dr.*, r.name as region_name, p.name as plot_name
      FROM disaster_records dr
      LEFT JOIN regions r ON dr.region_id = r.id
      LEFT JOIN plots p ON dr.plot_id = p.id
      WHERE dr.id = ?
    `).get(id) as any

    res.status(201).json({ success: true, data: mapRecordRow(newRecord), message: '灾情档案创建成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '录入灾情失败'
    })
  }
})

router.put('/records/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const {
      type, regionId, warningId, plotId, occurTime,
      affectedArea, damagedArea, lostArea, estimatedLoss,
      affectedCrops, description, aiAnalysis, reportUrl, status
    } = req.body

    const existing = db.prepare('SELECT * FROM disaster_records WHERE id = ?').get(id)
    if (!existing) {
      res.status(404).json({ success: false, error: '灾情记录不存在' })
      return
    }

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE disaster_records
      SET type = COALESCE(?, type),
          region_id = COALESCE(?, region_id),
          warning_id = COALESCE(?, warning_id),
          plot_id = COALESCE(?, plot_id),
          occur_time = COALESCE(?, occur_time),
          affected_area = COALESCE(?, affected_area),
          damaged_area = COALESCE(?, damaged_area),
          lost_area = COALESCE(?, lost_area),
          estimated_loss = COALESCE(?, estimated_loss),
          affected_crops = COALESCE(?, affected_crops),
          description = COALESCE(?, description),
          ai_analysis = COALESCE(?, ai_analysis),
          report_url = COALESCE(?, report_url),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `).run(
      type || null, regionId || null,
      warningId !== undefined ? warningId : null,
      plotId !== undefined ? plotId : null,
      occurTime || null,
      affectedArea !== undefined ? affectedArea : null,
      damagedArea !== undefined ? damagedArea : null,
      lostArea !== undefined ? lostArea : null,
      estimatedLoss !== undefined ? estimatedLoss : null,
      affectedCrops ? JSON.stringify(affectedCrops) : null,
      description || null,
      aiAnalysis !== undefined ? aiAnalysis : null,
      reportUrl !== undefined ? reportUrl : null,
      status || null,
      now, id
    )

    const updated = db.prepare(`
      SELECT dr.*, r.name as region_name, p.name as plot_name
      FROM disaster_records dr
      LEFT JOIN regions r ON dr.region_id = r.id
      LEFT JOIN plots p ON dr.plot_id = p.id
      WHERE dr.id = ?
    `).get(id) as any

    res.json({ success: true, data: mapRecordRow(updated), message: '灾情档案更新成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新灾情失败'
    })
  }
})

router.delete('/records/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const result = db.prepare('DELETE FROM disaster_records WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '灾情记录不存在' })
      return
    }
    res.json({ success: true, message: '灾情记录删除成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除灾情记录失败'
    })
  }
})

export default router
