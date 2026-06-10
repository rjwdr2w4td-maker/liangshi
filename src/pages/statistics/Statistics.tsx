import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Download, FileText } from 'lucide-react'
import Card from '@/components/common/Card'
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import { api } from '@/utils/api'
import type { StatisticsSummary } from '../../../shared/types'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function Statistics() {
  const [summary, setSummary] = useState<StatisticsSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    fetchSummary()
    fetchReport()
  }, [year])

  const fetchSummary = async () => {
    setLoading(true)
    const response = await api.get<StatisticsSummary[]>(`/statistics/summary?year=${year}`)
    if (response.success && response.data) {
      setSummary(response.data)
    }
    setLoading(false)
  }

  const fetchReport = async () => {
    const response = await api.get<any>(`/statistics/report?year=${year}`)
    if (response.success && response.data) {
      setReportData(response.data)
    }
  }

  const handleExport = async (type: 'sowing' | 'harvest' | 'disaster') => {
    const response = await api.get<any[]>(`/statistics/report?year=${year}&type=${type}`)
    if (response.success && response.data) {
      const csvContent = convertToCSV(response.data, type)
      downloadCSV(csvContent, `${type}_report_${year}.csv`)
    }
  }

  const convertToCSV = (data: any[], type: string) => {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header]
        return typeof value === 'string' ? `"${value}"` : value
      })
      csvRows.push(values.join(','))
    }
    
    return csvRows.join('\n')
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const columns = [
    {
      key: 'regionName',
      title: '地区',
    },
    {
      key: 'sownArea',
      title: '播种面积(亩)',
      render: (record: StatisticsSummary) => record.sownArea.toLocaleString(),
    },
    {
      key: 'harvestedArea',
      title: '收获面积(亩)',
      render: (record: StatisticsSummary) => record.harvestedArea.toLocaleString(),
    },
    {
      key: 'yield',
      title: '产量(吨)',
      render: (record: StatisticsSummary) => record.yield.toLocaleString(),
    },
  ]

  const barChartData = summary.map(item => ({
    name: item.regionName,
    播种面积: item.sownArea,
    收获面积: item.harvestedArea,
  }))

  const pieChartData = summary.map(item => ({
    name: item.regionName,
    value: item.yield,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">统计分析</h1>
        <div className="flex items-center gap-4">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2023, 2022, 2021].map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>
      </div>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">播种总面积</p>
              <p className="text-3xl font-bold text-blue-600">{reportData.sowing?.totalArea?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-400 mt-1">亩</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">收获总面积</p>
              <p className="text-3xl font-bold text-green-600">{reportData.harvest?.totalArea?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-400 mt-1">亩</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">灾害损失</p>
              <p className="text-3xl font-bold text-red-600">{reportData.disaster?.totalLoss?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-400 mt-1">万元</p>
            </div>
          </Card>
        </div>
      )}

      <Card title="数据汇总" actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('sowing')}>
            <Download className="w-4 h-4 mr-1" />
            导出播种报表
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('harvest')}>
            <Download className="w-4 h-4 mr-1" />
            导出收获报表
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('disaster')}>
            <Download className="w-4 h-4 mr-1" />
            导出灾情报表
          </Button>
        </div>
      }>
        <Table
          columns={columns}
          data={summary}
          loading={loading}
          rowKey="regionId"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="播种与收获面积对比">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="播种面积" fill="#3B82F6" />
                <Bar dataKey="收获面积" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="各地区产量分布">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
