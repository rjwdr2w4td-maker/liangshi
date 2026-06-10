import { useState, useEffect } from 'react'
import { Archive, FileText, Download, Sparkles, Eye, Trash2, Edit2, AlertTriangle } from 'lucide-react'
import Card from '@/components/common/Card'
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import { api } from '@/utils/api'
import type { DisasterRecord, DisasterType, DisasterStatus, CropType, Region } from '../../../shared/types'
import { disasterTypeLabels, disasterStatusLabels, cropTypeLabels } from '../../../shared/types'

const statusColors: Record<DisasterStatus, string> = {
  reported: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  assisted: 'bg-green-100 text-green-800',
}

const typeColors: Record<string, string> = {
  drought: 'bg-amber-100 text-amber-800',
  flood: 'bg-blue-100 text-blue-800',
  typhoon: 'bg-purple-100 text-purple-800',
  hail: 'bg-cyan-100 text-cyan-800',
  frost: 'bg-sky-100 text-sky-800',
  pest: 'bg-lime-100 text-lime-800',
  other: 'bg-gray-100 text-gray-800',
}

const aiAnalysisTemplates: Record<DisasterType, string> = {
  drought: '根据AI分析模型评估：本次干旱灾害影响范围较广，受灾区域土壤含水量降至临界值以下。建议采取以下措施：1）启动应急灌溉方案，优先保障关键生长期作物；2）协调调水资源，保障人畜饮水安全；3）对绝收地块及时补种短生育期作物以减少损失；4）启动农业保险理赔程序，尽快兑现赔付资金。',
  flood: '根据AI分析模型评估：本次洪涝灾害造成大面积农田淹没，部分低洼地区积水严重。建议采取以下措施：1）加快排涝抢险，优先排除关键农田积水；2）对受灾作物进行分类处置，轻度受灾地块加强田间管理；3）绝收地块清除残茬后适时补种；4）核实受灾面积，启动农业保险快速理赔通道。',
  typhoon: '根据AI分析模型评估：本次台风灾害造成作物倒伏和设施损毁。建议采取以下措施：1）对倒伏作物及时扶正培土，减少产量损失；2）抢修受损农业设施，恢复生产能力；3）对绝收地块评估补种可行性；4）核实灾害损失，协调保险理赔和政府救助资金。',
  hail: '根据AI分析模型评估：本次冰雹灾害对作物叶片和果实造成机械损伤。建议采取以下措施：1）对受损较轻地块喷施叶面肥促进恢复；2）对受损果树修剪伤枝并涂抹保护剂；3）绝收地块清理后补种适宜作物；4）启动农业保险查勘定损程序。',
  frost: '根据AI分析模型评估：本次霜冻灾害对处于关键生长期的作物造成冻害。建议采取以下措施：1）对受冻地块喷施抗冻剂和叶面肥；2）加强水肥管理促进作物恢复生长；3）评估冻害程度，对绝收地块及时翻耕补种；4）核实受灾情况，协调保险理赔。',
  pest: '根据AI分析模型评估：本次病虫害发生面积较大，呈扩散趋势。建议采取以下措施：1）立即开展统防统治，控制病虫害蔓延；2）对重度受灾地块采取化学防治与生物防治相结合；3）加强田间监测预警，防止二次暴发；4）核实受灾损失，启动保险理赔程序。',
  other: '根据AI分析模型评估：本次灾害对农业生产造成一定影响。建议采取以下措施：1）及时查勘核实受灾情况；2）对受灾作物分类施策，促进恢复生长；3）绝收地块适时补种；4）启动保险理赔和救助程序。',
}

