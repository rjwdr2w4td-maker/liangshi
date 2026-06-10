import { Router, type Request, type Response } from 'express'
import { getDatabase } from '../database/init'
import type { ApiResponse, Policy } from '../../shared/types'
import { randomUUID } from 'crypto'

const router = Router()

function mapPolicyRow(p: any): Policy {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    category: p.category,
    publishDate: p.publish_date,
    effectiveDate: p.effective_date,
    source: p.source || undefined,
    summary: p.summary || undefined,
    status: p.status || 'active',
    attachmentUrl: p.attachment_url || undefined,
    createdAt: p.created_at
  }
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { category, year, keyword } = req.query

    let sql = 'SELECT * FROM policies'
    const conditions: string[] = []
    const params: any[] = []

    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }

    if (year) {
      conditions.push("strftime('%Y', publish_date) = ?")
      params.push(String(year))
    }

    if (keyword) {
      conditions.push('(title LIKE ? OR content LIKE ? OR summary LIKE ?)')
      const searchTerm = `%${keyword}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    sql += ' ORDER BY publish_date DESC'

    const policies = db.prepare(sql).all(...params) as any[]

    res.json({
      success: true,
      data: policies.map(mapPolicyRow)
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取政策列表失败'
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params

    const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as any

    if (!policy) {
      res.status(404).json({ success: false, error: '政策不存在' })
      return
    }

    res.json({ success: true, data: mapPolicyRow(policy) })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取政策详情失败'
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { title, content, category, publishDate, effectiveDate, source, summary, status, attachmentUrl } = req.body

    if (!title || !content || !category || !publishDate || !effectiveDate) {
      res.status(400).json({ success: false, error: '缺少必要字段：title, content, category, publishDate, effectiveDate' })
      return
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO policies (id, title, content, category, publish_date, effective_date, source, summary, status, attachment_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, content, category, publishDate, effectiveDate,
      source || null, summary || null, status || 'active', attachmentUrl || null, now
    )

    const newPolicy = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: mapPolicyRow(newPolicy), message: '政策发布成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '发布政策失败'
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const { title, content, category, publishDate, effectiveDate, source, summary, status, attachmentUrl } = req.body

    const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as any
    if (!existing) {
      res.status(404).json({ success: false, error: '政策不存在' })
      return
    }

    db.prepare(`
      UPDATE policies
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          category = COALESCE(?, category),
          publish_date = COALESCE(?, publish_date),
          effective_date = COALESCE(?, effective_date),
          source = COALESCE(?, source),
          summary = COALESCE(?, summary),
          status = COALESCE(?, status),
          attachment_url = COALESCE(?, attachment_url)
      WHERE id = ?
    `).run(
      title || null, content || null, category || null,
      publishDate || null, effectiveDate || null,
      source !== undefined ? source : null,
      summary !== undefined ? summary : null,
      status || null,
      attachmentUrl !== undefined ? attachmentUrl : null,
      id
    )

    const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as any
    res.json({ success: true, data: mapPolicyRow(updated), message: '政策更新成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新政策失败'
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase()
    const { id } = req.params
    const result = db.prepare('DELETE FROM policies WHERE id = ?').run(id)
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: '政策不存在' })
      return
    }
    res.json({ success: true, message: '政策删除成功' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除政策失败'
    })
  }
})

export default router
