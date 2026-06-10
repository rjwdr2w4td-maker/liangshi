import { useState, useEffect } from 'react'
import { FileText, Calendar, Tag, Eye, Plus, Edit2, Trash2 } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import Table from '@/components/common/Table'
import { api } from '@/utils/api'

interface Policy {
  id: string
  title: string
  category: string
  publishDate: string
  effectiveDate: string
  source: string
  summary: string
  content: string
  status: 'active' | 'expired' | 'draft'
  attachmentUrl?: string
  createdAt: string
}

interface PolicyResponse {
  policies: Policy[]
  total: number
}

interface PolicyForm {
  title: string
  category: string
  publishDate: string
  effectiveDate: string
  source: string
  summary: string
  content: string
  status: 'active' | 'expired' | 'draft'
}

const defaultForm = (): PolicyForm => ({
  title: '',
  category: '补贴政策',
  publishDate: new Date().toISOString().split('T')[0],
  effectiveDate: new Date().toISOString().split('T')[0],
  source: '',
  summary: '',
  content: '',
  status: 'active',
})

const categoryColors: Record<string, string> = {
  '补贴政策': 'bg-blue-100 text-blue-800',
  '贷款政策': 'bg-green-100 text-green-800',
  '保险政策': 'bg-purple-100 text-purple-800',
  '税收政策': 'bg-orange-100 text-orange-800',
  '技术支持': 'bg-teal-100 text-teal-800',
  '其他': 'bg-gray-100 text-gray-800',
}

const statusColors: Record<string, string> = {
  'active': 'bg-green-100 text-green-800',
  'expired': 'bg-red-100 text-red-800',
  'draft': 'bg-yellow-100 text-yellow-800',
}

const statusText: Record<string, string> = {
  'active': '生效中',
  'expired': '已过期',
  'draft': '草稿',
}

const categories = ['补贴政策', '贷款政策', '保险政策', '税收政策', '技术支持', '其他']

export default function PolicyList() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [form, setForm] = useState<PolicyForm>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  useEffect(() => {
    fetchPolicies(1)
  }, [])

  const fetchPolicies = async (page: number = 1) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: '10',
    })
    if (searchKeyword) params.append('keyword', searchKeyword)
    if (filterCategory) params.append('category', filterCategory)

    const response = await api.get<PolicyResponse | Policy[]>(`/policies?${params.toString()}`)
    if (response.success && response.data) {
      const rawPolicies = Array.isArray(response.data) ? response.data : response.data.policies
      setPolicies(rawPolicies.map(policy => ({
        ...policy,
        source: policy.source || '农业农村部门',
        summary: policy.summary || policy.content?.slice(0, 80) || '',
        status: policy.status || 'active',
      })))
      const total = Array.isArray(response.data) ? rawPolicies.length : response.data.total
      setPagination(prev => ({ ...prev, current: page, total }))
    }
    setLoading(false)
  }

  const handleSearch = () => {
    fetchPolicies(1)
  }

  const handleViewDetail = (policy: Policy) => {
    setSelectedPolicy(policy)
    setDetailModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingPolicy(null)
    setForm(defaultForm())
    setFormModalOpen(true)
  }

  const openEditModal = (policy: Policy) => {
    setEditingPolicy(policy)
    setForm({
      title: policy.title,
      category: policy.category,
      publishDate: policy.publishDate,
      effectiveDate: policy.effectiveDate,
      source: policy.source || '',
      summary: policy.summary || '',
      content: policy.content || '',
      status: policy.status,
    })
    setFormModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.category || !form.publishDate || !form.effectiveDate) {
      alert('请填写完整必填信息')
      return
    }

    setSubmitting(true)
    const response = editingPolicy
      ? await api.put(`/policies/${editingPolicy.id}`, form)
      : await api.post('/policies', form)
    setSubmitting(false)

    if (response.success) {
      setFormModalOpen(false)
      await fetchPolicies(pagination.current)
    } else {
      alert(response.error || '保存失败')
    }
  }

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`确定删除政策"${policy.title}"吗？`)) return
    const response = await api.delete(`/policies/${policy.id}`)
    if (response.success) {
      await fetchPolicies(pagination.current)
    } else {
      alert(response.error || '删除失败')
    }
  }

  const columns = [
    {
      key: 'title',
      title: '政策标题',
      render: (record: Policy) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{record.title}</span>
        </div>
      ),
    },
    {
      key: 'category',
      title: '政策类别',
      render: (record: Policy) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[record.category] || categoryColors['其他']}`}>
          {record.category}
        </span>
      ),
    },
    {
      key: 'publishDate',
      title: '发布日期',
      render: (record: Policy) => (
        <div className="flex items-center gap-1 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{record.publishDate}</span>
        </div>
      ),
    },
    {
      key: 'source',
      title: '发布单位',
      render: (record: Policy) => (
        <span className="text-gray-600">{record.source}</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (record: Policy) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
          {statusText[record.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (record: Policy) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleViewDetail(record)} className="text-sm">
            <Eye className="w-4 h-4 mr-1" />
            详情
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openEditModal(record)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(record)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">惠农政策</h1>
          <p className="text-gray-500 mt-1">查看和管理惠农政策信息</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1" />
          新增政策
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索政策标题或关键词"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部类别</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleSearch}>
            搜索
          </Button>
        </div>

        <Table
          columns={columns}
          data={policies}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page) => fetchPolicies(page),
          }}
        />
      </Card>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="政策详情"
        className="max-w-3xl"
      >
        {selectedPolicy && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {selectedPolicy.title}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[selectedPolicy.category] || categoryColors['其他']}`}>
                    {selectedPolicy.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedPolicy.publishDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{selectedPolicy.source}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedPolicy.status]}`}>
                  {statusText[selectedPolicy.status]}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">政策摘要</h3>
              <p className="text-gray-600 leading-relaxed">
                {selectedPolicy.summary}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">详细内容</h3>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {selectedPolicy.content}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingPolicy ? '编辑政策' : '新增政策'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} loading={submitting}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">政策标题 <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入政策标题" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">政策类别 <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态 <span className="text-red-500">*</span></label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Policy['status'] })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">生效中</option>
                <option value="draft">草稿</option>
                <option value="expired">已过期</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发布日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.publishDate} onChange={(e) => setForm({ ...form, publishDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">生效日期 <span className="text-red-500">*</span></label>
              <input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发布单位</label>
            <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：农业农村部、省农业农村厅等" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">政策摘要</label>
            <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="简要描述政策内容" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">详细内容 <span className="text-red-500">*</span></label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={8} placeholder="请输入政策详细内容" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
