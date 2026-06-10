import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init.js'
import type { SowingProgress, SowingDetail, ApiResponse, CropType, ProgressSummary } from '../../shared/types.js'
import { randomUUID } from 'crypto'

const router = Router()

function getYearFromDate(date: string): number {
  const value = Number(String(date || '').slice(0, 4))
  return Number.isFinite(value) && value > 0 ? value : new Date().getFullYear()
}

function calculateProgress(sownArea: number, plannedArea: number): number {
  return plannedArea > 0 ? Math.round((sownArea / plannedArea) * 10000) / 100 : 0
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
    plannedArea: row.planned_area || 0,
    sownArea: row.sown_area || 0,
    largeFarmerArea: row.large_farmer_area || 0,
    progress: calculateProgress(row.sown_area || 0, row.planned_area || 0),
    date: row.date,
    createdAt: row.created_at
  }
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
        plannedArea: taskPlan.planned_area
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
      where += " AND strftime('%Y', sp.date) = ?"
      params.push(String(year))
    }

    if (regionId) {
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
        where += ` AND sp.region_id IN (${regionIds.map(() => '?').join(',')})`
        params.push(...regionIds)
      } else if (selectedRegion?.level === 2) {
        const childRows = db.prepare('SELECT id FROM regions WHERE parent_id = ?').all(regionId) as { id: string }[]
        const regionIds = [String(regionId), ...childRows.map(row => row.id)]
        where += ` AND sp.region_id IN (${regionIds.map(() => '?').join(',')})`
        params.push(...regionIds)
      } else {
        where += ' AND sp.region_id = ?'
        params.push(regionId)
      }
    }

    if (cropType) {
      where += ' AND sp.crop_type = ?'
      params.push(cropType)
    }

    if (keyword) {
      where += ' AND (r.name LIKE ? OR p1.name LIKE ? OR p2.name LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }

    const total = (db.prepare(`
      SELECT COUNT(*) as total
      FROM sowing_progress sp
      LEFT JOIN regions r ON sp.region_id = r.id
      LEFT JOIN regions p1 ON r.parent_id = p1.id
      LEFT JOIN regions p2 ON p1.parent_id = p2.id
      ${where}
    `).get(...params) as { total: number }).total

    const rows = db.prepare(`
      SELECT
        sp.*,
        r.name as region_name,
        r.level as region_level,
        p1.name as parent_name,
        p2.name as grandparent_name
      FROM sowing_progress sp
      LEFT JOIN regions r ON sp.region_id = r.id
      LEFT JOIN regions p1 ON r.parent_id = p1.id
      LEFT JOIN regions p2 ON p1.parent_id = p2.id
      ${where}
      ORDER BY sp.date DESC, sp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, offset) as any[]

    res.json({
      success: true,
      data: rows.map(mapProgressRow),
      total
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取播种进度失败'
    })
  }
})

router.post('/progress', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { regionId, cropType, sownArea, largeFarmerArea = 0, date } = req.body

    if (!regionId || !cropType || sownArea === undefined || !date) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      res.status(400).json({ success: false, error: '该地区暂无对应任务计划，无法录入播种进度' })
      return
    }

    const taskId = taskPlan.id
    const plannedArea = Number(taskPlan.planned_area)
    const progressId = randomUUID()
    const now = new Date().toISOString()
    const progress = calculateProgress(Number(sownArea), plannedArea)

    db.prepare(`
      INSERT INTO sowing_progress
      (id, task_id, region_id, crop_type, planned_area, sown_area, large_farmer_area, progress, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(progressId, taskId, regionId, cropType, Number(plannedArea), Number(sownArea), Number(largeFarmerArea) || 0, progress, date, now)

    db.prepare(`UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?`).run(now, taskId)

    res.status(201).json({
      success: true,
      data: {
        id: progressId,
        taskId,
        regionId,
        cropType,
        plannedArea: Number(plannedArea),
        sownArea: Number(sownArea),
        largeFarmerArea: Number(largeFarmerArea) || 0,
        progress,
        date,
        createdAt: now
      },
      message: '播种进度新增成功'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '新增播种进度失败'
    })
  }
})

