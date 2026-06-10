import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/utils/api'
import type { Region, Task, SowingProgress, HarvestProgress, Entity } from '../../../shared/types'
import { cropTypeLabels, taskStatusLabels } from '../../../shared/types'
import { TrendingUp, TrendingDown, Target, BarChart3, Users, Calendar, ChevronDown, X } from 'lucide-react'

interface RegionProgress {
  regionId: string
  regionName: string
  plannedArea: number
  sownArea: number
  harvestedArea: number
  sowingProgress: number
  harvestProgress: number
  tasks: Task[]
  sowingDetails: SowingProgress[]
  harvestDetails: HarvestProgress[]
  entities: Entity[]
  lat: number
  lng: number
}

interface SummaryStats {
  totalPlannedArea: number
  totalSownArea: number
  totalHarvestedArea: number
  avgSowingProgress: number
  avgHarvestProgress: number
}

const mapCenter: [number, number] = [31.8619, 117.2837]

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 7) }, [center, map])
  return null
}

export default function GrainProductionMap() {
  const [regions, setRegions] = useState<Region[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [sowingProgress, setSowingProgress] = useState<SowingProgress[]>([])
  const [harvestProgress, setHarvestProgress] = useState<HarvestProgress[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [regionProgressList, setRegionProgressList] = useState<RegionProgress[]>([])
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalPlannedArea: 0, totalSownArea: 0, totalHarvestedArea: 0,
    avgSowingProgress: 0, avgHarvestProgress: 0
  })
  const [selectedRegion, setSelectedRegion] = useState<RegionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const [regionsRes, tasksRes, sowingRes, harvestRes, entitiesRes] = await Promise.all([
      api.get<Region[]>('/regions'),
      api.get<Task[]>('/tasks'),
      api.get<SowingProgress[]>('/sowing/progress'),
      api.get<HarvestProgress[]>('/harvest/progress'),
      api.get<{ entities: Entity[] }>('/entities')
    ])

    if (!regionsRes.success || !regionsRes.data) { setError(regionsRes.error || '获取区域数据失败'); setLoading(false); return }
    if (!tasksRes.success || !tasksRes.data) { setError(tasksRes.error || '获取任务数据失败'); setLoading(false); return }
    if (!sowingRes.success || !sowingRes.data) { setError(sowingRes.error || '获取播种进度数据失败'); setLoading(false); return }
    if (!harvestRes.success || !harvestRes.data) { setError(harvestRes.error || '获取收获进度数据失败'); setLoading(false); return }
    if (!entitiesRes.success || !entitiesRes.data) { setError(entitiesRes.error || '获取主体数据失败'); setLoading(false); return }

    const regionsData = regionsRes.data
    const tasksData = tasksRes.data
    const sowingData = Array.isArray(sowingRes.data) ? sowingRes.data : []
    const harvestData = Array.isArray(harvestRes.data) ? harvestRes.data : (harvestRes.data as any).data || []
    const entitiesData = Array.isArray(entitiesRes.data) ? entitiesRes.data : entitiesRes.data.entities || []

    setRegions(regionsData)
    setTasks(tasksData)
    setSowingProgress(sowingData)
    setHarvestProgress(harvestData)
    setEntities(entitiesData)

    const flatRegions = flattenRegions(regionsData)
    const progressList = calculateRegionProgress(flatRegions, tasksData, sowingData, harvestData, entitiesData)
    setRegionProgressList(progressList)

    const summary = calculateSummaryStats(progressList)
    setSummaryStats(summary)

    setLoading(false)
  }

  function flattenRegions(regions: Region[]): Region[] {
    const result: Region[] = []
    function flatten(list: Region[]) {
      list.forEach(region => {
        result.push(region)
        if (region.children?.length) flatten(region.children)
      })
    }
    flatten(regions)
    return result
  }

  function calculateRegionProgress(flatRegions: Region[], tasks: Task[], sowingProgress: SowingProgress[], harvestProgress: HarvestProgress[], entities: Entity[]): RegionProgress[] {
    const result: RegionProgress[] = []
    flatRegions.forEach((region, idx) => {
      const regionTasks = tasks.filter(t => t.regionId === region.id)
      const regionSowing = sowingProgress.filter(s => s.regionId === region.id)
      const regionHarvest = harvestProgress.filter(h => h.regionId === region.id)
      const regionEntities = entities.filter(e => e.regionId === region.id)

      const plannedArea = regionTasks.reduce((sum, t) => sum + t.plannedArea, 0)
      const sownArea = regionSowing.reduce((sum, s) => sum + s.sownArea, 0)
      const harvestedArea = regionHarvest.reduce((sum, h) => sum + h.harvestedArea, 0)

      const sowingProg = plannedArea > 0 ? (sownArea / plannedArea) * 100 : 0
      const harvestProg = plannedArea > 0 ? (harvestedArea / plannedArea) * 100 : 0

      const baseLat = 30.5 + (idx % 5) * 0.6
      const baseLng = 116.0 + Math.floor(idx / 5) * 0.6

      result.push({
        regionId: region.id, regionName: region.name, plannedArea, sownArea, harvestedArea,
        sowingProgress: sowingProg, harvestProgress: harvestProg,
        tasks: regionTasks, sowingDetails: regionSowing, harvestDetails: regionHarvest, entities: regionEntities,
        lat: baseLat, lng: baseLng
      })
    })
    return result
  }

  function calculateSummaryStats(progressList: RegionProgress[]): SummaryStats {
    const totalPlannedArea = progressList.reduce((sum, r) => sum + r.plannedArea, 0)
    const totalSownArea = progressList.reduce((sum, r) => sum + r.sownArea, 0)
    const totalHarvestedArea = progressList.reduce((sum, r) => sum + r.harvestedArea, 0)
    const avgSowingProgress = totalPlannedArea > 0 ? (totalSownArea / totalPlannedArea) * 100 : 0
    const avgHarvestProgress = totalPlannedArea > 0 ? (totalHarvestedArea / totalPlannedArea) * 100 : 0
    return { totalPlannedArea, totalSownArea, totalHarvestedArea, avgSowingProgress, avgHarvestProgress }
  }

  function getMarkerColor(progress: number): string {
    if (progress >= 70) return '#10b981'
    if (progress >= 30) return '#f59e0b'
    return '#ef4444'
  }

  function getMarkerSize(plannedArea: number): number {
    const maxArea = Math.max(...regionProgressList.map(r => r.plannedArea), 1)
    return 8 + (plannedArea / maxArea) * 20
  }

  function handleRegionClick(region: RegionProgress) { setSelectedRegion(region) }
  function handleCloseModal() { setSelectedRegion(null) }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400 text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50">
        <div className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/30">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={7} className="h-full w-full" zoomControl={false}>
          <MapController center={mapCenter} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
          {regionProgressList.map(region => (
            <CircleMarker
              key={region.regionId}
              center={[region.lat, region.lng]}
              radius={getMarkerSize(region.plannedArea)}
              pathOptions={{ fillColor: getMarkerColor(region.sowingProgress), color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8 }}
              eventHandlers={{ click: () => handleRegionClick(region) }}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-bold text-sm mb-2">{region.regionName}</h3>
                  <div className="space-y-1 text-xs">
                    <p>计划: <span className="font-semibold">{region.plannedArea.toFixed(0)} 亩</span></p>
                    <p>播种: <span className="font-semibold">{region.sowingProgress.toFixed(1)}%</span></p>
                    <p>收获: <span className="font-semibold">{region.harvestProgress.toFixed(1)}%</span></p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md rounded-lg p-3 z-[1000] border border-slate-700/50">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">进度图例</h3>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-slate-400">≥70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-xs text-slate-400">30-70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-slate-400">&lt;30%</span>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-80 bg-slate-900/60 backdrop-blur-md border-l border-slate-700/50 flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            生产概览
          </h2>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">计划面积</div>
              <div className="text-lg font-bold text-white">{(summaryStats.totalPlannedArea / 10000).toFixed(1)}<span className="text-xs text-slate-500 ml-1">万亩</span></div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">区域总数</div>
              <div className="text-lg font-bold text-white">{regionProgressList.length}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-lg p-3 border border-cyan-400/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-300">播种进度</span>
                </div>
                <div className="flex items-center gap-1">
                  {summaryStats.avgSowingProgress >= 50 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-amber-400" />}
                  <span className="text-sm font-bold text-white">{summaryStats.avgSowingProgress.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.min(summaryStats.avgSowingProgress, 100)}%` }} />
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 rounded-lg p-3 border border-amber-400/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-300">收获进度</span>
                </div>
                <div className="flex items-center gap-1">
                  {summaryStats.avgHarvestProgress >= 50 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-amber-400" />}
                  <span className="text-sm font-bold text-white">{summaryStats.avgHarvestProgress.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: `${Math.min(summaryStats.avgHarvestProgress, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            区域进度
          </h3>
          <div className="space-y-2">
            {regionProgressList.map(region => (
              <div
                key={region.regionId}
                onClick={() => handleRegionClick(region)}
                className="group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-3 cursor-pointer transition-all border border-slate-700/30 hover:border-cyan-400/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white">{region.regionName}</span>
                    {region.sowingProgress < 50 && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{region.plannedArea.toFixed(0)}亩</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">播种</span>
                      <span className="text-slate-300">{region.sowingProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-700/50 rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(region.sowingProgress, 100)}%`, backgroundColor: getMarkerColor(region.sowingProgress) }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">收获</span>
                      <span className="text-slate-300">{region.harvestProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-slate-700/50 rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(region.harvestProgress, 100)}%`, backgroundColor: getMarkerColor(region.harvestProgress) }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {selectedRegion && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
          <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl w-full max-w-2xl border border-slate-700/50 shadow-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
                  <Target className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedRegion.regionName}</h3>
                  <p className="text-xs text-slate-400">区域详情与进度明细</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">计划面积</div>
                  <div className="text-xl font-bold text-white">{selectedRegion.plannedArea.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">亩</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-xl p-4 border border-cyan-400/30">
                  <div className="text-xs text-slate-500 mb-1">已播面积</div>
                  <div className="text-xl font-bold text-cyan-300">{selectedRegion.sownArea.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">亩</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/20 rounded-xl p-4 border border-amber-400/30">
                  <div className="text-xs text-slate-500 mb-1">已收面积</div>
                  <div className="text-xl font-bold text-amber-300">{selectedRegion.harvestedArea.toFixed(0)}</div>
                  <div className="text-xs text-slate-500">亩</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">种植主体</div>
                  <div className="text-xl font-bold text-white">{selectedRegion.entities.length}</div>
                  <div className="text-xs text-slate-500">个</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  任务分解详情
                </h4>
                {selectedRegion.tasks.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">暂无任务数据</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {selectedRegion.tasks.map(task => (
                      <div key={task.id} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-200">{task.name || cropTypeLabels[task.cropType]}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                            task.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/50 text-slate-400'
                          }`}>{taskStatusLabels[task.status]}</span>
                        </div>
                        <div className="text-xs text-slate-500">{cropTypeLabels[task.cropType]} · {task.plannedArea.toFixed(0)}亩</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  播种进度明细
                </h4>
                {selectedRegion.sowingDetails.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">暂无播种进度数据</div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedRegion.sowingDetails.map(detail => (
                      <div key={detail.id} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">{detail.date}</span>
                          <span className="text-sm font-semibold text-cyan-300">{detail.progress.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{detail.sownArea.toFixed(0)} / {detail.plannedArea.toFixed(0)} 亩</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  主要种植主体
                </h4>
                {selectedRegion.entities.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">暂无种植主体数据</div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedRegion.entities.map(entity => (
                      <div key={entity.id} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                        <div className="font-medium text-sm text-slate-200">{entity.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{entity.contactPerson} · {entity.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}