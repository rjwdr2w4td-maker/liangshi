import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init'
import type { ApiResponse, Region } from '../../shared/types'

const router = Router()

function buildRegionTree(regions: any[]): Region[] {
  const regionMap = new Map<string, Region>()
  const rootRegions: Region[] = []

  regions.forEach(r => {
    regionMap.set(r.id, {
      id: r.id,
      name: r.name,
      code: r.code,
      parentId: r.parent_id,
      level: r.level,
      children: []
    })
  })

  regions.forEach(r => {
    const region = regionMap.get(r.id)!
    if (r.parent_id) {
      const parent = regionMap.get(r.parent_id)
      if (parent) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(region)
      }
    } else {
      rootRegions.push(region)
    }
  })

  return rootRegions
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { level, parentId } = req.query

    let sql = 'SELECT * FROM regions'
    const conditions: string[] = []
    const params: any[] = []

    if (level) {
      conditions.push('level = ?')
      params.push(Number(level))
    }

    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        conditions.push('parent_id IS NULL')
      } else {
        conditions.push('parent_id = ?')
        params.push(parentId as string)
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY code'

    const regions = db.prepare(sql).all(...params) as any[]

    if (!level && parentId === undefined) {
      const regionTree = buildRegionTree(regions)

      const response: ApiResponse<Region[]> = {
        success: true,
        data: regionTree
      }

      res.json(response)
    } else {
      const formattedRegions: Region[] = regions.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        parentId: r.parent_id,
        level: r.level
      }))

      const response: ApiResponse<Region[]> = {
        success: true,
        data: formattedRegions
      }

      res.json(response)
    }
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取行政区划失败'
    }
    res.status(500).json(response)
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params

    const region = db.prepare('SELECT * FROM regions WHERE id = ?').get(id) as any

    if (!region) {
      const response: ApiResponse<null> = {
        success: false,
        error: '区域不存在'
      }
      res.status(404).json(response)
      return
    }

    const children = db.prepare('SELECT * FROM regions WHERE parent_id = ? ORDER BY code').all(id) as any[]

    const formattedRegion: Region = {
      id: region.id,
      name: region.name,
      code: region.code,
      parentId: region.parent_id,
      level: region.level,
      children: children.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        parentId: c.parent_id,
        level: c.level
      }))
    }

    const response: ApiResponse<Region> = {
      success: true,
      data: formattedRegion
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取区域详情失败'
    }
    res.status(500).json(response)
  }
})

export default router
