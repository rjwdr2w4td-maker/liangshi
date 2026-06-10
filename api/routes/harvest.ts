import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init.js'
import type { HarvestProgress, HarvestDetail, ApiResponse, CropType, ProgressSummary } from '../../shared/types.js'
import { randomUUID } from 'crypto'

const router = Router()

function getYearFromDate(date: string): number {
  const value = Number(String(date || '').slice(0, 4))
  return Number.isFinite(value) && value > 0 ? value : new Date().getFullYear()
}

function calculateProgress(harvestedArea: number, plantedArea: number): number {
  return plantedArea > 0 ? Math.round((harvestedArea / plantedArea) * 10000) / 100 : 0
}

function getTaskPlan(db: any, regionId: string, cropType: string, year?: string | number) {
  let sql = `
    SELECT id, year, planned_area
    FROM tasks
    WHERE region_id = ? AND crop_type = ?
  `
  const params: any[] = [regionId, cropType]

  if (year) {
    sql += ' AND year = ?'
    params.push(Number(year))
  }

  sql += ' ORDER BY year DESC, created_at DESC LIMIT 1'
  return db.prepare(sql).get(...params) as { id: string; year: number; planned_area: number } | undefined
}

function appendRegionFilter(db: any, where: string, params: any[], regionId: unknown) {
  if (!regionId) return where

  const selectedRegion = db.prepare('SELECT id, level FROM regions WHERE id = ?').get(regionId) as any
  if (selectedRegion?.level === 1) {
    const childRows = db.prepare(`
      SELECT c.id FROM regions c WHERE c.parent_id = ?
      UNION
      SELECT county.id FROM regions city
      JOIN regions county ON county.parent_id = city.id
      WHERE city.parent_id = ?
    `).all(regionId, regionId) as { id: string }[]
    const regionIds = [String(regionId), ...childRows.map(row => row.id)]
    where += ` AND hp.region_id IN (${regionIds.map(() => '?').join(',')})`
    params.push(...regionIds)
  } else if (selectedRegion?.level === 2) {
    const childRows = db.prepare('SELECT id FROM regions WHERE parent_id = ?').all(regionId) as { id: string }[]
    const regionIds = [String(regionId), ...childRows.map(row => row.id)]
    where += ` AND hp.region_id IN (${regionIds.map(() => '?').join(',')})`
    params.push(...regionIds)
  } else {
    where += ' AND hp.region_id = ?'
    params.push(regionId)
  }

  return where
}

function mapProgressRow(row: any) {
  const regionLevel = Number(row.region_level)
  const provinceName = regionLevel === 1 ? row.region_name : regionLevel === 2 ? row.parent_name : row.grandparent_name
  const cityName = regionLevel === 2 ? row.region_name : regionLevel === 3 ? row.parent_name : undefined
  const countyName = regionLevel === 3 ? row.region_name : undefined

  return {
    id: row.id,
    taskId: row.task_id,
    regionId: row.region_id,
    regionName: row.region_name || undefined,
    provinceName: provinceName || undefined,
    cityName: cityName || undefined,
    countyName: countyName || undefined,
    cropType: row.crop_type as CropType,
    plantedArea: row.planted_area || 0,
    harvestedArea: row.harvested_area || 0,
    largeFarmerArea: row.large_farmer_area || 0,
    progress: calculateProgress(row.harvested_area || 0, row.planted_area || 0),
    date: row.date,
    createdAt: row.created_at
  }
}

router.get('/task-plan', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { regionId, cropType, year } = req.query

    if (!regionId || !cropType) {
      res.status(400).json({ success: false, error: '缺少地区或作物类型' })
      return
    }

    const taskPlan = getTaskPlan(db, String(regionId), String(cropType), year ? String(year) : undefined)
    if (!taskPlan) {
      res.status(404).json({ success: false, error: '该地区暂无对应任务计划' })
      return
    }

    res.json({
      success: true,
      data: {
        taskId: taskPlan.id,
        year: taskPlan.year,
        plantedArea: taskPlan.planned_area
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务计划失败'
    })
  }
})

