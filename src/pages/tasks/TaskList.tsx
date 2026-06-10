import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Plus, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import MultiSelect from '@/components/common/MultiSelect'
import { api } from '@/utils/api'
import type { Task as TaskType, CropType, EntityType, Plot, Entity } from '../../../shared/types'
import { cropTypeLabels, entityTypeLabels, taskStatusLabels } from '../../../shared/types'

interface Region {
  id: string
  name: string
  level: number
  parentId: string | null
}

interface TaskNode {
  id: string
  name?: string
  year: number
  regionId: string
  regionName?: string
  cropType: CropType
  plannedArea: number
  parentTaskId?: string
  entityType?: EntityType
  plotIds?: string[]
  status: string
  children?: TaskNode[]
  createdAt: string
  updatedAt: string
}

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [regions, setRegions] = useState<Region[]>([])
  const [allPlots, setAllPlots] = useState<Plot[]>([])
  const [allEntities, setAllEntities] = useState<Entity[]>([])

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createData, setCreateData] = useState({
    name: '',
    year: new Date().getFullYear(),
    regionId: '',
    cropType: 'wheat' as CropType,
    plannedArea: '' as number | '',
  })

  const [decomposeModalOpen, setDecomposeModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [subTaskForm, setSubTaskForm] = useState({
    regionId: '',
    cropType: 'wheat' as CropType,
    plannedArea: '' as number | '',
    entityType: '' as EntityType | '',
    plotIds: [] as string[],
  })

  useEffect(() => {
    fetchTasks()
    fetchRegions()
    fetchAllPlots()
    fetchAllEntities()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const response = await api.get<{ data: TaskType[] }>('/tasks')
    if (response.success && response.data) {
      const rawTasks = Array.isArray(response.data) ? response.data : (response.data as any).data || response.data
      const taskTree = buildTaskTree(rawTasks)
      setTasks(taskTree)
    }
    setLoading(false)
  }

  const flattenRegions = (list: any[]): Region[] => {
    const result: Region[] = []
    const walk = (items: any[]) => {
      for (const item of items) {
        result.push({
          id: item.id,
          name: item.name,
          level: item.level,
          parentId: item.parentId ?? null,
        })
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children)
        }
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

  const fetchAllPlots = async () => {
    const response = await api.get<{ plots: Plot[] }>('/plots?pageSize=1000')
    if (response.success && response.data) {
      const plotList = (response.data as any).plots || (Array.isArray(response.data) ? response.data : [])
      setAllPlots(plotList)
    }
  }

  const fetchAllEntities = async () => {
    const response = await api.get<any>('/entities?pageSize=1000')
    if (response.success && response.data) {
      const entityList = (response.data as any).entities || (Array.isArray(response.data) ? response.data : [])
      setAllEntities(entityList)
    }
  }

  const buildTaskTree = (flatTasks: TaskType[]): TaskNode[] => {
    const nodeMap = new Map<string, TaskNode>()
    const roots: TaskNode[] = []

    flatTasks.forEach(task => {
      nodeMap.set(task.id, { ...task, children: [] })
    })

    flatTasks.forEach(task => {
      const node = nodeMap.get(task.id)!
      if (task.parentTaskId) {
        const parent = nodeMap.get(task.parentTaskId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const getTaskLevel = (task: TaskNode): 'province' | 'city' | 'county' => {
    if (!task.parentTaskId) return 'province'
    const allFlat = flattenTasks(tasks)
    const parentTask = allFlat.find(t => t.id === task.parentTaskId)
    if (!parentTask?.parentTaskId) return 'city'
    return 'county'
  }

  const flattenTasks = (nodes: TaskNode[]): TaskNode[] => {
    const result: TaskNode[] = []
    const walk = (list: TaskNode[]) => {
      for (const node of list) {
        result.push(node)
        if (node.children) walk(node.children)
      }
    }
    walk(nodes)
    return result
  }

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedIds(newExpanded)
  }

  const openDecomposeModal = (task: TaskNode) => {
    setSelectedTask(task)
    setShowAddForm(false)
    setSubTaskForm({
      regionId: '',
      cropType: task.cropType,
      plannedArea: '' as number | '',
      entityType: '' as EntityType | '',
      plotIds: [],
    })
    setDecomposeModalOpen(true)
  }

  const getChildRegions = (regionId: string): Region[] => {
    const region = regions.find(r => r.id === regionId)
    if (!region) return []
    if (region.level === 1) {
      return regions.filter(r => r.parentId === regionId && r.level === 2)
    }
    if (region.level === 2) {
      return regions.filter(r => r.parentId === regionId && r.level === 3)
    }
    return []
  }

  const getExistingChildRegionIds = (task: TaskNode): Set<string> => {
    return new Set((task.children || []).map(c => c.regionId))
  }

  const getAvailableChildRegions = (task: TaskNode): Region[] => {
    const existingIds = getExistingChildRegionIds(task)
    return getChildRegions(task.regionId).filter(r => !existingIds.has(r.id))
  }

  const getAllocatedArea = (task: TaskNode): number => {
    return (task.children || []).reduce((sum, c) => sum + c.plannedArea, 0)
  }

  const getPlotsForRegion = (regionId: string) => {
    const childCountyIds = regions
      .filter(r => r.parentId === regionId && r.level === 3)
      .map(r => r.id)
    const targetIds = [regionId, ...childCountyIds]
    return allPlots
      .filter(p => {
        const entity = allEntities.find(e => e.id === p.entityId)
        return entity && targetIds.includes(entity.regionId || '')
      })
      .map(p => ({ value: p.id, label: p.name, subLabel: `${Math.round(p.area)}亩` }))
  }

  const getRegionName = (regionId: string): string => {
    const region = regions.find(r => r.id === regionId)
    return region?.name || regionId
  }

  const handleAddSubTask = async () => {
    if (!selectedTask || !subTaskForm.regionId || !subTaskForm.plannedArea) {
      alert('请选择行政区划并填写计划面积')
      return
    }

    setSubmitting(true)
    const response = await api.post(`/tasks/${selectedTask.id}/decompose`, {
      subTasks: [{
        name: `${getRegionName(subTaskForm.regionId)}${selectedTask.year}年${cropTypeLabels[subTaskForm.cropType]}任务`,
        regionId: subTaskForm.regionId,
        cropType: subTaskForm.cropType,
        plannedArea: Number(subTaskForm.plannedArea),
        entityType: subTaskForm.entityType || undefined,
        plotIds: subTaskForm.plotIds.length > 0 ? subTaskForm.plotIds : undefined,
      }]
    })
    setSubmitting(false)

    if (response.success) {
      const refreshedTree = await refetchSingleTask()
      setTasks(refreshedTree)
      const refreshedTask = flattenTasks(refreshedTree).find(t => t.id === selectedTask.id)
      setSelectedTask(refreshedTask || selectedTask)
      setShowAddForm(false)
      setSubTaskForm({
        regionId: '',
        cropType: selectedTask.cropType,
        plannedArea: '' as number | '',
        entityType: '' as EntityType | '',
        plotIds: [],
      })
    } else {
      alert(response.error || '分配失败')
    }
  }

  const refetchSingleTask = async (): Promise<TaskNode[]> => {
    const response = await api.get<{ data: TaskType[] }>('/tasks')
    if (response.success && response.data) {
      const rawTasks = Array.isArray(response.data) ? response.data : (response.data as any).data || response.data
      return buildTaskTree(rawTasks)
    }
    return tasks
  }

  const handleCreate = async () => {
    if (!createData.name || !createData.regionId || !createData.cropType || !createData.plannedArea) {
      alert('请填写完整信息')
      return
    }

    setCreateSubmitting(true)
    const response = await api.post('/tasks', {
      name: createData.name,
      year: createData.year,
      regionId: createData.regionId,
      cropType: createData.cropType,
      plannedArea: Number(createData.plannedArea),
    })
    setCreateSubmitting(false)

    if (response.success) {
      setCreateModalOpen(false)
      fetchTasks()
    } else {
      alert(response.error || '创建失败')
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('确定要删除此任务吗？')) return
    const response = await api.delete(`/tasks/${taskId}`)
    if (response.success) {
      fetchTasks()
    } else {
      alert(response.error || '删除失败')
    }
  }

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = { province: '省级', city: '市级', county: '县级' }
    return labels[level] || level
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      province: 'bg-purple-100 text-purple-800',
      city: 'bg-blue-100 text-blue-800',
      county: 'bg-green-100 text-green-800',
    }
    return colors[level] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const renderTaskNode = (task: TaskNode, depth: number = 0) => {
    const isExpanded = expandedIds.has(task.id)
    const hasChildren = task.children && task.children.length > 0
    const level = getTaskLevel(task)
    const canDecompose = level !== 'county'

    return (
      <div key={task.id} className="select-none">
        <div
          className={`flex items-center gap-3 py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-100`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(task.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 truncate">
                {task.name || task.regionName || getRegionName(task.regionId)}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${getLevelColor(level)}`}>
                {getLevelLabel(level)}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(task.status)}`}>
                {taskStatusLabels[task.status as keyof typeof taskStatusLabels] || task.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{task.year}年</span>
              <span>作物: {cropTypeLabels[task.cropType]}</span>
              <span>计划面积: {task.plannedArea.toLocaleString()} 亩</span>
              {level !== 'province' && task.entityType && <span>主体: {entityTypeLabels[task.entityType]}</span>}
              {level !== 'province' && task.plotIds && task.plotIds.length > 0 && <span>地块: {task.plotIds.length} 个</span>}
              {canDecompose && hasChildren && (
                <span className="text-blue-600">
                  已分配: {getAllocatedArea(task).toLocaleString()} 亩
                  ({Math.round(getAllocatedArea(task) / task.plannedArea * 100)}%)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canDecompose && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openDecomposeModal(task)
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                分配
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(task.id)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {task.children!.map(child => renderTaskNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const provinceRegions = regions.filter(r => r.level === 1)
  const plotOptions = allPlots.map(p => ({ value: p.id, label: p.name, subLabel: `${Math.round(p.area)}亩` }))

  const currentSelectedTask = selectedTask
  const decomposeLevel = currentSelectedTask ? getTaskLevel(currentSelectedTask) : 'province'
  const isProvinceToCity = decomposeLevel === 'province'
  const isCityToCounty = decomposeLevel === 'city'
  const availableRegions = currentSelectedTask ? getAvailableChildRegions(currentSelectedTask) : []

  const selectedRegionPlots = subTaskForm.regionId
    ? getPlotsForRegion(subTaskForm.regionId)
    : plotOptions

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务分解</h1>
          <p className="text-gray-500 mt-1">省级对16市年度播种面积分解 · 市级分解下达所辖县区</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchTasks} loading={loading}>
            刷新
          </Button>
          <Button onClick={() => {
            setCreateData({
              name: '',
              year: new Date().getFullYear(),
              regionId: '',
              cropType: 'wheat',
              plannedArea: '',
            })
            setCreateModalOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            新建任务计划
          </Button>
        </div>
      </div>

      <Card title="播种面积任务分解" className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="w-16 h-16 mb-3" />
            <p>暂无任务数据</p>
            <p className="text-sm mt-1">点击"新建任务计划"创建省级播种面积任务</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => renderTaskNode(task))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建播种面积任务计划"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button onClick={handleCreate} loading={createSubmitting}>创建</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                任务名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入任务名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年度 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={createData.year}
                onChange={(e) => setCreateData({ ...createData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作物类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={createData.cropType}
                onChange={(e) => setCreateData({ ...createData, cropType: e.target.value as CropType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(cropTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                行政区划（省级）<span className="text-red-500">*</span>
              </label>
              <select
                value={createData.regionId}
                onChange={(e) => setCreateData({ ...createData, regionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择省份</option>
                {provinceRegions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                计划面积（亩）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={createData.plannedArea}
                onChange={(e) => setCreateData({ ...createData, plannedArea: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入计划面积"
                min="0"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={decomposeModalOpen}
        onClose={() => setDecomposeModalOpen(false)}
        title={`分配播种面积 — ${currentSelectedTask?.name || currentSelectedTask?.regionName || getRegionName(currentSelectedTask?.regionId || '')}`}
        size="xl"
        footer={<></>}
      >
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  {isProvinceToCity ? '省级 → 市级分配' : '市级 → 县级分配'}
                </p>
                <p className="mt-1">
                  将 <span className="font-semibold">{currentSelectedTask?.name || currentSelectedTask?.regionName || getRegionName(currentSelectedTask?.regionId || '')}</span> 的
                  <span className="font-semibold text-blue-700"> {currentSelectedTask?.plannedArea?.toLocaleString()} 亩</span>
                  <span className="mx-1">{cropTypeLabels[currentSelectedTask?.cropType || 'wheat']}</span>
                  播种面积分配到{isProvinceToCity ? '各市' : '所辖县区'}。
                  选择下级区域并填写分配信息，逐条添加。
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">分配进度</span>
                <span className={`font-medium ${
                  (() => {
                    if (!currentSelectedTask) return 'text-gray-900'
                    const allocated = getAllocatedArea(currentSelectedTask)
                    if (allocated > currentSelectedTask.plannedArea) return 'text-red-600'
                    if (allocated === currentSelectedTask.plannedArea) return 'text-green-600'
                    return 'text-gray-900'
                  })()
                }`}>
                  {currentSelectedTask ? getAllocatedArea(currentSelectedTask).toLocaleString() : 0} / {currentSelectedTask?.plannedArea?.toLocaleString()} 亩
                </span>
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    (() => {
                      if (!currentSelectedTask) return 'bg-blue-500'
                      const pct = (getAllocatedArea(currentSelectedTask) / currentSelectedTask.plannedArea) * 100
                      if (pct > 100) return 'bg-red-500'
                      if (pct >= 99.9) return 'bg-green-500'
                      return 'bg-blue-500'
                    })()
                  }`}
                  style={{ width: `${Math.min(currentSelectedTask ? (getAllocatedArea(currentSelectedTask) / currentSelectedTask.plannedArea) * 100 : 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 min-w-[140px]">
              {(() => {
                if (!currentSelectedTask) return null
                const allocated = getAllocatedArea(currentSelectedTask)
                const remaining = currentSelectedTask.plannedArea - allocated
                if (remaining > 0) return <span className="text-amber-600">剩余 {remaining.toLocaleString()} 亩待分配</span>
                if (remaining === 0) return <span className="text-green-600 flex items-center gap-1 justify-end"><CheckCircle2 className="w-3 h-3" />分配完成</span>
                return <span className="text-red-600">超出 {Math.abs(remaining).toLocaleString()} 亩</span>
              })()}
            </div>
          </div>

          {currentSelectedTask && (currentSelectedTask.children || []).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">已分配的{isProvinceToCity ? '市级' : '县级'}任务</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">行政区划</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">作物类型</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">计划面积（亩）</th>
                      {isCityToCounty && <th className="px-3 py-2 text-left font-medium text-gray-600">承担主体类型</th>}
                      {isCityToCounty && <th className="px-3 py-2 text-left font-medium text-gray-600">关联地块</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(currentSelectedTask.children || []).map(child => (
                      <tr key={child.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {child.name || child.regionName || getRegionName(child.regionId)}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{cropTypeLabels[child.cropType]}</td>
                        <td className="px-3 py-2 text-gray-900">{child.plannedArea.toLocaleString()}</td>
                        {isCityToCounty && (
                          <td className="px-3 py-2 text-gray-700">
                            {child.entityType ? entityTypeLabels[child.entityType] : '-'}
                          </td>
                        )}
                        {isCityToCounty && (
                          <td className="px-3 py-2 text-gray-700">
                            {child.plotIds && child.plotIds.length > 0 ? `${child.plotIds.length} 个` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium">
                    <tr>
                      <td className="px-3 py-2 text-gray-700">合计</td>
                      <td className="px-3 py-2"></td>
                      <td className={`px-3 py-2 ${
                        getAllocatedArea(currentSelectedTask) > currentSelectedTask.plannedArea
                          ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {getAllocatedArea(currentSelectedTask).toLocaleString()} 亩
                      </td>
                      {isCityToCounty && <td colSpan={2}></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            {availableRegions.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">
                      新增{isProvinceToCity ? '市级' : '县级'}分配
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      点击新增后录入一条分配数据，保存后可继续新增下一条。
                    </p>
                  </div>
                  {!showAddForm && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      新增
                    </Button>
                  )}
                </div>

                {showAddForm && (
                  <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {isProvinceToCity ? '选择市' : '选择县区'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={subTaskForm.regionId}
                          onChange={(e) => setSubTaskForm({ ...subTaskForm, regionId: e.target.value, plotIds: [] })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">请选择{isProvinceToCity ? '市' : '县区'}</option>
                          {availableRegions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          作物类型 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={subTaskForm.cropType}
                          onChange={(e) => setSubTaskForm({ ...subTaskForm, cropType: e.target.value as CropType })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {Object.entries(cropTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          计划面积（亩）<span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={subTaskForm.plannedArea}
                          onChange={(e) => setSubTaskForm({ ...subTaskForm, plannedArea: e.target.value ? Number(e.target.value) : '' as number | '' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="请输入计划面积"
                          min="0"
                        />
                      </div>
                      {isCityToCounty && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            承担主体类型
                          </label>
                          <select
                            value={subTaskForm.entityType}
                            onChange={(e) => setSubTaskForm({ ...subTaskForm, entityType: e.target.value as EntityType | '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">请选择</option>
                            {Object.entries(entityTypeLabels).map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {isCityToCounty && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            关联地块
                          </label>
                          <MultiSelect
                            options={selectedRegionPlots}
                            value={subTaskForm.plotIds}
                            onChange={(ids) => setSubTaskForm({ ...subTaskForm, plotIds: ids })}
                            placeholder={subTaskForm.regionId
                              ? `该区域 ${selectedRegionPlots.length} 个可选地块`
                              : '请先选择县区'}
                            disabled={!subTaskForm.regionId}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowAddForm(false)
                          if (currentSelectedTask) {
                            setSubTaskForm({
                              regionId: '',
                              cropType: currentSelectedTask.cropType,
                              plannedArea: '' as number | '',
                              entityType: '' as EntityType | '',
                              plotIds: [],
                            })
                          }
                        }}
                      >
                        取消
                      </Button>
                      <Button onClick={handleAddSubTask} loading={submitting}>
                        保存
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                {currentSelectedTask && (currentSelectedTask.children || []).length > 0
                  ? '所有下级区域已分配完毕'
                  : '没有可分配的下级区域'}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
