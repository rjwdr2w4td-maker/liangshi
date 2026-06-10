import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init'
import type { ApiResponse, StatisticsSummary, ProgressSummary } from '../../shared/types'

const router = Router()

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { year, regionId } = req.query

    const params: any[] = []
    let sowingWhere = 'WHERE 1=1'
    let harvestWhere = 'WHERE 1=1'

    if (year) {
      params.push(String(year))
      sowingWhere += " AND strftime('%Y', sp.date) = ?"
      harvestWhere += " AND strftime('%Y', hp.date) = ?"
    }

    if (regionId) {
      params.push(regionId as string)
      sowingWhere += ' AND sp.region_id = ?'
      harvestWhere += ' AND hp.region_id = ?'
    }

    const sowingStats = db.prepare(`
      SELECT 
        sp.region_id,
        r.name as region_name,
        sp.crop_type,
        SUM(sp.sown_area) as total_sown_area
      FROM sowing_progress sp
      LEFT JOIN regions r ON sp.region_id = r.id
      ${sowingWhere}
      GROUP BY sp.region_id, sp.crop_type
    `).all(...params)

    const harvestStats = db.prepare(`
      SELECT 
        hp.region_id,
        r.name as region_name,
        hp.crop_type,
        SUM(hp.harvested_area) as total_harvested_area,
        SUM(hd.yield) as total_yield
      FROM harvest_progress hp
      LEFT JOIN regions r ON hp.region_id = r.id
      LEFT JOIN harvest_details hd ON hp.id = hd.progress_id
      ${harvestWhere}
      GROUP BY hp.region_id, hp.crop_type
    `).all(...params)

    const summary: StatisticsSummary[] = []

    const regionMap = new Map<string, StatisticsSummary>()

    sowingStats.forEach((stat: any) => {
      const key = `${stat.region_id}-${stat.crop_type}`
      if (!regionMap.has(stat.region_id)) {
        regionMap.set(stat.region_id, {
          year: Number(year) || new Date().getFullYear(),
          regionId: stat.region_id,
          regionName: stat.region_name,
          sownArea: 0,
          harvestedArea: 0,
          yield: 0
        })
      }
      const item = regionMap.get(stat.region_id)!
      item.sownArea += stat.total_sown_area || 0
    })

    harvestStats.forEach((stat: any) => {
      const item = regionMap.get(stat.region_id)
      if (item) {
        item.harvestedArea += stat.total_harvested_area || 0
        item.yield += stat.total_yield || 0
      }
    })

    regionMap.forEach(value => summary.push(value))

    const response: ApiResponse<StatisticsSummary[]> = {
      success: true,
      data: summary
    }

    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '获取统计数据失败'
    }
    res.status(500).json(response)
  }
})

router.get('/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { year, type } = req.query

    const currentYear = year ? Number(year) : new Date().getFullYear()

    if (type === 'sowing') {
      const progress = db.prepare(`
        SELECT 
          sp.region_id,
          r.name as region_name,
          sp.crop_type,
          sp.planned_area,
          sp.sown_area,
          sp.progress,
          sp.date
        FROM sowing_progress sp
        LEFT JOIN regions r ON sp.region_id = r.id
        WHERE strftime('%Y', sp.date) = ?
        ORDER BY sp.date DESC
      `).all(String(currentYear))

      const response: ApiResponse<any[]> = {
        success: true,
        data: progress as any[]
      }
      res.json(response)
    } else if (type === 'harvest') {
      const progress = db.prepare(`
        SELECT 
          hp.region_id,
          r.name as region_name,
          hp.crop_type,
          hp.planted_area,
          hp.harvested_area,
          hp.progress,
          hp.date
        FROM harvest_progress hp
        LEFT JOIN regions r ON hp.region_id = r.id
        WHERE strftime('%Y', hp.date) = ?
        ORDER BY hp.date DESC
      `).all(String(currentYear))

      const response: ApiResponse<any[]> = {
        success: true,
        data: progress as any[]
      }
      res.json(response)
    } else if (type === 'disaster') {
      const records = db.prepare(`
        SELECT 
          dr.*,
          r.name as region_name
        FROM disaster_records dr
        LEFT JOIN regions r ON dr.region_id = r.id
        WHERE strftime('%Y', dr.occur_time) = ?
        ORDER BY dr.occur_time DESC
      `).all(String(currentYear))

      const response: ApiResponse<any[]> = {
        success: true,
        data: records as any[]
      }
      res.json(response)
    } else {
      const [sowingResult, harvestResult, disasterResult] = db.transaction(() => {
        const sowing = db.prepare(`
          SELECT 
            SUM(sown_area) as total_sown,
            COUNT(DISTINCT region_id) as region_count
          FROM sowing_progress
          WHERE strftime('%Y', date) = ?
        `).get(String(currentYear))

        const harvest = db.prepare(`
          SELECT 
            SUM(harvested_area) as total_harvested,
            SUM(large_farmer_area) as large_farmer_harvested
          FROM harvest_progress
          WHERE strftime('%Y', date) = ?
        `).get(String(currentYear))

        const disaster = db.prepare(`
          SELECT 
            COUNT(*) as disaster_count,
            SUM(estimated_loss) as total_loss
          FROM disaster_records
          WHERE strftime('%Y', occur_time) = ?
        `).get(String(currentYear))

        return [sowing, harvest, disaster]
      })()

      const report = {
        year: currentYear,
        sowing: {
          totalArea: (sowingResult as any)?.total_sown || 0,
          regionCount: (sowingResult as any)?.region_count || 0
        },
        harvest: {
          totalArea: (harvestResult as any)?.total_harvested || 0,
          largeFarmerArea: (harvestResult as any)?.large_farmer_harvested || 0
        },
        disaster: {
          count: (disasterResult as any)?.disaster_count || 0,
          totalLoss: (disasterResult as any)?.total_loss || 0
        }
      }

      const response: ApiResponse<any> = {
        success: true,
        data: report
      }
      res.json(response)
    }
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : '生成报表失败'
    }
    res.status(500).json(response)
  }
})

export default router