router.get('/progress', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { year, regionId, cropType, keyword, page = '1', pageSize = '10' } = req.query
    const pageNum = Number(page)
    const size = Number(pageSize)
    const offset = (pageNum - 1) * size

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (year) {
      where += " AND strftime('%Y', hp.date) = ?"
      params.push(String(year))
    }

    where = appendRegionFilter(db, where, params, regionId)

    if (cropType) {
      where += ' AND hp.crop_type = ?'
      params.push(cropType)
    }

    if (keyword) {
      where += ' AND (r.name LIKE ? OR p1.name LIKE ? OR p2.name LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }

    const total = (db.prepare(`
      SELECT COUNT(*) as total
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      LEFT JOIN regions p1 ON r.parent_id = p1.id
      LEFT JOIN regions p2 ON p1.parent_id = p2.id
      ${where}
    `).get(...params) as { total: number }).total

    const rows = db.prepare(`
      SELECT
        hp.*,
        r.name as region_name,
        r.level as region_level,
        p1.name as parent_name,
        p2.name as grandparent_name
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      LEFT JOIN regions p1 ON r.parent_id = p1.id
      LEFT JOIN regions p2 ON p1.parent_id = p2.id
      ${where}
      ORDER BY hp.date DESC, hp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, offset) as any[]

    res.json({ success: true, data: rows.map(mapProgressRow), total })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取收获进度失败' })
  }
})

router.post('/progress', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { regionId, cropType, harvestedArea, largeFarmerArea = 0, date } = req.body

    if (!regionId || !cropType || harvestedArea === undefined || !date) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      res.status(400).json({ success: false, error: '该地区暂无对应任务计划，无法录入收获进度' })
      return
    }

    const taskId = taskPlan.id
    const plantedArea = Number(taskPlan.planned_area)
    const progressId = randomUUID()
    const now = new Date().toISOString()
    const progress = calculateProgress(Number(harvestedArea), plantedArea)

    db.prepare(`
      INSERT INTO harvest_progress
      (id, task_id, region_id, crop_type, planted_area, harvested_area, large_farmer_area, progress, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(progressId, taskId, regionId, cropType, plantedArea, Number(harvestedArea), Number(largeFarmerArea) || 0, progress, date, now)

    db.prepare(`
      UPDATE tasks SET status = CASE WHEN ? >= ? THEN 'completed' ELSE 'in_progress' END, updated_at = ? WHERE id = ?
    `).run(Number(harvestedArea), plantedArea, now, taskId)

    res.status(201).json({
      success: true,
      data: {
        id: progressId,
        taskId,
        regionId,
        cropType,
        plantedArea,
        harvestedArea: Number(harvestedArea),
        largeFarmerArea: Number(largeFarmerArea) || 0,
        progress,
        date,
        createdAt: now
      },
      message: '收获进度新增成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '新增收获进度失败' })
  }
})

router.put('/progress/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { regionId, cropType, harvestedArea, largeFarmerArea = 0, date } = req.body

    const existing = db.prepare('SELECT * FROM harvest_progress WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '收获进度不存在' })
      return
    }

    if (!regionId || !cropType || harvestedArea === undefined || !date) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      res.status(400).json({ success: false, error: '该地区暂无对应任务计划，无法更新收获进度' })
      return
    }

    const taskId = taskPlan.id
    const plantedArea = Number(taskPlan.planned_area)
    const progress = calculateProgress(Number(harvestedArea), plantedArea)

    db.prepare(`
      UPDATE harvest_progress
      SET task_id = ?, region_id = ?, crop_type = ?, planted_area = ?, harvested_area = ?, large_farmer_area = ?, progress = ?, date = ?
      WHERE id = ?
    `).run(taskId, regionId, cropType, plantedArea, Number(harvestedArea), Number(largeFarmerArea) || 0, progress, date, id)

    res.json({
      success: true,
      data: {
        id,
        taskId,
        regionId,
        cropType,
        plantedArea,
        harvestedArea: Number(harvestedArea),
        largeFarmerArea: Number(largeFarmerArea) || 0,
        progress,
        date,
        createdAt: existing.created_at
      },
      message: '收获进度更新成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新收获进度失败' })
  }
})

