import { useState, useEffect } from 'react'
import { Plus, Search, RotateCcw, Edit2, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import ProgressBar from '@/components/common/ProgressBar'
import { api } from '@/utils/api'
import type { CropType, Task as TaskType } from '../../../shared/types'
import { cropTypeLabels } from '../../../shared/types'

interface Region {
  id: string
  name: string
  level: number
  parentId: string | null
}

interface ProgressRecord {
  id: string
  taskId: string
  regionId: string
  regionName?: string
  provinceName?: string
  cityName?: string
  countyName?: string
  cropType: CropType
  plannedArea: number
  sownArea: number
  progress: number
  date: string
  createdAt: string
}

interface ProgressForm {
  sownArea: number | ''
  date: string
}

const defaultForm = (): ProgressForm => ({
  sownArea: '',
  date: new Date().toISOString().split('T')[0],
})

export default function SowingProgress() {
  const [tasks, setTasks] = useState<TaskType[]>([])
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null)
  const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null)
  const [form, setForm] = useState<ProgressForm>(defaultForm())
  const [filters, setFilters] = useState({
    keyword: '',
    provinceId: '',
    cityId: '',
    countyId: '',
    regionId: '',
    cropType: '' as CropType | '',
    year: String(new Date().getFullYear()),
  })

  useEffect(() => {
    fetchRegions()
    fetchData()
  }, [])

  const flattenRegions = (list: any[]): Region[] => {
    const result: Region[] = []
    const walk = (items: any[]) => {
      for (const item of items) {
        result.push({ id: item.id, name: item.name, level: item.level, parentId: item.parentId ?? null })
        if (Array.isArray(item.children) && item.children.length > 0) walk(item.children)
      }
    }
    walk(list)
    return result
  }

  const fetchRegions = async () => {
    const response = await api.get<any>('/regions')
    if (response.success && response.data) {
      const rawList = Array.isArray(response.data) ? response.data : (response.data as any).regions || (response.data as any).data || []
      setRegions(flattenRegions(rawList))
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const [taskResponse, progressResponse] = await Promise.all([
      api.get<TaskType[]>('/tasks'),
      api.get<ProgressRecord[]>('/sowing/progress?page=1&pageSize=10000'),
    ])
    if (taskResponse.success && taskResponse.data) {
      const rawTasks = Array.isArray(taskResponse.data) ? taskResponse.data : (taskResponse.data as any).data || []
      setTasks(rawTasks)
    }
    if (progressResponse.success && progressResponse.data) {
      setRecords(progressResponse.data)
    }
    setLoading(false)
  }

  const getProvinceRegions = () => regions.filter(region => region.level === 1)
  const getCityRegions = (provinceId: string) => regions.filter(region => region.level === 2 && region.parentId === provinceId)
  const getCountyRegions = (cityId: string) => regions.filter(region => region.level === 3 && region.parentId === cityId)
  const getRegionName = (regionId: string) => regions.find(region => region.id === regionId)?.name || regionId

  const getDescendantRegionIds = (regionId: string) => {
    const result = new Set<string>([regionId])
    const walk = (parentId: string) => {
      regions.filter(region => region.parentId === parentId).forEach(child => {
        result.add(child.id)
        walk(child.id)
      })
    }
    walk(regionId)
    return result
  }

  const updateFilterProvince = (provinceId: string) => {
    setFilters(prev => ({ ...prev, provinceId, cityId: '', countyId: '', regionId: provinceId }))
  }

  const updateFilterCity = (cityId: string) => {
    setFilters(prev => ({ ...prev, cityId, countyId: '', regionId: cityId || prev.provinceId }))
  }

  const updateFilterCounty = (countyId: string) => {
    setFilters(prev => ({ ...prev, countyId, regionId: countyId || prev.cityId || prev.provinceId }))
  }

  const getTaskRecords = (taskId: string) => records.filter(record => record.taskId === taskId)

  const getTaskCompletedArea = (taskId: string) => {
    return getTaskRecords(taskId).reduce((sum, record) => sum + record.sownArea, 0)
  }

  const getTaskProgress = (task: TaskType) => {
    return task.plannedArea > 0 ? Math.round((getTaskCompletedArea(task.id) / task.plannedArea) * 10000) / 100 : 0
  }

  const filteredTasks = tasks.filter(task => {
    if (filters.year && String(task.year) !== filters.year) return false
    if (filters.cropType && task.cropType !== filters.cropType) return false
    if (filters.regionId) {
      const ids = getDescendantRegionIds(filters.regionId)
      if (!ids.has(task.regionId)) return false
    }
    if (filters.keyword) {
      const name = `${task.name || ''}${task.regionName || ''}${getRegionName(task.regionId)}`
      if (!name.includes(filters.keyword)) return false
    }
    return true
  })

  const totalPlanned = filteredTasks.reduce((sum, task) => sum + task.plannedArea, 0)
  const totalSown = filteredTasks.reduce((sum, task) => sum + getTaskCompletedArea(task.id), 0)
  const totalProgress = totalPlanned > 0 ? Math.round((totalSown / totalPlanned) * 10000) / 100 : 0

  const toggleExpand = (taskId: string) => {
    const next = new Set(expandedTaskIds)
    if (next.has(taskId)) next.delete(taskId)
    else next.add(taskId)
    setExpandedTaskIds(next)
  }

  const openCreateModal = (task: TaskType) => {
    setSelectedTask(task)
    setEditingRecord(null)
    setForm(defaultForm())
    setModalOpen(true)
  }

  const openEditModal = (task: TaskType, record: ProgressRecord) => {
    setSelectedTask(task)
    setEditingRecord(record)
    setForm({ sownArea: record.sownArea, date: record.date })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedTask || form.sownArea === '' || !form.date) {
      alert('请填写完整信息')
      return
    }

    const payload = {
      regionId: selectedTask.regionId,
      cropType: selectedTask.cropType,
      sownArea: Number(form.sownArea),
      date: form.date,
    }

    setSubmitting(true)
    const response = editingRecord
      ? await api.put(`/sowing/progress/${editingRecord.id}`, payload)
      : await api.post('/sowing/progress', payload)
    setSubmitting(false)

    if (response.success) {
      setModalOpen(false)
      await fetchData()
      setExpandedTaskIds(prev => new Set(prev).add(selectedTask.id))
    } else {
      alert(response.error || '保存失败')
    }
  }

  const handleDelete = async (record: ProgressRecord) => {
    if (!confirm('确定删除该播种进度记录吗？')) return
    const response = await api.delete(`/sowing/progress/${record.id}`)
    if (response.success) fetchData()
    else alert(response.error || '删除失败')
  }

  const handleReset = () => {
    setFilters({ keyword: '', provinceId: '', cityId: '', countyId: '', regionId: '', cropType: '', year: String(new Date().getFullYear()) })
  }

  const formProgress = selectedTask && form.sownArea !== ''
    ? Math.round((Number(form.sownArea) / selectedTask.plannedArea) * 10000) / 100
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">播种进度</h1>
          <p className="text-gray-500 mt-1">基于任务计划录入播种进度，点击任务展开查看进度记录</p>
        </div>
        <Button variant="secondary" onClick={fetchData} loading={loading}>刷新</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-sm text-gray-500">任务计划面积</div><div className="text-2xl font-bold text-gray-900 mt-1">{totalPlanned.toLocaleString()} 亩</div></Card>
        <Card><div className="text-sm text-gray-500">已播面积</div><div className="text-2xl font-bold text-emerald-700 mt-1">{totalSown.toLocaleString()} 亩</div></Card>
        <Card>
          <div className="text-sm text-gray-500">总体完成度</div>
          <div className="flex items-end gap-3 mt-1">
            <div className="text-2xl font-bold text-blue-700">{totalProgress.toFixed(1)}%</div>
            <div className="flex-1 pb-2"><ProgressBar value={Math.min(totalProgress, 100)} showLabel={false} /></div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <input type="text" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="搜索任务/地区" />
          <select value={filters.provinceId} onChange={(e) => updateFilterProvince(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">全部省</option>{getProvinceRegions().map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select>
          <select value={filters.cityId} onChange={(e) => updateFilterCity(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!filters.provinceId}><option value="">全部市</option>{getCityRegions(filters.provinceId).map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select>
          <select value={filters.countyId} onChange={(e) => updateFilterCounty(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!filters.cityId}><option value="">全部区县</option>{getCountyRegions(filters.cityId).map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select>
          <select value={filters.cropType} onChange={(e) => setFilters({ ...filters, cropType: e.target.value as CropType | '' })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">全部作物</option>{Object.entries(cropTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <input type="number" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="年度" />
          <div className="flex gap-2 md:col-span-2"><Button onClick={fetchData} className="flex-1"><Search className="w-4 h-4 mr-1" />查询</Button><Button variant="secondary" onClick={handleReset}><RotateCcw className="w-4 h-4" /></Button></div>
        </div>
      </Card>

      <Card title="播种任务进度列表" className="overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-500">加载中...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" />暂无任务数据</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTasks.map(task => {
              const expanded = expandedTaskIds.has(task.id)
              const taskRecords = getTaskRecords(task.id)
              const progress = getTaskProgress(task)
              return (
                <div key={task.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <button onClick={() => toggleExpand(task.id)} className="p-1 hover:bg-gray-200 rounded">
                      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{task.name || `${getRegionName(task.regionId)}${task.year}年${cropTypeLabels[task.cropType]}任务`}</div>
                      <div className="text-sm text-gray-500 mt-1 flex gap-4 flex-wrap">
                        <span>{task.year}年</span><span>{getRegionName(task.regionId)}</span><span>{cropTypeLabels[task.cropType]}</span><span>计划面积：{task.plannedArea.toLocaleString()} 亩</span><span>已播：{getTaskCompletedArea(task.id).toLocaleString()} 亩</span>
                      </div>
                    </div>
                    <div className="w-40"><ProgressBar value={Math.min(progress, 100)} showLabel={false} /><div className="text-xs text-right text-gray-600 mt-1">{progress.toFixed(1)}%</div></div>
                    <Button size="sm" onClick={() => openCreateModal(task)}><Plus className="w-4 h-4 mr-1" />新增</Button>
                  </div>
                  {expanded && (
                    <div className="bg-gray-50 px-12 py-3">
                      {taskRecords.length === 0 ? <div className="text-sm text-gray-400 py-3">暂无播种进度记录</div> : (
                        <table className="w-full text-sm bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">填报日期</th><th className="px-3 py-2 text-left">已播面积（亩）</th><th className="px-3 py-2 text-left">完成度</th><th className="px-3 py-2 text-left">操作</th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {taskRecords.map(record => <tr key={record.id}><td className="px-3 py-2">{record.date}</td><td className="px-3 py-2">{record.sownArea.toLocaleString()}</td><td className="px-3 py-2">{record.progress.toFixed(1)}%</td><td className="px-3 py-2"><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => openEditModal(task, record)}><Edit2 className="w-4 h-4" /></Button><Button variant="danger" size="sm" onClick={() => handleDelete(record)}><Trash2 className="w-4 h-4" /></Button></div></td></tr>)}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingRecord ? '编辑播种进度' : '新增播种进度'} size="lg" footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button><Button onClick={handleSubmit} loading={submitting}>保存</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">任务</label><div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">{selectedTask?.name || (selectedTask ? `${getRegionName(selectedTask.regionId)}${selectedTask.year}年${cropTypeLabels[selectedTask.cropType]}任务` : '-')}</div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">计划面积（亩）</label><input value={selectedTask?.plannedArea || ''} disabled className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">已播面积（亩）<span className="text-red-500">*</span></label><input type="number" value={form.sownArea} onChange={(e) => setForm({ ...form, sownArea: e.target.value ? Number(e.target.value) : '' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">填报日期<span className="text-red-500">*</span></label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">完成度</label><div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-md"><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">自动计算</span><span className="font-semibold text-blue-700">{formProgress.toFixed(1)}%</span></div><ProgressBar value={Math.min(formProgress, 100)} showLabel={false} /></div></div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
