import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AlertTriangle, Plus, FileWarning, CloudSun } from 'lucide-react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { api } from '@/utils/api'
import type { WeatherWarning, DisasterRecord, DisasterType, CropType, Region } from '../../../shared/types'
import { disasterTypeLabels, warningLevelLabels, warningTypeLabels, cropTypeLabels } from '../../../shared/types'

interface PlotOption {
  id: string
  name: string
  area: number
  entityId: string
  entityName: string
}

const defaultCenter: [number, number] = [31.8619, 117.2837]

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.setView(center, zoom) }, [center, zoom, map])
  return null
}

const levelColors: Record<string, string> = {
  red: '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  blue: '#2563eb'
}

const levelBgColors: Record<string, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
}

const warningToDisasterMap: Record<string, DisasterType> = {
  typhoon: 'typhoon',
  drought: 'drought',
  flood: 'flood',
  frost: 'frost',
  heatwave: 'other',
  pest: 'pest',
}

interface RecordForm {
  warningId: string
  type: DisasterType
  regionId: string
  plotId: string
  occurTime: string
  affectedArea: number
  damagedArea: number
  lostArea: number
  estimatedLoss: number
  affectedCrops: CropType[]
  description: string
}

const defaultForm = (warning?: WeatherWarning): RecordForm => ({
  warningId: warning?.id || '',
  type: warning ? (warningToDisasterMap[warning.type] || 'other') : '' as DisasterType,
  regionId: warning?.affectedRegions?.[0] || '',
  plotId: '',
  occurTime: warning?.startTime ? warning.startTime.slice(0, 16) : new Date().toISOString().slice(0, 16),
  affectedArea: 0,
  damagedArea: 0,
  lostArea: 0,
  estimatedLoss: 0,
  affectedCrops: [],
  description: warning ? `${warning.title} - ${warning.content}` : '',
})