router.delete('/progress/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const existing = db.prepare('SELECT * FROM harvest_progress WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '收获进度不存在' })
      return
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM harvest_details WHERE progress_id = ?').run(id)
      db.prepare('DELETE FROM harvest_progress WHERE id = ?').run(id)
    })
    transaction()

    res.json({ success: true, message: '收获进度删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '删除收获进度失败' })
  }
})

router.get('/details', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { progressId, entityId } = req.query
    
    let sql = `
      SELECT hd.*, e.name as entity_name, p.name as plot_name
      FROM harvest_details hd
      LEFT JOIN entities e ON hd.entity_id = e.id
      LEFT JOIN plots p ON hd.plot_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (progressId) {
      sql += ' AND hd.progress_id = ?'
      params.push(progressId)
    }
    
    if (entityId) {
      sql += ' AND hd.entity_id = ?'
      params.push(entityId)
    }
    
    sql += ' ORDER BY hd.harvest_date DESC'
    const rows = db.prepare(sql).all(...params) as any[]
    
    const details: HarvestDetail[] = rows.map(row => ({
      id: row.id,
      progressId: row.progress_id,
      entityId: row.entity_id,
      plotId: row.plot_id,
      area: row.area,
      harvestDate: row.harvest_date,
      cropVariety: row.crop_variety || undefined,
      yield: row.yield || undefined,
      createdAt: row.created_at
    }))
    
    res.json({ success: true, data: details })
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取收获明细失败'
    }
    res.status(500).json(response)
  }
})

router.post('/details', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { progressId, entityId, plotId, area, harvestDate, cropVariety, yield: yieldValue } = req.body
    if (!progressId || !entityId || !plotId || area === undefined || !harvestDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const progress = db.prepare('SELECT id FROM harvest_progress WHERE id = ?').get(progressId) as any
    if (!progress) {
      res.status(400).json({ success: false, error: '关联收获进度不存在' })
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO harvest_details (id, progress_id, entity_id, plot_id, area, harvest_date, crop_variety, yield, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, progressId, entityId, plotId, Number(area), harvestDate, cropVariety || null, yieldValue || null, now)

    res.status(201).json({
      success: true,
      data: { id, progressId, entityId, plotId, area: Number(area), harvestDate, cropVariety: cropVariety || undefined, yield: yieldValue || undefined, createdAt: now },
      message: '收获明细新增成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '新增收获明细失败' })
  }
})

router.put('/details/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { progressId, entityId, plotId, area, harvestDate, cropVariety, yield: yieldValue } = req.body
    const existing = db.prepare('SELECT * FROM harvest_details WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '收获明细不存在' })
      return
    }
    if (!progressId || !entityId || !plotId || area === undefined || !harvestDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    db.prepare(`
      UPDATE harvest_details
      SET progress_id = ?, entity_id = ?, plot_id = ?, area = ?, harvest_date = ?, crop_variety = ?, yield = ?
      WHERE id = ?
    `).run(progressId, entityId, plotId, Number(area), harvestDate, cropVariety || null, yieldValue || null, id)

    res.json({
      success: true,
      data: { id, progressId, entityId, plotId, area: Number(area), harvestDate, cropVariety: cropVariety || undefined, yield: yieldValue || undefined, createdAt: existing.created_at },
      message: '收获明细更新成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新收获明细失败' })
  }
})

router.delete('/details/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const result = db.prepare('DELETE FROM harvest_details WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '收获明细不存在' })
      return
    }
    res.json({ success: true, message: '收获明细删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '删除收获明细失败' })
  }
})

router.get('/record', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { page = '1', pageSize = '10', region = '' } = req.query
    const pageNum = Number(page)
    const size = Number(pageSize)
    const offset = (pageNum - 1) * size
    const params: any[] = []
    let where = ''
    if (region) {
      where = 'WHERE r.name LIKE ?'
      params.push(`%${region}%`)
    }

    const total = (db.prepare(`
      SELECT COUNT(*) as total
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      ${where}
    `).get(...params) as { total: number }).total

    const rows = db.prepare(`
      SELECT hp.id, r.name as region, hp.harvested_area as area, hp.date, '系统调度员' as operator, '' as remark
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      ${where}
      ORDER BY hp.date DESC, hp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, offset) as any[]

    res.json({ success: true, data: { records: rows, total } })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取收获记录失败' })
  }
})