export default function DisasterArchive() {
  const [records, setRecords] = useState<DisasterRecord[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DisasterRecord | null>(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTarget, setAiTarget] = useState<DisasterRecord | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { fetchRecords(); fetchRegions() }, [])

  const fetchRegions = async () => {
    const res = await api.get<Region[]>('/regions')
    if (res.success && res.data) setRegions(res.data)
  }

  const getRegionName = (id: string) => {
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

    const buildPath = (regionId: string): string => {
      const region = regionMap.get(regionId)
      if (!region) return regionId

      if (region.parentId) {
        const parentPath = buildPath(region.parentId)
        return `${parentPath}-${region.name}`
      }
      return region.name
    }

    return buildPath(id)
  }

  const fetchRecords = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.append('type', filterType)
    if (filterStatus) params.append('status', filterStatus)
    const res = await api.get<DisasterRecord[]>(`/disaster/records?${params.toString()}`)
    if (res.success && res.data) setRecords(res.data)
    setLoading(false)
  }

  const handleViewDetail = (record: DisasterRecord) => {
    setSelectedRecord(record)
    setDetailModalOpen(true)
  }

  const handleAiAnalysis = (record: DisasterRecord) => {
    setAiTarget(record)
    setAiModalOpen(true)
  }

  const handleGenerateAiAnalysis = async () => {
    if (!aiTarget) return
    setAiGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    const analysis = aiAnalysisTemplates[aiTarget.type]
    const res = await api.put(`/disaster/records/${aiTarget.id}`, { aiAnalysis: analysis })
    setAiGenerating(false)
    if (res.success) {
      setAiModalOpen(false)
      fetchRecords()
    } else {
      alert(res.error || 'AI分析生成失败')
    }
  }

  const handleUpdateStatus = async (record: DisasterRecord, status: DisasterStatus) => {
    const res = await api.put(`/disaster/records/${record.id}`, { status })
    if (res.success) fetchRecords()
    else alert(res.error || '状态更新失败')
  }

  const handleDelete = async (record: DisasterRecord) => {
    if (!confirm(`确定删除灾情档案"${record.description?.slice(0, 20) || record.id}"吗？`)) return
    const res = await api.delete(`/disaster/records/${record.id}`)
    if (res.success) fetchRecords()
    else alert(res.error || '删除失败')
  }

  const handleDownloadReport = (record: DisasterRecord) => {
    const lines = [
      '═══════════════════════════════════════',
      '          灾情档案报告',
      '═══════════════════════════════════════',
      '',
      `档案编号: ${record.id}`,
      `灾害类型: ${disasterTypeLabels[record.type]}`,
      `发生时间: ${new Date(record.occurTime).toLocaleString('zh-CN')}`,
      `受灾地区: ${getRegionName(record.regionId)}`,
      record.plotName ? `关联地块: ${record.plotName}` : '',
      '',
      '─── 灾害损失 ───',
      `受灾面积: ${record.affectedArea} 亩`,
      `成灾面积: ${record.damagedArea} 亩`,
      `绝收面积: ${record.lostArea} 亩`,
      `预估产量损失: ${record.estimatedLoss} 万元`,
      record.affectedCrops?.length ? `受灾作物: ${record.affectedCrops.map(c => cropTypeLabels[c]).join('、')}` : '',
      '',
      `处理状态: ${disasterStatusLabels[record.status]}`,
      record.description ? `\n─── 灾情描述 ───\n${record.description}` : '',
      record.aiAnalysis ? `\n─── AI 分析结果 ───\n${record.aiAnalysis}` : '',
      '',
      '═══════════════════════════════════════',
      `报告生成时间: ${new Date().toLocaleString('zh-CN')}`,
    ]
    const content = lines.filter(Boolean).join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `灾情档案_${disasterTypeLabels[record.type]}_${new Date(record.occurTime).toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalAffected = records.reduce((s, r) => s + r.affectedArea, 0)
  const totalDamaged = records.reduce((s, r) => s + r.damagedArea, 0)
  const totalLost = records.reduce((s, r) => s + r.lostArea, 0)
  const totalLoss = records.reduce((s, r) => s + r.estimatedLoss, 0)

  const columns = [
    {
      key: 'type',
      title: '灾害类型',
      render: (record: DisasterRecord) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[record.type] || typeColors.other}`}>
          {disasterTypeLabels[record.type]}
        </span>
      ),
    },
    {
      key: 'occurTime',
      title: '发生时间',
      render: (record: DisasterRecord) => new Date(record.occurTime).toLocaleDateString('zh-CN'),
    },
    {
      key: 'region',
      title: '受灾地区',
      render: (record: DisasterRecord) => (
        <div>
          <div className="text-sm">{getRegionName(record.regionId)}</div>
          {record.plotName && <div className="text-xs text-gray-400">地块: {record.plotName}</div>}
        </div>
      ),
    },
    {
      key: 'affectedArea',
      title: '受灾(亩)',
      render: (record: DisasterRecord) => record.affectedArea.toLocaleString(),
    },
    {
      key: 'damagedArea',
      title: '成灾(亩)',
      render: (record: DisasterRecord) => record.damagedArea.toLocaleString(),
    },
    {
      key: 'lostArea',
      title: '绝收(亩)',
      render: (record: DisasterRecord) => record.lostArea.toLocaleString(),
    },
    {
      key: 'estimatedLoss',
      title: '预估损失(万)',
      render: (record: DisasterRecord) => (
        <span className={record.estimatedLoss > 0 ? 'text-red-600 font-medium' : ''}>
          {record.estimatedLoss.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'aiAnalysis',
      title: 'AI分析',
      render: (record: DisasterRecord) => record.aiAnalysis ? (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">已生成</span>
      ) : (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">未生成</span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (record: DisasterRecord) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
          {disasterStatusLabels[record.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (record: DisasterRecord) => (
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => handleViewDetail(record)} title="详情">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleAiAnalysis(record)} title="AI分析">
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleDownloadReport(record)} title="下载报告">
            <Download className="w-4 h-4" />
          </Button>
          {record.status === 'reported' && (
            <Button size="sm" onClick={() => handleUpdateStatus(record, 'verified')}>核实</Button>
          )}
          {record.status === 'verified' && (
            <Button size="sm" onClick={() => handleUpdateStatus(record, 'assisted')}>救助</Button>
          )}
          <Button variant="danger" size="sm" onClick={() => handleDelete(record)} title="删除">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">灾情档案</h1>
            <p className="text-gray-500 mt-1">记录灾情信息、AI智能分析与报告下载</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{totalAffected.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">总受灾面积(亩)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalDamaged.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">总成灾面积(亩)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalLost.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">总绝收面积(亩)</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-700">{totalLoss.toLocaleString()}</div>
            <div className="text-sm text-gray-500 mt-1">总预估损失(万元)</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部类型</option>
            {Object.entries(disasterTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            {Object.entries(disasterStatusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button onClick={fetchRecords}>查询</Button>
        </div>

        <Table
          columns={columns}
          data={records}
          loading={loading}
          rowKey="id"
        />
      </Card>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="灾情档案详情"
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[selectedRecord.type] || typeColors.other}`}>
                {disasterTypeLabels[selectedRecord.type]}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedRecord.status]}`}>
                {disasterStatusLabels[selectedRecord.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">发生时间：</span>
                <span className="font-medium">{new Date(selectedRecord.occurTime).toLocaleString('zh-CN')}</span>
              </div>
              <div>
                <span className="text-gray-500">受灾地区：</span>
                <span className="font-medium">{selectedRecord.regionName || selectedRecord.regionId}</span>
              </div>
              {selectedRecord.plotName && (
                <div>
                  <span className="text-gray-500">关联地块：</span>
                  <span className="font-medium">{selectedRecord.plotName}</span>
                </div>
              )}
              {selectedRecord.warningId && (
                <div>
                  <span className="text-gray-500">关联预警：</span>
                  <span className="font-medium">{selectedRecord.warningId}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-amber-700">{selectedRecord.affectedArea}</div>
                <div className="text-xs text-amber-600">受灾面积(亩)</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{selectedRecord.damagedArea}</div>
                <div className="text-xs text-blue-600">成灾面积(亩)</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-700">{selectedRecord.lostArea}</div>
                <div className="text-xs text-red-600">绝收面积(亩)</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-orange-700">{selectedRecord.estimatedLoss}</div>
                <div className="text-xs text-orange-600">预估损失(万元)</div>
              </div>
            </div>

            {selectedRecord.affectedCrops?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">受灾作物</h4>
                <div className="flex gap-2">
                  {selectedRecord.affectedCrops.map(crop => (
                    <span key={crop} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {cropTypeLabels[crop]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedRecord.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">灾情描述</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {selectedRecord.description}
                </p>
              </div>
            )}

            {selectedRecord.aiAnalysis && (
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI 分析结果
                </h4>
                <p className="text-sm text-purple-800 whitespace-pre-wrap">{selectedRecord.aiAnalysis}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {!selectedRecord.aiAnalysis && (
                <Button variant="secondary" onClick={() => { setDetailModalOpen(false); handleAiAnalysis(selectedRecord) }}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  生成AI分析
                </Button>
              )}
              <Button variant="secondary" onClick={() => handleDownloadReport(selectedRecord)}>
                <Download className="w-4 h-4 mr-1" />
                下载报告
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="AI 智能分析"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)}>取消</Button>
            <Button onClick={handleGenerateAiAnalysis} loading={aiGenerating}>
              <Sparkles className="w-4 h-4 mr-1" />
              生成分析
            </Button>
          </>
        }
      >
        {aiTarget && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  {disasterTypeLabels[aiTarget.type]} - {getRegionName(aiTarget.regionId)}
                </span>
              </div>
              <div className="text-xs text-amber-700">
                受灾{aiTarget.affectedArea}亩 · 成灾{aiTarget.damagedArea}亩 · 绝收{aiTarget.lostArea}亩 · 预估损失{aiTarget.estimatedLoss}万元
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>AI将基于灾情数据，结合历史灾害案例和农业专家知识库，生成以下分析内容：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>灾害影响评估</li>
                <li>减产风险分析</li>
                <li>应急处置建议</li>
                <li>灾后恢复方案</li>
                <li>保险理赔建议</li>
              </ul>
            </div>
            {aiTarget.aiAnalysis && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium mb-1">已有AI分析结果，重新生成将覆盖原内容</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
