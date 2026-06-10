import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/utils/api'
import type { Region, WeatherWarning, DisasterRecord } from '../../../shared/types'
import { warningTypeLabels, warningLevelLabels, disasterTypeLabels } from '../../../shared/types'
import { AlertTriangle, CloudLightning, Flame, Droplets, Wind, Bug, ThermometerSun, Snowflake, X, MapPin, Eye } from 'lucide-react'

const mapCenter: [number, number] = [31.8619, 117.2837]

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 7) }, [center, map])
  return null
}

const levelColors: Record<string, string> = {
  red: '#dc2626', orange: '#ea580c', yellow: '#eab308', blue: '#3b82f6'
}

const levelRadii: Record<string, number> = {
  red: 28, orange: 22, yellow: 18, blue: 14
}

const levelGlow: Record<string, string> = {
  red: 'shadow-red-500/50', orange: 'shadow-orange-500/50', yellow: 'shadow-yellow-500/50', blue: 'shadow-blue-500/50'
}

const typeColors: Record<string, string> = {
  drought: '#b45309', flood: '#2563eb', typhoon: '#7c3aed', hail: '#0891b2', frost: '#0ea5e9', pest: '#16a34a', other: '#6b7280'
}

const warningTypeIcons: Record<string, typeof AlertTriangle> = {
  typhoon: Wind, drought: Flame, flood: Droplets, frost: Snowflake, heatwave: ThermometerSun, pest: Bug
}