router.post('/record', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    let { regionId, cropType, harvestedArea } = req.body
    const { largeFarmerArea, date, details, region, area } = req.body

    if ((!regionId) && region) {
      const matchedRegion = db.prepare('SELECT id FROM regions WHERE name LIKE ? ORDER BY level DESC LIMIT 1').get(`%${region}%`) as any
      if (matchedRegion) regionId = matchedRegion.id
    }
    if (area !== undefined && harvestedArea === undefined) harvestedArea = Number(area)
    if (!cropType && regionId) {
      const task = db.prepare('SELECT crop_type FROM tasks WHERE region_id = ? ORDER BY created_at DESC LIMIT 1').get(regionId) as any
      if (task) cropType = task.crop_type
    }

    if (!regionId || !cropType || harvestedArea === undefined || !date) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      res.status(400).json({ success: false, error: '该地区暂无对应任务计划，无法录入收获进度' })
      return
    }

    const taskId = taskPlan.id
    const plantedArea = Number(taskPlan.planned_area)
    const progress = calculateProgress(Number(harvestedArea), plantedArea)
    const progressId = randomUUID()
    const now = new Date().toISOString()

    const insertProgressStmt = db.prepare(`
      INSERT INTO harvest_progress
      (id, task_id, region_id, crop_type, planted_area, harvested_area, large_farmer_area, progress, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertDetailStmt = db.prepare(`
      INSERT INTO harvest_details
      (id, progress_id, entity_id, plot_id, area, harvest_date, yield, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction(() => {
      insertProgressStmt.run(progressId, taskId, regionId, cropType, plantedArea, Number(harvestedArea), Number(largeFarmerArea) || 0, progress, date, now)
      if (details && Array.isArray(details)) {
        for (const detail of details) {
          insertDetailStmt.run(randomUUID(), progressId, detail.entityId, detail.plotId, detail.area, detail.harvestDate || date, detail.yield || null, now)
        }
      }
      db.prepare(`
        UPDATE tasks SET status = CASE WHEN ? >= ? THEN 'completed' ELSE 'in_progress' END, updated_at = ? WHERE id = ?
      `).run(Number(harvestedArea), plantedArea, now, taskId)
    })

    transaction()

    const harvestProgress: HarvestProgress = {
      id: progressId,
      taskId,
      regionId,
      cropType: cropType as CropType,
      plantedArea,
      harvestedArea: Number(harvestedArea),
      largeFarmerArea: Number(largeFarmerArea) || 0,
      progress,
      date,
      createdAt: now
    }

    res.status(201).json({ success: true, data: harvestProgress, message: '收获进度录入成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '录入收获进度失败' })
  }
})

router.get('/summary', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { year, regionId } = req.query
    let where = 'WHERE 1=1'
    const params: any[] = []
    if (year) {
      where += " AND strftime('%Y', hp.date) = ?"
      params.push(year)
    }
    where = appendRegionFilter(db, where, params, regionId)

    const rows = db.prepare(`
      SELECT hp.region_id, r.name as region_name, SUM(hp.planted_area) as planned_area, SUM(hp.harvested_area) as completed_area
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      ${where}
      GROUP BY hp.region_id ORDER BY r.name
    `).all(...params) as any[]

    const summary: ProgressSummary[] = rows.map(row => {
      const plannedArea = row.planned_area || 0
      const completedArea = row.completed_area || 0
      return {
        regionId: row.region_id,
        regionName: row.region_name,
        plannedArea,
        completedArea,
        progress: calculateProgress(completedArea, plannedArea)
      }
    })

    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取收获汇总失败' })
  }
})

export default router
