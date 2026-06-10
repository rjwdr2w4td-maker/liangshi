import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/utils/api'
import type { Region, Task, ApiResponse } from '../../../shared/types'
import ProgressBar from '@/components/common/ProgressBar'
import { cropTypeLabels, taskStatusLabels } from '../../../shared/types'

interface RegionTaskData {
  regionId: string
  regionName: string
  plannedArea: number
  completedArea: number
  progress: number
  tasks: Task[]
}

interface RegionWithGeometry extends Region {
  geometry?: GeoJSON.Geometry
  center?: [number, number]
}

const defaultCenter: [number, number] = [32.0603, 118.7969]

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export default function ProductionMap() {
  const [regions, setRegions] = useState<RegionWithGeometry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [regionTasks, setRegionTasks] = useState<RegionTaskData[]>([])
  const [selectedRegion, setSelectedRegion] = useState<RegionWithGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [mapZoom, setMapZoom] = useState(8)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)

    const [regionsRes, tasksRes] = await Promise.all([
      api.get<Region[]>('/regions?level=3'),
      api.get<Task[]>('/tasks')
    ])

    if (!regionsRes.success || !regionsRes.data) {
      setError(regionsRes.error || '获取区域数据失败')
      setLoading(false)
      return
    }

    if (!tasksRes.success || !tasksRes.data) {
      setError(tasksRes.error || '获取任务数据失败')
      setLoading(false)
      return
    }

    const regionsWithGeometry = generateMockGeometry(regionsRes.data)
    setRegions(regionsWithGeometry)
    setTasks(tasksRes.data)

    const regionTaskMap = calculateRegionTasks(regionsRes.data, tasksRes.data)
    setRegionTasks(regionTaskMap)

    setLoading(false)
  }

  function generateMockGeometry(regions: Region[]): RegionWithGeometry[] {
    return regions.map((region, index) => {
      const baseLat = 32.0 + (index % 5) * 0.5
      const baseLng = 118.5 + Math.floor(index / 5) * 0.5
      const offset = 0.2

      return {
        ...region,
        center: [baseLat, baseLng] as [number, number],
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [baseLng - offset, baseLat - offset],
            [baseLng + offset, baseLat - offset],
            [baseLng + offset, baseLat + offset],
            [baseLng - offset, baseLat + offset],
            [baseLng - offset, baseLat - offset]
          ]]
        }
      }
    })
  }

  function calculateRegionTasks(regions: Region[], tasks: Task[]): RegionTaskData[] {
    const regionMap = new Map<string, RegionTaskData>()

    regions.forEach(region => {
      regionMap.set(region.id, {
        regionId: region.id,
        regionName: region.name,
        plannedArea: 0,
        completedArea: 0,
        progress: 0,
        tasks: []
      })
    })

    tasks.forEach(task => {
      const regionData = regionMap.get(task.regionId)
      if (regionData) {
        regionData.tasks.push(task)
        regionData.plannedArea += task.plannedArea
        if (task.status === 'completed') {
          regionData.completedArea += task.plannedArea
        } else if (task.status === 'in_progress') {
          regionData.completedArea += task.plannedArea * 0.5
        }
      }
    })

    regionMap.forEach(data => {
      data.progress = data.plannedArea > 0
        ? Math.round((data.completedArea / data.plannedArea) * 100)
        : 0
    })

    return Array.from(regionMap.values())
  }

  function getRegionStyle(feature: GeoJSON.Feature): L.PathOptions {
    const regionId = feature.properties?.id
    const regionTask = regionTasks.find(rt => rt.regionId === regionId)

    if (!regionTask) {
      return {
        fillColor: '#ccc',
        weight: 2,
        opacity: 1,
        color: '#666',
        fillOpacity: 0.3
      }
    }

    const progress = regionTask.progress
    let fillColor = '#ef4444'
    if (progress >= 70) fillColor = '#22c55e'
    else if (progress >= 30) fillColor = '#eab308'

    return {
      fillColor,
      weight: 2,
      opacity: 1,
      color: '#fff',
      fillOpacity: 0.6
    }
  }

  function onEachFeature(feature: GeoJSON.Feature, layer: L.Layer) {
    const regionId = feature.properties?.id
    const regionTask = regionTasks.find(rt => rt.regionId === regionId)
    const region = regions.find(r => r.id === regionId)

    if (regionTask && region) {
      layer.on({
        click: () => handleRegionClick(region)
      })

      layer.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg mb-2">${regionTask.regionName}</h3>
          <div class="space-y-1 text-sm">
            <p>计划面积: <span class="font-semibold">${regionTask.plannedArea.toFixed(2)} 亩</span></p>
            <p>完成面积: <span class="font-semibold">${regionTask.completedArea.toFixed(2)} 亩</span></p>
            <p>完成进度: <span class="font-semibold">${regionTask.progress}%</span></p>
            <p>任务数量: <span class="font-semibold">${regionTask.tasks.length}</span></p>
          </div>
        </div>
      `)
    }
  }

  function handleRegionClick(region: RegionWithGeometry) {
    setSelectedRegion(region)
    if (region.center) {
      setMapCenter(region.center)
      setMapZoom(10)
    }
  }

  function handleBackToOverview() {
    setSelectedRegion(null)
    setMapCenter(defaultCenter)
    setMapZoom(8)
  }

  const geoJsonData: GeoJSON.GeoJsonObject = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: regions.map(region => ({
        type: 'Feature' as const,
        properties: {
          id: region.id,
          name: region.name
        },
        geometry: region.geometry!
      }))
    }
  }, [regions])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white shadow-md p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">粮食生产一张图</h1>
            {selectedRegion && (
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleBackToOverview}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← 返回总览
                </button>
                <span className="text-gray-500">/</span>
                <span className="text-gray-700">{selectedRegion.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              总区域数: <span className="font-semibold">{regions.length}</span>
            </div>
            <div className="text-sm text-gray-600">
              总任务数: <span className="font-semibold">{tasks.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={true}
        >
          <MapController center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {regions.length > 0 && (
            <GeoJSON
              key={JSON.stringify(geoJsonData)}
              data={geoJsonData}
              style={getRegionStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

        <div className="absolute bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 z-[1000]">
          <h3 className="font-bold text-sm mb-2">图例说明</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span className="text-sm">完成率 ≥ 70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span className="text-sm">完成率 30%-70%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-sm">完成率 &lt; 30%</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-sm">
          <h3 className="font-bold text-sm mb-3">区域任务概览</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {regionTasks.slice(0, 10).map(rt => (
              <div
                key={rt.regionId}
                className="border-b border-gray-200 pb-2 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => {
                  const region = regions.find(r => r.id === rt.regionId)
                  if (region) handleRegionClick(region)
                }}
              >
                <div className="font-semibold text-sm">{rt.regionName}</div>
                <div className="text-xs text-gray-600 mt-1">
                  计划: {rt.plannedArea.toFixed(2)} 亩 | 完成: {rt.completedArea.toFixed(2)} 亩
                </div>
                <ProgressBar value={rt.progress} max={100} showLabel={false} className="mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRegion && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] w-80">
          <h3 className="font-bold text-lg mb-3">{selectedRegion.name} - 任务详情</h3>
          <RegionTaskDetail regionId={selectedRegion.id} tasks={tasks} />
        </div>
      )}
    </div>
  )
}

function RegionTaskDetail({ regionId, tasks }: { regionId: string; tasks: Task[] }) {
  const regionTasks = tasks.filter(t => t.regionId === regionId)

  if (regionTasks.length === 0) {
    return <div className="text-gray-500 text-sm">暂无任务数据</div>
  }

  const totalPlanned = regionTasks.reduce((sum, t) => sum + t.plannedArea, 0)
  const completedTasks = regionTasks.filter(t => t.status === 'completed')
  const inProgressTasks = regionTasks.filter(t => t.status === 'in_progress')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-600">总任务</div>
          <div className="font-bold text-lg">{regionTasks.length}</div>
        </div>
        <div className="bg-gray-50 p-2 rounded">
          <div className="text-gray-600">计划面积</div>
          <div className="font-bold text-lg">{totalPlanned.toFixed(2)} 亩</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">任务列表</h4>
        {regionTasks.map(task => (
          <div key={task.id} className="border border-gray-200 rounded p-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">{cropTypeLabels[task.cropType]}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {taskStatusLabels[task.status]}
              </span>
            </div>
            <div className="text-gray-600 mt-1">
              面积: {task.plannedArea.toFixed(2)} 亩
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