export default function DisasterCommandMap() {
  const [warnings, setWarnings] = useState<WeatherWarning[]>([])
  const [records, setRecords] = useState<DisasterRecord[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWarning, setSelectedWarning] = useState<WeatherWarning | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<DisasterRecord | null>(null)
  const [focusPosition, setFocusPosition] = useState<[number, number] | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [warningsRes, recordsRes, regionsRes] = await Promise.all([
      api.get<WeatherWarning[]>('/disaster/warnings'),
      api.get<DisasterRecord[]>('/disaster/records'),
      api.get<Region[]>('/regions')
    ])
    if (warningsRes.success && warningsRes.data) setWarnings(warningsRes.data)
    if (recordsRes.success && recordsRes.data) setRecords(recordsRes.data)
    if (regionsRes.success && regionsRes.data) setRegions(regionsRes.data)
    setLoading(false)
  }

  function getRegionName(id: string): string {
    const flatRegions: Region[] = []
    const flatten = (items: Region[]) => {
      items.forEach(item => {
        flatRegions.push(item)
        if (item.children?.length) flatten(item.children)
      })
    }
    flatten(regions)
    const regionMap = new Map<string, Region>()
    flatRegions.forEach(r => regionMap.set(r.id, r))
    const buildPath = (rid: string): string => {
      const region = regionMap.get(rid)
      if (!region) return rid
      if (region.parentId) return buildPath(region.parentId) + '-' + region.name
      return region.name
    }
    return buildPath(id)
  }

  function getWarningPosition(idx: number): [number, number] {
    return [30.5 + (idx % 5) * 0.6, 116.0 + Math.floor(idx / 5) * 0.6]
  }

  function getRecordPosition(idx: number): [number, number] {
    return [30.8 + (idx % 5) * 0.5, 116.3 + Math.floor(idx / 5) * 0.5]
  }

  function handleFocusWarning(warning: WeatherWarning, idx: number) {
    setSelectedWarning(warning)
    setFocusPosition(getWarningPosition(idx))
  }

  function handleFocusRecord(record: DisasterRecord, idx: number) {
    setSelectedRecord(record)
    setFocusPosition(getRecordPosition(idx))
  }

  function handleViewRecordDetail(record: DisasterRecord) {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900/50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-400 text-sm">加载中...</div>
        </div>
      </div>
    )
  }

  const activeWarnings = warnings.filter(w => new Date(w.endTime) > new Date())
  const criticalWarnings = warnings.filter(w => w.level === 'red' || w.level === 'orange')

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={7} className="h-full w-full" zoomControl={false}>
          <MapController center={focusPosition || mapCenter} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

          {warnings.map((warning, idx) => (
            <CircleMarker
              key={warning.id}
              center={getWarningPosition(idx)}
              radius={levelRadii[warning.level] || 18}
              pathOptions={{ fillColor: levelColors[warning.level] || '#666', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.6 }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{warning.title}</h3>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: levelColors[warning.level] + '30', color: levelColors[warning.level] }}>
                      {warningLevelLabels[warning.level]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>类型: {warningTypeLabels[warning.type]}</p>
                    <p>{new Date(warning.startTime).toLocaleDateString('zh-CN')} ~ {new Date(warning.endTime).toLocaleDateString('zh-CN')}</p>
                    {warning.content && <p className="mt-1">{warning.content}</p>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {records.map((record, idx) => (
            <CircleMarker
              key={record.id}
              center={getRecordPosition(idx)}
              radius={16}
              pathOptions={{ fillColor: typeColors[record.type] || '#6b7280', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.7 }}
              eventHandlers={{ click: () => handleViewRecordDetail(record) }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-1">{disasterTypeLabels[record.type]}</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>{new Date(record.occurTime).toLocaleDateString('zh-CN')}</p>
                    <p>受灾面积: {record.affectedArea}亩</p>
                    <p>预估损失: {record.estimatedLoss}万元</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md rounded-lg p-3 z-[1000] border border-slate-700/50 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2">预警级别</h4>
            <div className="space-y-1.5">
              {Object.entries(warningLevelLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: levelColors[key] }} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-2">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">灾害类型</h4>
            <div className="space-y-1.5">
              {Object.entries(disasterTypeLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[key] }} />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="w-80 bg-slate-900/60 backdrop-blur-md border-l border-slate-700/50 flex flex-col">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-amber-400" />
              气象预警
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
              {activeWarnings.length} 活跃
            </span>
          </div>

          {criticalWarnings.length > 0 && (
            <div className="bg-gradient-to-r from-red-500/20 to-amber-500/20 rounded-lg p-3 border border-red-400/30 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs font-semibold text-red-300">高级别预警</span>
              </div>
              <p className="text-xs text-red-200/70">当前有 {criticalWarnings.length} 条红色/橙色预警</p>
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {warnings.length === 0 ? (
              <div className="text-center py-6">
                <CloudLightning className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">暂无预警信息</p>
              </div>
            ) : (
              warnings.map((warning, idx) => {
                const Icon = warningTypeIcons[warning.type] || AlertTriangle
                return (
                  <div
                    key={warning.id}
                    onClick={() => handleFocusWarning(warning, idx)}
                    className="group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-3 cursor-pointer transition-all border border-slate-700/30 hover:border-amber-400/30"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md mt-0.5" style={{ backgroundColor: levelColors[warning.level] + '20' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: levelColors[warning.level] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{warning.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: levelColors[warning.level] + '20', color: levelColors[warning.level] }}>
                            {warningLevelLabels[warning.level]}
                          </span>
                          <span className="text-xs text-slate-500">{warningTypeLabels[warning.type]}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {new Date(warning.startTime).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              灾情档案
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-300">
              {records.length} 条
            </span>
          </div>

          <div className="space-y-2">
            {records.length === 0 ? (
              <div className="text-center py-6">
                <Flame className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">暂无灾情记录</p>
              </div>
            ) : (
              records.map((record, idx) => (
                <div
                  key={record.id}
                  onClick={() => handleFocusRecord(record, idx)}
                  className="group bg-slate-800/30 hover:bg-slate-800/50 rounded-lg p-3 cursor-pointer transition-all border border-slate-700/30 hover:border-rose-400/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: typeColors[record.type] + '20', color: typeColors[record.type] }}>
                        {disasterTypeLabels[record.type]}
                      </span>
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {record.regionName || getRegionName(record.regionId)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewRecordDetail(record) }}
                      className="p-1 rounded hover:bg-slate-700/50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(record.occurTime).toLocaleDateString('zh-CN')}</span>
                    <span>受灾 {record.affectedArea}亩</span>
                    {record.estimatedLoss > 0 && <span className="text-rose-400">损失 {record.estimatedLoss}万</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {detailModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setDetailModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
          <div className="relative bg-slate-900/90 backdrop-blur-md rounded-2xl w-full max-w-lg border border-slate-700/50 shadow-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{disasterTypeLabels[selectedRecord.type]}</h3>
                  <p className="text-xs text-slate-400">灾情详情</p>
                </div>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">发生时间</div>
                  <div className="text-sm font-medium text-white">{new Date(selectedRecord.occurTime).toLocaleString('zh-CN')}</div>
                </div>
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">受灾地区</div>
                  <div className="text-sm font-medium text-white truncate">{selectedRecord.regionName || getRegionName(selectedRecord.regionId)}</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl p-3 border border-amber-400/20 text-center">
                  <div className="text-lg font-bold text-amber-300">{selectedRecord.affectedArea}</div>
                  <div className="text-xs text-slate-500">受灾(亩)</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-xl p-3 border border-orange-400/20 text-center">
                  <div className="text-lg font-bold text-orange-300">{selectedRecord.damagedArea}</div>
                  <div className="text-xs text-slate-500">成灾(亩)</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-xl p-3 border border-red-400/20 text-center">
                  <div className="text-lg font-bold text-red-300">{selectedRecord.lostArea}</div>
                  <div className="text-xs text-slate-500">绝收(亩)</div>
                </div>
                <div className="bg-gradient-to-br from-rose-500/20 to-rose-500/10 rounded-xl p-3 border border-rose-400/20 text-center">
                  <div className="text-lg font-bold text-rose-300">{selectedRecord.estimatedLoss}</div>
                  <div className="text-xs text-slate-500">损失(万)</div>
                </div>
              </div>

              {selectedRecord.description && (
                <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">灾情描述</div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedRecord.description}</p>
                </div>
              )}

              {selectedRecord.aiAnalysis && (
                <div className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-xl p-3 border border-purple-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-purple-300">AI 分析</span>
                  </div>
                  <p className="text-xs text-purple-200/80 whitespace-pre-wrap leading-relaxed">{selectedRecord.aiAnalysis}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}