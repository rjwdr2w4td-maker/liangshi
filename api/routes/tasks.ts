import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init.js'
import type { Task, ApiResponse, CropType, EntityType, TaskStatus } from '../../shared/types.js'
import { randomUUID } from 'crypto'

const router = Router()

function safeJsonParse<T>(str: string | null | undefined): T | undefined {
  if (!str) return undefined
  try { return JSON.parse(str) as T } catch { return undefined }
}

function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    name: row.name || undefined,
    year: row.year,
    regionId: row.region_id,
    regionName: row.region_name || undefined,
    cropType: row.crop_type as CropType,
    plannedArea: row.planned_area,
    parentTaskId: row.parent_task_id || undefined,
    entityType: row.entity_type as EntityType || undefined,
    plotIds: row.plot_ids ? safeJsonParse<string[]>(row.plot_ids) : undefined,
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { year, regionId, cropType, status, parentTaskId } = req.query

    let sql = `
      SELECT t.*, r.name as region_name
      FROM tasks t 
      LEFT JOIN regions r ON t.region_id = r.id
      WHERE 1=1
    `
    const params: any[] = []

    if (year) {
      sql += ' AND t.year = ?'
      params.push(year)
    }

    if (regionId) {
      sql += ' AND t.region_id = ?'
      params.push(regionId)
    }

    if (cropType) {
      sql += ' AND t.crop_type = ?'
      params.push(cropType)
    }

    if (status) {
      sql += ' AND t.status = ?'
      params.push(status)
    }

    if (parentTaskId) {
      sql += ' AND t.parent_task_id = ?'
      params.push(parentTaskId)
    }

    sql += ' ORDER BY t.region_id, t.created_at DESC'

    const rows = db.prepare(sql).all(...params) as any[]
    const tasks = rows.map(mapRowToTask)

    const response: ApiResponse<Task[]> = {
      success: true,
      data: tasks
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取任务列表失败'
    }
    res.status(500).json(response)
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params

    const row = db.prepare(`
      SELECT t.*, r.name as region_name 
      FROM tasks t 
      LEFT JOIN regions r ON t.region_id = r.id 
      WHERE t.id = ?
    `).get(id) as any

    if (!row) {
      const response: ApiResponse<null> = {
        success: false,
        error: '任务不存在'
      }
      res.status(404).json(response)
      return
    }

    const task = mapRowToTask(row)

    const response: ApiResponse<Task> = {
      success: true,
      data: task
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取任务详情失败'
    }
    res.status(500).json(response)
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { year, regionId, cropType, plannedArea, parentTaskId, entityType, plotIds, name } = req.body

    if (!year || !regionId || !cropType || !plannedArea) {
      const response: ApiResponse<null> = {
        success: false,
        error: '缺少必要参数'
      }
      res.status(400).json(response)
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO tasks (id, name, year, region_id, crop_type, planned_area, parent_task_id, entity_type, plot_ids, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id, name || null, year, regionId, cropType, plannedArea,
      parentTaskId || null,
      entityType || null,
      Array.isArray(plotIds) ? JSON.stringify(plotIds) : null,
      now, now
    )

    const task: Task = {
      id,
      name: name || undefined,
      year,
      regionId,
      cropType: cropType as CropType,
      plannedArea,
      parentTaskId,
      entityType: entityType as EntityType || undefined,
      plotIds: Array.isArray(plotIds) ? plotIds : undefined,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }

    const response: ApiResponse<Task> = {
      success: true,
      data: task,
      message: '任务创建成功'
    }

    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '创建任务失败'
    }
    res.status(500).json(response)
  }
})

router.put('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { plannedArea, entityType, plotIds, status, name } = req.body

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: '任务不存在'
      }
      res.status(404).json(response)
      return
    }

    const now = new Date().toISOString()

    db.prepare(`
      UPDATE tasks 
      SET name = COALESCE(?, name),
          planned_area = COALESCE(?, planned_area),
          entity_type = COALESCE(?, entity_type),
          plot_ids = COALESCE(?, plot_ids),
          status = COALESCE(?, status),
          updated_at = ?
      WHERE id = ?
    `).run(
      name ?? null,
      plannedArea ?? null,
      entityType || null,
      Array.isArray(plotIds) ? JSON.stringify(plotIds) : null,
      status || null,
      now, id
    )

    const row = db.prepare(`
      SELECT t.*, r.name as region_name 
      FROM tasks t LEFT JOIN regions r ON t.region_id = r.id 
      WHERE t.id = ?
    `).get(id) as any

    const task = mapRowToTask(row)

    const response: ApiResponse<Task> = {
      success: true,
      data: task,
      message: '任务更新成功'
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '更新任务失败'
    }
    res.status(500).json(response)
  }
})

router.post('/:id/decompose', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { subTasks } = req.body

    if (!subTasks || !Array.isArray(subTasks) || subTasks.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: '缺少子任务数据'
      }
      res.status(400).json(response)
      return
    }

    const parentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any

    if (!parentTask) {
      const response: ApiResponse<null> = {
        success: false,
        error: '父任务不存在'
      }
      res.status(404).json(response)
      return
    }

    const now = new Date().toISOString()
    const createdTasks: Task[] = []

    const insertStmt = db.prepare(`
      INSERT INTO tasks (id, name, year, region_id, crop_type, planned_area, parent_task_id, entity_type, plot_ids, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `)

    const updateParentStmt = db.prepare(`
      UPDATE tasks SET status = 'in_progress', updated_at = ? WHERE id = ?
    `)

    const transaction = db.transaction(() => {
      for (const subTask of subTasks) {
        const subTaskId = randomUUID()
        const subCropType = subTask.cropType || parentTask.crop_type
        insertStmt.run(
          subTaskId,
          subTask.name || null,
          parentTask.year,
          subTask.regionId,
          subCropType,
          subTask.plannedArea,
          id,
          subTask.entityType || null,
          Array.isArray(subTask.plotIds) ? JSON.stringify(subTask.plotIds) : null,
          now,
          now
        )

        createdTasks.push({
          id: subTaskId,
          name: subTask.name || undefined,
          year: parentTask.year,
          regionId: subTask.regionId,
          cropType: subCropType as CropType,
          plannedArea: subTask.plannedArea,
          parentTaskId: id,
          entityType: subTask.entityType as EntityType || undefined,
          plotIds: Array.isArray(subTask.plotIds) ? subTask.plotIds : undefined,
          status: 'pending',
          createdAt: now,
          updatedAt: now
        })
      }

      updateParentStmt.run(now, id)
    })

    transaction()

    const response: ApiResponse<Task[]> = {
      success: true,
      data: createdTasks,
      message: '任务分解成功'
    }

    res.status(201).json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '任务分解失败'
    }
    res.status(500).json(response)
  }
})

router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase()
    const { id } = req.params

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any
    if (!existing) {
      const response: ApiResponse<null> = {
        success: false,
        error: '任务不存在'
      }
      res.status(404).json(response)
      return
    }

    const children = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE parent_task_id = ?').get(id) as any
    if (children.count > 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: '该任务已分解子任务，无法删除'
      }
      res.status(400).json(response)
      return
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)

    const response: ApiResponse<null> = {
      success: true,
      message: '任务删除成功'
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '删除任务失败'
    }
    res.status(500).json(response)
  }
})

export default router