export default function DisasterManagement() {
  const [warnings, setWarnings] = useState<WeatherWarning[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [plots, setPlots] = useState<PlotOption[]>([])
  const [loading, setLoading] = useState(true)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [selectedWarning, setSelectedWarning] = useState<WeatherWarning | null>(null)
  const [form, setForm] = useState<RecordForm>(defaultForm())
  const [submitting, setSubmitting] = useState(false)

  const [warningForm, setWarningForm] = useState({
    type: 'flood' as WeatherWarning['type'],
    level: 'yellow' as WeatherWarning['level'],
    title: '',
    content: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
    affectedRegions: [] as string[],
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [warningsRes, regionsRes, plotsRes] = await Promise.all([
      api.get<WeatherWarning[]>('/disaster/warnings'),
      api.get<Region[]>('/regions?level=3'),
      api.get<{ plots: PlotOption[] }>('/plots?pageSize=999'),
    ])
    if (warningsRes.success && warningsRes.data) setWarnings(warningsRes.data)
    if (regionsRes.success && regionsRes.data) setRegions(regionsRes.data)
    if (plotsRes.success && plotsRes.data) {
      const rawPlots = Array.isArray(plotsRes.data) ? plotsRes.data : plotsRes.data.plots
      setPlots(rawPlots.map((p: any) => ({
        id: p.id, name: p.name, area: p.area,
        entityId: p.entityId, entityName: p.entityId,
      })))
    }
    setLoading(false)
  }

  const handleCreateRecord = (warning: WeatherWarning) => {
    setSelectedWarning(warning)
    setForm(defaultForm(warning))
    setRecordModalOpen(true)
  }

  const handleSubmitRecord = async () => {
    if (!form.type || !form.regionId || !form.occurTime) {
      alert('请填写必要字段')
      return
    }
    setSubmitting(true)
    const response = await api.post('/disaster/records', form)
    setSubmitting(false)
    if (response.success) {
      setRecordModalOpen(false)
      fetchData()
    } else {
      alert(response.error || '创建失败')
    }
  }

  const handleSubmitWarning = async () => {
    if (!warningForm.title || !warningForm.type || !warningForm.level) {
      alert('请填写必要字段')
      return
    }
    if (warningForm.affectedRegions.length === 0) {
      alert('请选择至少一个影响区域')
      return
    }
    setSubmitting(true)
    const response = await api.post('/disaster/warnings', {
      title: warningForm.title,
      type: warningForm.type,
      level: warningForm.level,
      content: warningForm.content,
      startTime: warningForm.startTime,
      endTime: warningForm.endTime,
      affectedRegions: warningForm.affectedRegions,
    })
    setSubmitting(false)
    if (response.success) {
      setWarningModalOpen(false)
      setWarningForm({
        type: 'flood', level: 'yellow', title: '', content: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16),
        affectedRegions: [],
      })
      fetchData()
    } else {
      alert(response.error || '发布失败')
    }
  }

  const handleDeleteWarning = async (id: string) => {
    if (!confirm('确定删除该预警？')) return
    const res = await api.delete(`/disaster/warnings/${id}`)
    if (res.success) fetchData()
    else alert(res.error || '删除失败')
  }

  const filteredPlots = form.regionId
    ? plots.filter(p => p.entityId)
    : plots

  const getRegionName = (id: string) => regions.find(r => r.id === id)?.name || id

  const warningMarkers = warnings.map(w => {
    const region = regions.find(r => w.affectedRegions?.includes(r.id))
    const idx = warnings.indexOf(w)
    const baseLat = 30.5 + (idx % 5) * 0.6
    const baseLng = 116.0 + Math.floor(idx / 5) * 0.6
    return {
      ...w,
      position: [baseLat, baseLng] as [number, number],
      regionName: region?.name,
    }
  })

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <CloudSun className="w-6 h-6 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">气象预警</h1>
            <p className="text-sm text-gray-500">卫星地图与气象预警信息</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 mr-4 text-sm">
            <span className="text-gray-600">活跃预警: <strong className="text-red-600">{warnings.filter(w => new Date(w.endTime) > new Date()).length}</strong></span>
          </div>
          <Button onClick={() => setWarningModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            发布预警
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <MapContainer center={defaultCenter} zoom={8} className="h-full w-full" zoomControl={false}>
            <MapController center={defaultCenter} zoom={8} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            />
            {warningMarkers.map(w => (
              <CircleMarker
                key={w.id}
                center={w.position}
                radius={w.level === 'red' ? 28 : w.level === 'orange' ? 22 : w.level === 'yellow' ? 18 : 14}
                fillColor={levelColors[w.level] || '#666'}
                color="#fff"
                weight={2}
                opacity={0.9}
                fillOpacity={0.5}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm">{w.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelBgColors[w.level]}`}>
                        {warningLevelLabels[w.level]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>类型: {warningTypeLabels[w.type]}</p>
                      <p>开始: {new Date(w.startTime).toLocaleString('zh-CN')}</p>
                      <p>结束: {new Date(w.endTime).toLocaleString('zh-CN')}</p>
                      {w.content && <p className="mt-1">{w.content}</p>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 z-[1000]">
            <h4 className="font-bold text-xs mb-2">预警级别</h4>
            <div className="space-y-1">
              {Object.entries(warningLevelLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: levelColors[key] }} />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              预警信息
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">{warnings.length}</span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {warnings.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <CloudSun className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>暂无预警信息</p>
              </div>
            ) : (
              warnings.map(w => (
                <div key={w.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelBgColors[w.level]}`}>
                        {warningLevelLabels[w.level]}
                      </span>
                      <span className="text-xs text-gray-500">{warningTypeLabels[w.type]}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteWarning(w.id)}
                      className="text-gray-300 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">{w.title}</h3>
                  {w.content && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{w.content}</p>
                  )}
                  <div className="text-xs text-gray-400 mb-2">
                    {new Date(w.startTime).toLocaleDateString('zh-CN')} ~ {new Date(w.endTime).toLocaleDateString('zh-CN')}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCreateRecord(w)}
                    className="w-full text-xs"
                  >
                    <FileWarning className="w-3 h-3 mr-1" />
                    生成灾情档案
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        title="生成灾情档案"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecordModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmitRecord} loading={submitting}>创建档案</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedWarning && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelBgColors[selectedWarning.level]}`}>
                  {warningLevelLabels[selectedWarning.level]}
                </span>
                <span className="text-sm font-medium text-blue-900">{selectedWarning.title}</span>
              </div>
              <p className="text-xs text-blue-700">{selectedWarning.content}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">灾害类型 <span className="text-red-500">*</span></label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DisasterType })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(disasterTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">受灾地区 <span className="text-red-500">*</span></label>
              <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value, plotId: '' })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关联地块</label>
              <select value={form.plotId} onChange={(e) => {
                const plot = filteredPlots.find(p => p.id === e.target.value)
                setForm({ ...form, plotId: e.target.value, affectedArea: plot ? plot.area : form.affectedArea })
              }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">请选择地块</option>
                {filteredPlots.map(p => <option key={p.id} value={p.id}>{p.name} ({p.area}亩)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发生时间 <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.occurTime} onChange={(e) => setForm({ ...form, occurTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">受灾面积(亩)</label>
              <input type="number" value={form.affectedArea} onChange={(e) => setForm({ ...form, affectedArea: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成灾面积(亩)</label>
              <input type="number" value={form.damagedArea} onChange={(e) => setForm({ ...form, damagedArea: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">绝收面积(亩)</label>
              <input type="number" value={form.lostArea} onChange={(e) => setForm({ ...form, lostArea: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预估产量损失(万元)</label>
              <input type="number" value={form.estimatedLoss} onChange={(e) => setForm({ ...form, estimatedLoss: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">受灾作物</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(cropTypeLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.affectedCrops.includes(key as CropType)}
                      onChange={(e) => {
                        const crops = e.target.checked
                          ? [...form.affectedCrops, key as CropType]
                          : form.affectedCrops.filter(c => c !== key)
                        setForm({ ...form, affectedCrops: crops })
                      }}
                      className="w-3 h-3"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">灾情描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入灾情描述" />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={warningModalOpen}
        onClose={() => setWarningModalOpen(false)}
        title="发布气象预警"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWarningModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmitWarning} loading={submitting}>发布</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预警标题 <span className="text-red-500">*</span></label>
            <input type="text" value={warningForm.title} onChange={(e) => setWarningForm({ ...warningForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：暴雨黄色预警" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预警类型 <span className="text-red-500">*</span></label>
              <select value={warningForm.type} onChange={(e) => setWarningForm({ ...warningForm, type: e.target.value as WeatherWarning['type'] })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(warningTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">预警级别 <span className="text-red-500">*</span></label>
              <select value={warningForm.level} onChange={(e) => setWarningForm({ ...warningForm, level: e.target.value as WeatherWarning['level'] })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(warningLevelLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={warningForm.startTime} onChange={(e) => setWarningForm({ ...warningForm, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={warningForm.endTime} onChange={(e) => setWarningForm({ ...warningForm, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预警内容</label>
            <textarea value={warningForm.content} onChange={(e) => setWarningForm({ ...warningForm, content: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="请输入预警详细内容" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">影响区域 <span className="text-red-500">*</span></label>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
              {regions.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无区域数据</p>
              ) : (
                <div className="space-y-2">
                  {regions.map(region => (
                    <label key={region.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={warningForm.affectedRegions.includes(region.id)}
                        onChange={(e) => {
                          const selected = e.target.checked
                            ? [...warningForm.affectedRegions, region.id]
                            : warningForm.affectedRegions.filter(id => id !== region.id)
                          setWarningForm({ ...warningForm, affectedRegions: selected })
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{region.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {warningForm.affectedRegions.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">已选择 {warningForm.affectedRegions.length} 个区域</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