router.put('/progress/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { regionId, cropType, sownArea, largeFarmerArea = 0, date } = req.body

    const existing = db.prepare('SELECT * FROM sowing_progress WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '播种进度不存在' })
      return
    }

    if (!regionId || !cropType || sownArea === undefined || !date) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      res.status(400).json({ success: false, error: '该地区暂无对应任务计划，无法更新播种进度' })
      return
    }

    const taskId = taskPlan.id
    const plannedArea = Number(taskPlan.planned_area)
    const progress = calculateProgress(Number(sownArea), plannedArea)

    db.prepare(`
      UPDATE sowing_progress
      SET task_id = ?, region_id = ?, crop_type = ?, planned_area = ?, sown_area = ?, large_farmer_area = ?, progress = ?, date = ?
      WHERE id = ?
    `).run(taskId, regionId, cropType, Number(plannedArea), Number(sownArea), Number(largeFarmerArea) || 0, progress, date, id)

    res.json({
      success: true,
      data: {
        id,
        taskId,
        regionId,
        cropType,
        plannedArea: Number(plannedArea),
        sownArea: Number(sownArea),
        largeFarmerArea: Number(largeFarmerArea) || 0,
        progress,
        date,
        createdAt: existing.created_at
      },
      message: '播种进度更新成功'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新播种进度失败'
    })
  }
})

router.delete('/progress/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const existing = db.prepare('SELECT * FROM sowing_progress WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '播种进度不存在' })
      return
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM sowing_details WHERE progress_id = ?').run(id)
      db.prepare('DELETE FROM sowing_progress WHERE id = ?').run(id)
    })
    transaction()

    res.json({ success: true, message: '播种进度删除成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除播种进度失败'
    })
  }
})

