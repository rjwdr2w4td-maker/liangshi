import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, RotateCcw, Edit2, Trash2 } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { api } from '@/utils/api'
import type { CropType, Entity, Plot, Task as TaskType } from '../../../shared/types'
import { cropTypeLabels, entityTypeLabels } from '../../../shared/types'

type DetailType = 'sowing' | 'harvest'

interface ProgressRecord {
  id: string
  taskId: string
  regionId: string
  regionName?: string
  cropType: CropType
  date: string
}

interface DetailRecord {
  id: string
  progressId: string
  entityId: string
  plotId: string
  area: number
  sowingDate?: string
  harvestDate?: string
  cropVariety?: string
  yield?: number
  createdAt: string
}

interface DetailForm {
  type: DetailType
  progressId: string
  entityId: string
  plotId: string
  area: number | ''
  date: string
  cropVariety: string
  yield: number | ''
}

const defaultForm = (type: DetailType = 'sowing'): DetailForm => ({
  type,
  progressId: '',
  entityId: '',
  plotId: '',
  area: '',
  date: new Date().toISOString().split('T')[0],
  cropVariety: '',
  yield: '',
})

export default function ProgressDetails() {
  const [activeType, setActiveType] = useState<DetailType>('sowing')
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [sowingProgress, setSowingProgress] = useState<ProgressRecord[]>([])
  const [harvestProgress, setHarvestProgress] = useState<ProgressRecord[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [sowingDetails, setSowingDetails] = useState<DetailRecord[]>([])
  const [harvestDetails, setHarvestDetails] = useState<DetailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingDetail, setEditingDetail] = useState<DetailRecord | null>(null)
  const [form, setForm] = useState<DetailForm>(defaultForm())
  const [filters, setFilters] = useState({ keyword: '', entityId: '', plotId: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [taskRes, sowingProgressRes, harvestProgressRes, entityRes, plotRes, sowingDetailRes, harvestDetailRes] = await Promise.all([
      api.get<TaskType[]>('/tasks'),
      api.get<ProgressRecord[]>('/sowing/progress?page=1&pageSize=10000'),
      api.get<ProgressRecord[]>('/harvest/progress?page=1&pageSize=10000'),
      api.get<any>('/entities?page=1&pageSize=10000'),
      api.get<any>('/plots?page=1&pageSize=10000'),
      api.get<DetailRecord[]>('/sowing/details'),
      api.get<DetailRecord[]>('/harvest/details'),
    ])

    if (taskRes.success && taskRes.data) setTasks(taskRes.data)
    if (sowingProgressRes.success && sowingProgressRes.data) setSowingProgress(sowingProgressRes.data)
    if (harvestProgressRes.success && harvestProgressRes.data) setHarvestProgress(harvestProgressRes.data)
    if (entityRes.success && entityRes.data) setEntities(entityRes.data.entities || [])
    if (plotRes.success && plotRes.data) setPlots(plotRes.data.plots || [])
    if (sowingDetailRes.success && sowingDetailRes.data) setSowingDetails(sowingDetailRes.data)
    if (harvestDetailRes.success && harvestDetailRes.data) setHarvestDetails(harvestDetailRes.data)
    setLoading(false)
  }

  const currentDetails = activeType === 'sowing' ? sowingDetails : harvestDetails

  const filteredPlots = useMemo(() => {
    return form.entityId ? plots.filter(plot => plot.entityId === form.entityId) : plots
  }, [form.entityId, plots])

  const getTask = (taskId: string) => tasks.find(task => task.id === taskId)
  const getProgress = (progressId: string, type: DetailType = activeType) => {
    const source = type === 'sowing' ? sowingProgress : harvestProgress
    return source.find(progress => progress.id === progressId)
  }
  const getEntity = (entityId: string) => entities.find(entity => entity.id === entityId)
  const getPlot = (plotId: string) => plots.find(plot => plot.id === plotId)

  const getProgressLabel = (progress: ProgressRecord, type: DetailType = activeType) => {
    const task = getTask(progress.taskId)
    const name = task?.name || progress.regionName || '未命名任务'
    return `${name} / ${cropTypeLabels[progress.cropType]} / ${type === 'sowing' ? '播种' : '收获'}进度 ${progress.date}`
  }

  const filteredDetails = currentDetails.filter(detail => {
    if (filters.entityId && detail.entityId !== filters.entityId) return false
    if (filters.plotId && detail.plotId !== filters.plotId) return false
    if (filters.keyword) {
      const entity = getEntity(detail.entityId)?.name || ''
      const plot = getPlot(detail.plotId)?.name || ''
      const variety = detail.cropVariety || ''
      if (!`${entity}${plot}${variety}`.includes(filters.keyword)) return false
    }
    return true
  })

  const totalArea = filteredDetails.reduce((sum, detail) => sum + detail.area, 0)
  const householdCount = new Set(filteredDetails.map(detail => detail.entityId)).size
  const plotCount = new Set(filteredDetails.map(detail => detail.plotId)).size

  const openCreateModal = () => {
    setEditingDetail(null)
    setForm(defaultForm(activeType))
    setModalOpen(true)
  }

  const openEditModal = (detail: DetailRecord) => {
    setEditingDetail(detail)
    setForm({
      type: activeType,
      progressId: detail.progressId,
      entityId: detail.entityId,
      plotId: detail.plotId,
      area: detail.area,
      date: activeType === 'sowing' ? detail.sowingDate || '' : detail.harvestDate || '',
      cropVariety: detail.cropVariety || '',
      yield: detail.yield || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.progressId || !form.entityId || !form.plotId || form.area === '' || !form.date) {
      alert('请填写完整信息')
      return
    }

    const payload = form.type === 'sowing'
      ? {
          progressId: form.progressId,
          entityId: form.entityId,
          plotId: form.plotId,
          area: Number(form.area),
          sowingDate: form.date,
          cropVariety: form.cropVariety,
        }
      : {
          progressId: form.progressId,
          entityId: form.entityId,
          plotId: form.plotId,
          area: Number(form.area),
          harvestDate: form.date,
          cropVariety: form.cropVariety,
          yield: form.yield === '' ? undefined : Number(form.yield),
        }

    setSubmitting(true)
    const baseUrl = form.type === 'sowing' ? '/sowing/details' : '/harvest/details'
    const response = editingDetail
      ? await api.put(`${baseUrl}/${editingDetail.id}`, payload)
      : await api.post(baseUrl, payload)
    setSubmitting(false)

    if (response.success) {
      setModalOpen(false)
      await fetchData()
    } else {
      alert(response.error || '保存失败')
    }
  }

  const handleDelete = async (detail: DetailRecord) => {
    if (!confirm('确定删除该明细记录吗？')) return
    const baseUrl = activeType === 'sowing' ? '/sowing/details' : '/harvest/details'
    const response = await api.delete(`${baseUrl}/${detail.id}`)
    if (response.success) fetchData()
    else alert(response.error || '删除失败')
  }

  const handlePlotChange = (plotId: string) => {
    const selectedPlot = plots.find(plot => plot.id === plotId)
    setForm({ ...form, plotId, area: selectedPlot ? selectedPlot.area : '' })
  }

  const handleReset = () => {
    setFilters({ keyword: '', entityId: '', plotId: '' })
  }

  const changeActiveType = (type: DetailType) => {
    setActiveType(type)
    setFilters({ keyword: '', entityId: '', plotId: '' })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">进度明细</h1>
          <p className="text-gray-500 mt-1">支持到户、到田录入，记录具体地块的播种/收获时间、作物品种等详细信息</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1" />
          新增明细
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-sm text-gray-500">明细面积</div><div className="text-2xl font-bold text-gray-900 mt-1">{totalArea.toLocaleString()} 亩</div></Card>
        <Card><div className="text-sm text-gray-500">涉及主体</div><div className="text-2xl font-bold text-emerald-700 mt-1">{householdCount} 户</div></Card>
        <Card><div className="text-sm text-gray-500">涉及地块</div><div className="text-2xl font-bold text-blue-700 mt-1">{plotCount} 块</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button onClick={() => changeActiveType('sowing')} className={`px-4 py-2 rounded-lg font-medium ${activeType === 'sowing' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>播种明细</button>
          <button onClick={() => changeActiveType('harvest')} className={`px-4 py-2 rounded-lg font-medium ${activeType === 'harvest' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>收获明细</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="text" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="搜索主体/地块/品种" />
          <select value={filters.entityId} onChange={(e) => setFilters({ ...filters, entityId: e.target.value, plotId: '' })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部主体</option>
            {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
          </select>
          <select value={filters.plotId} onChange={(e) => setFilters({ ...filters, plotId: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部地块</option>
            {plots.filter(plot => !filters.entityId || plot.entityId === filters.entityId).map(plot => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
          <Button onClick={fetchData}><Search className="w-4 h-4 mr-1" />查询</Button>
          <Button variant="secondary" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
        </div>
      </Card>

      <Card title={activeType === 'sowing' ? '播种到户到田明细' : '收获到户到田明细'} className="overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500">加载中...</div>
        ) : filteredDetails.length === 0 ? (
          <div className="py-12 text-center text-gray-400">暂无明细数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">关联进度</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">主体</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">主体类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">地块</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">面积（亩）</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">{activeType === 'sowing' ? '播种时间' : '收获时间'}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">作物品种</th>
                  {activeType === 'harvest' && <th className="px-4 py-3 text-left font-medium text-gray-700">产量</th>}
                  <th className="px-4 py-3 text-left font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDetails.map(detail => {
                  const progress = getProgress(detail.progressId)
                  const entity = getEntity(detail.entityId)
                  const plot = getPlot(detail.plotId)
                  return (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 max-w-[260px] truncate">{progress ? getProgressLabel(progress) : '-'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{entity?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{entity ? entityTypeLabels[entity.type] : '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{plot?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{detail.area.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{activeType === 'sowing' ? detail.sowingDate : detail.harvestDate}</td>
                      <td className="px-4 py-3 text-gray-700">{detail.cropVariety || '-'}</td>
                      {activeType === 'harvest' && <td className="px-4 py-3 text-gray-700">{detail.yield || '-'}</td>}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(detail)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(detail)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDetail ? '编辑进度明细' : '新增进度明细'} size="lg" footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button><Button onClick={handleSubmit} loading={submitting}>保存</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">明细类型 <span className="text-red-500">*</span></label>
            <select value={form.type} onChange={(e) => setForm(defaultForm(e.target.value as DetailType))} disabled={!!editingDetail} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="sowing">播种明细</option>
              <option value="harvest">收获明细</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联进度 <span className="text-red-500">*</span></label>
            <select value={form.progressId} onChange={(e) => setForm({ ...form, progressId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择进度</option>
              {(form.type === 'sowing' ? sowingProgress : harvestProgress).map(progress => <option key={progress.id} value={progress.id}>{getProgressLabel(progress, form.type)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">到户主体 <span className="text-red-500">*</span></label>
            <select value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value, plotId: '', area: '' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择主体</option>
              {entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">到田地块 <span className="text-red-500">*</span></label>
            <select value={form.plotId} onChange={(e) => handlePlotChange(e.target.value)} disabled={!form.entityId} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
              <option value="">请选择地块</option>
              {filteredPlots.map(plot => <option key={plot.id} value={plot.id}>{plot.name}（{plot.area}亩）</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">面积（亩）<span className="text-red-500">*</span></label>
            <input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value ? Number(e.target.value) : '' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === 'sowing' ? '播种时间' : '收获时间'} <span className="text-red-500">*</span></label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
            <input type="text" value={form.cropVariety} onChange={(e) => setForm({ ...form, cropVariety: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：皖麦、优质稻等" />
          </div>
          {form.type === 'harvest' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产量</label>
              <input type="number" value={form.yield} onChange={(e) => setForm({ ...form, yield: e.target.value ? Number(e.target.value) : '' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" placeholder="请输入产量" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
