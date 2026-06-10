import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Card from '@/components/common/Card'
import { api } from '@/utils/api'
import type { ProgressSummary, WeatherWarning } from '../../shared/types'
import { Sprout, Wheat, CheckCircle, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  totalSownArea: number
  totalHarvestedArea: number
  taskCompletionRate: number
  warningCount: number
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSownArea: 0,
    totalHarvestedArea: 0,
    taskCompletionRate: 0,
    warningCount: 0
  })
  const [sowingSummary, setSowingSummary] = useState<ProgressSummary[]>([])
  const [harvestSummary, setHarvestSummary] = useState<ProgressSummary[]>([])
  const [warnings, setWarnings] = useState<WeatherWarning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const currentYear = new Date().getFullYear().toString()
      
      const [sowingRes, harvestRes, warningsRes] = await Promise.all([
        api.get<ProgressSummary[]>(`/sowing/summary?year=${currentYear}`),
        api.get<ProgressSummary[]>(`/harvest/summary?year=${currentYear}`),
        api.get<WeatherWarning[]>('/disaster/warnings?active=true')
      ])

      if (sowingRes.success && sowingRes.data) {
        setSowingSummary(sowingRes.data)
        const totalSown = sowingRes.data.reduce((sum, item) => sum + item.completedArea, 0)
        const totalPlanned = sowingRes.data.reduce((sum, item) => sum + item.plannedArea, 0)
        
        setStats(prev => ({
          ...prev,
          totalSownArea: totalSown,
          taskCompletionRate: totalPlanned > 0 ? Math.round((totalSown / totalPlanned) * 100) : 0
        }))
      }

      if (harvestRes.success && harvestRes.data) {
        setHarvestSummary(harvestRes.data)
        const totalHarvested = harvestRes.data.reduce((sum, item) => sum + item.completedArea, 0)
        setStats(prev => ({
          ...prev,
          totalHarvestedArea: totalHarvested
        }))
      }

      if (warningsRes.success && warningsRes.data) {
        setWarnings(warningsRes.data)
        setStats(prev => ({
          ...prev,
          warningCount: warningsRes.data!.length
        }))
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWarningLevelColor = (level: string) => {
    switch (level) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getWarningLevelText = (level: string) => {
    const labels: Record<string, string> = {
      red: '红色预警',
      orange: '橙色预警',
      yellow: '黄色预警',
      blue: '蓝色预警'
    }
    return labels[level] || level
  }

  const getWarningTypeText = (type: string) => {
    const labels: Record<string, string> = {
      typhoon: '台风',
      drought: '干旱',
      flood: '洪涝',
      frost: '霜冻',
      heatwave: '高温热害',
      pest: '病虫害'
    }
    return labels[type] || type
  }

  const chartData = sowingSummary.map(item => ({
    name: item.regionName,
    播种面积: item.completedArea,
    计划面积: item.plannedArea
  }))

  const combinedProgress = useMemo(() => {
    const harvestMap = new Map(harvestSummary.map(item => [item.regionId, item]))

    return sowingSummary.map((sowingItem) => {
      const harvestItem = harvestMap.get(sowingItem.regionId)

      return {
        regionId: sowingItem.regionId,
        regionName: sowingItem.regionName,
        sowing: sowingItem,
        harvest: harvestItem ?? {
          regionId: sowingItem.regionId,
          regionName: sowingItem.regionName,
          plannedArea: sowingItem.plannedArea,
          completedArea: 0,
          progress: 0
        }
      }
    })
  }, [harvestSummary, sowingSummary])

  const compactProgressData = useMemo(() => {
    return [...combinedProgress]
      .map(item => ({
        regionId: item.regionId,
        regionName: item.regionName,
        播种进度: Number(item.sowing.progress.toFixed(1)),
        收获进度: Number(item.harvest.progress.toFixed(1)),
        播种面积文本: `${item.sowing.completedArea.toLocaleString()} / ${item.sowing.plannedArea.toLocaleString()} 亩`,
        收获面积文本: `${item.harvest.completedArea.toLocaleString()} / ${item.harvest.plannedArea.toLocaleString()} 亩`
      }))
      .sort((a, b) => b.播种进度 - a.播种进度)
  }, [combinedProgress])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">首页概览</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">播种面积</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSownArea.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">亩</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Sprout className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">收获面积</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalHarvestedArea.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">亩</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Wheat className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">任务完成率</p>
              <p className="text-2xl font-bold text-gray-900">{stats.taskCompletionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">本年度</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">预警数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warningCount}</p>
              <p className="text-xs text-gray-500 mt-1">活跃预警</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-400 text-white shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">农时综合进度</div>
              <div className="text-sm text-gray-500">按地市对比播种与收获进展</div>
            </div>
          </div>
        }
      >
        {compactProgressData.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  播种进度
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  收获进度
                </span>
                <span className="text-xs text-slate-400">固定高度展示全部 16 市</span>
              </div>

              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={compactProgressData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                    barCategoryGap={8}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="regionName"
                      width={64}
                      tick={{ fontSize: 12, fill: '#334155' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: { payload?: { 播种面积文本?: string; 收获面积文本?: string } }) => {
                        const extra = name === '播种进度' ? props.payload?.播种面积文本 : props.payload?.收获面积文本
                        return [`${value}%${extra ? ` (${extra})` : ''}`, name]
                      }}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="播种进度" fill="#10b981" radius={[0, 999, 999, 0]} barSize={10} />
                    <Bar dataKey="收获进度" fill="#f59e0b" radius={[0, 999, 999, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无农时综合进度数据</p>
        )}
      </Card>

      <Card title="播种面积统计">
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="播种面积" fill="#10b981" />
                <Bar dataKey="计划面积" fill="#d1d5db" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无统计数据</p>
        )}
      </Card>

      <Card title="最新预警信息">
        {warnings.length > 0 ? (
          <div className="space-y-3">
            {warnings.slice(0, 5).map((warning) => (
              <div
                key={warning.id}
                className={`p-4 rounded-lg border ${getWarningLevelColor(warning.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded">
                        {getWarningLevelText(warning.level)}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-white bg-opacity-50">
                        {getWarningTypeText(warning.type)}
                      </span>
                    </div>
                    <h4 className="font-semibold mb-1">{warning.title}</h4>
                    <p className="text-sm opacity-90">{warning.content}</p>
                    <p className="text-xs mt-2 opacity-75">
                      有效期：{new Date(warning.startTime).toLocaleDateString()} 至{' '}
                      {new Date(warning.endTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暂无预警信息</p>
        )}
      </Card>
    </div>
  )
}