router.get('/details', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { progressId, entityId } = req.query
    
    let sql = `
      SELECT 
        sd.*,
        e.name as entity_name,
        p.name as plot_name
      FROM sowing_details sd
      LEFT JOIN entities e ON sd.entity_id = e.id
      LEFT JOIN plots p ON sd.plot_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (progressId) {
      sql += ' AND sd.progress_id = ?'
      params.push(progressId)
    }
    
    if (entityId) {
      sql += ' AND sd.entity_id = ?'
      params.push(entityId)
    }
    
    sql += ' ORDER BY sd.sowing_date DESC'
    
    const rows = db.prepare(sql).all(...params) as any[]
    
    const details: SowingDetail[] = rows.map(row => ({
      id: row.id,
      progressId: row.progress_id,
      entityId: row.entity_id,
      plotId: row.plot_id,
      area: row.area,
      sowingDate: row.sowing_date,
      cropVariety: row.crop_variety || undefined,
      createdAt: row.created_at
    }))
    
    const response: ApiResponse<SowingDetail[]> = {
      success: true,
      data: details
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取播种明细失败'
    }
    res.status(500).json(response)
  }
})

router.post('/details', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { progressId, entityId, plotId, area, sowingDate, cropVariety } = req.body
    if (!progressId || !entityId || !plotId || area === undefined || !sowingDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    const progress = db.prepare('SELECT id FROM sowing_progress WHERE id = ?').get(progressId) as any
    if (!progress) {
      res.status(400).json({ success: false, error: '关联播种进度不存在' })
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO sowing_details (id, progress_id, entity_id, plot_id, area, sowing_date, crop_variety, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, progressId, entityId, plotId, Number(area), sowingDate, cropVariety || null, now)

    res.status(201).json({
      success: true,
      data: { id, progressId, entityId, plotId, area: Number(area), sowingDate, cropVariety: cropVariety || undefined, createdAt: now },
      message: '播种明细新增成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '新增播种明细失败' })
  }
})

router.put('/details/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { progressId, entityId, plotId, area, sowingDate, cropVariety } = req.body
    const existing = db.prepare('SELECT * FROM sowing_details WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '播种明细不存在' })
      return
    }
    if (!progressId || !entityId || !plotId || area === undefined || !sowingDate) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }

    db.prepare(`
      UPDATE sowing_details
      SET progress_id = ?, entity_id = ?, plot_id = ?, area = ?, sowing_date = ?, crop_variety = ?
      WHERE id = ?
    `).run(progressId, entityId, plotId, Number(area), sowingDate, cropVariety || null, id)

    res.json({
      success: true,
      data: { id, progressId, entityId, plotId, area: Number(area), sowingDate, cropVariety: cropVariety || undefined, createdAt: existing.created_at },
      message: '播种明细更新成功'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新播种明细失败' })
  }
})

router.delete('/details/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const result = db.prepare('DELETE FROM sowing_details WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '播种明细不存在' })
      return
    }
    res.json({ success: true, message: '播种明细删除成功' })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '删除播种明细失败' })
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
      FROM sowing_progress sp
      LEFT JOIN regions r ON sp.region_id = r.id
      ${where}
    `).get(...params) as { total: number }).total

    const rows = db.prepare(`
      SELECT sp.id, r.name as region, sp.sown_area as area, sp.date, '系统调度员' as operator, '' as remark
      FROM sowing_progress sp
      LEFT JOIN regions r ON sp.region_id = r.id
      ${where}
      ORDER BY sp.date DESC, sp.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, offset) as any[]

    res.json({
      success: true,
      data: {
        records: rows,
        total
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取播种记录失败'
    })
  }
})

router.post('/record', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    let { taskId, regionId, cropType, plannedArea, sownArea } = req.body
    const { largeFarmerArea, date, details } = req.body

    const { region, area } = req.body
    if ((!taskId || !regionId) && region) {
      const matchedRegion = db.prepare('SELECT id FROM regions WHERE name LIKE ? ORDER BY level DESC LIMIT 1').get(`%${region}%`) as any
      if (matchedRegion) {
        regionId = matchedRegion.id
        const task = db.prepare('SELECT * FROM tasks WHERE region_id = ? ORDER BY created_at DESC LIMIT 1').get(regionId) as any
        if (task) {
          taskId = task.id
          cropType = task.crop_type
          plannedArea = task.planned_area
        }
      }
    }
    if (area !== undefined && sownArea === undefined) {
      sownArea = Number(area)
    }
    
    if (!regionId || !cropType || sownArea === undefined || !date) {
      const response: ApiResponse<null> = {
        success: false,
        error: '缺少必要参数'
      }
      res.status(400).json(response)
      return
    }

    const taskPlan = getTaskPlan(db, regionId, cropType, getYearFromDate(date))
    if (!taskPlan) {
      const response: ApiResponse<null> = {
        success: false,
        error: '该地区暂无对应任务计划，无法录入播种进度'
      }
      res.status(400).json(response)
      return
    }

    taskId = taskPlan.id
    plannedArea = taskPlan.planned_area
    
    const progress = calculateProgress(Number(sownArea), Number(plannedArea))
    const progressId = randomUUID()
    const now = new Date().toISOString()
    
    const insertProgressStmt = db.prepare(`
      INSERT INTO sowing_progress 
      (id, task_id, region_id, crop_type, planned_area, sown_area, large_farmer_area, progress, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const insertDetailStmt = db.prepare(`
      INSERT INTO sowing_details 
      (id, progress_id, entity_id, plot_id, area, sowing_date, crop_variety, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const updateTaskStmt = db.prepare(`
      UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?
    `)
    
    const transaction = db.transaction(() => {
      insertProgressStmt.run(
        progressId,
        taskId,
        regionId,
        cropType,
        Number(plannedArea),
        Number(sownArea),
        Number(largeFarmerArea) || 0,
        progress,
        date,
        now
      )
      
      if (details && Array.isArray(details)) {
        for (const detail of details) {
          const detailId = randomUUID()
          insertDetailStmt.run(
            detailId,
            progressId,
            detail.entityId,
            detail.plotId,
            detail.area,
            detail.sowingDate || date,
            detail.cropVariety || null,
            now
          )
        }
      }
      
      updateTaskStmt.run(now, taskId)
    })
    
    transaction()
    
    const sowingProgress: SowingProgress = {
      id: progressId,
      taskId,
      regionId,
      cropType: cropType as CropType,
      plannedArea: Number(plannedArea),
      sownArea: Number(sownArea),
      largeFarmerArea: Number(largeFarmerArea) || 0,
      progress,
      date,
      createdAt: now
    }
    
    const response: ApiResponse<SowingProgress> = {
      success: true,
      data: sowingProgress,
      message: '播种进度录入成功'
    }
    
    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '录入播种进度失败'
    }
    res.status(500).json(response)
  }
})

router.get('/summary', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { year, regionId } = req.query
    
    let sql = `
      SELECT 
        c.id as region_id,
        c.name as region_name,
        SUM(sp.planned_area) as planned_area,
        SUM(sp.sown_area) as completed_area
      FROM sowing_progress sp
      LEFT JOIN regions county ON sp.region_id = county.id
      LEFT JOIN regions c ON county.parent_id = c.id
      LEFT JOIN regions p ON c.parent_id = p.id
      WHERE 1=1
        AND c.level = 2
        AND p.code = '340000'
    `
    const params: any[] = []
    
    if (year) {
      sql += " AND strftime('%Y', sp.date) = ?"
      params.push(year)
    }
    
    if (regionId) {
      sql += ' AND c.id = ?'
      params.push(regionId)
    }
    
    sql += ' GROUP BY c.id ORDER BY c.name'
    
    const rows = db.prepare(sql).all(...params) as any[]
    
    const summary: ProgressSummary[] = rows.map(row => {
      const plannedArea = row.planned_area || 0
      const completedArea = row.completed_area || 0
      const progress = calculateProgress(completedArea, plannedArea)
      
      return {
        regionId: row.region_id,
        regionName: row.region_name,
        plannedArea,
        completedArea,
        progress
      }
    })
    
    const response: ApiResponse<ProgressSummary[]> = {
      success: true,
      data: summary
    }
    
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取播种汇总失败'
    }
    res.status(500).json(response)
  }
})

export default router
