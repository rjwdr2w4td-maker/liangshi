import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, MapPin, Plus } from 'lucide-react'
import Card from '@/components/common/Card'
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import MultiSelect from '@/components/common/MultiSelect'
import { api } from '@/utils/api'
import type { Entity, EntityType, Plot } from '../../../shared/types'
import { entityTypeLabels } from '../../../shared/types'

interface EntityDetailResponse {
  entity?: Entity
}

interface PlotListResponse {
  plots: Plot[]
  total: number
}

interface EntityFormData {
  name: string
  type: EntityType
  contactPerson: string
  phone: string
  age: number | ''
  gender: 'male' | 'female' | ''
  idCard: string
  address: string
  email: string
  remark: string
  plotIds: string[]
}

interface PlotFormData {
  name: string
  area: number | ''
  plotCode: string
  landType: string
  irrigation: string
  ownership: string
  soilType: string
  remark: string
  lat: number | ''
  lng: number | ''
}

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [plotsLoading, setPlotsLoading] = useState(true)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formData, setFormData] = useState<EntityFormData>({
    name: '',
    type: 'small_farmer',
    contactPerson: '',
    phone: '',
    age: '',
    gender: '',
    idCard: '',
    address: '',
    email: '',
    remark: '',
    plotIds: [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [allPlots, setAllPlots] = useState<Plot[]>([])

  const [plotModalOpen, setPlotModalOpen] = useState(false)
  const [plotFormData, setPlotFormData] = useState<PlotFormData>({
    name: '',
    area: '',
    plotCode: '',
    landType: '',
    irrigation: '',
    ownership: '',
    soilType: '',
    remark: '',
    lat: '',
    lng: '',
  })
  const [plotSubmitting, setPlotSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchEntity()
      fetchPlots()
      fetchAllPlots()
    }
  }, [id])

  const fetchEntity = async () => {
    setLoading(true)
    const response = await api.get<EntityDetailResponse | Entity>(`/entities/${id}`)
    if (response.success && response.data) {
      const entityData = 'entity' in response.data && response.data.entity ? response.data.entity : response.data as Entity
      setEntity(entityData)
      setFormData({
        name: entityData.name,
        type: entityData.type,
        contactPerson: entityData.contactPerson,
        phone: entityData.phone,
        age: entityData.age ?? '',
        gender: entityData.gender ?? '',
        idCard: entityData.idCard ?? '',
        address: entityData.address ?? '',
        email: entityData.email ?? '',
        remark: entityData.remark ?? '',
        plotIds: entityData.plotIds ?? [],
      })
    }
    setLoading(false)
  }

  const fetchPlots = async () => {
    setPlotsLoading(true)
    const response = await api.get<PlotListResponse>(`/entities/${id}/plots`)
    if (response.success && response.data) {
      setPlots(response.data.plots)
    }
    setPlotsLoading(false)
  }

  const fetchAllPlots = async () => {
    const response = await api.get<PlotListResponse>('/plots?pageSize=1000')
    if (response.success && response.data) {
      setAllPlots(response.data.plots)
    }
  }

  const handleEdit = () => {
    setEditModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.contactPerson || !formData.phone) {
      alert('请填写必填项')
      return
    }

    setSubmitting(true)
    const response = await api.put(`/entities/${id}`, formData)
    setSubmitting(false)

    if (response.success) {
      setEditModalOpen(false)
      fetchEntity()
    } else {
      alert(response.error || '更新失败')
    }
  }

  const handleBack = () => {
    navigate('/entities')
  }

  const handleAddPlot = () => {
    setPlotFormData({
      name: '',
      area: '',
      plotCode: '',
      landType: '',
      irrigation: '',
      ownership: '',
      soilType: '',
      remark: '',
      lat: '',
      lng: '',
    })
    setPlotModalOpen(true)
  }

  const handlePlotSubmit = async () => {
    if (!plotFormData.name || !plotFormData.area) {
      alert('请填写地块名称和面积')
      return
    }

    setPlotSubmitting(true)
    const response = await api.post(`/entities/${id}/plots`, {
      name: plotFormData.name,
      area: Number(plotFormData.area),
      plotCode: plotFormData.plotCode || undefined,
      landType: plotFormData.landType || undefined,
      irrigation: plotFormData.irrigation || undefined,
      ownership: plotFormData.ownership || undefined,
      soilType: plotFormData.soilType || undefined,
      remark: plotFormData.remark || undefined,
      location: {
        lat: plotFormData.lat ? Number(plotFormData.lat) : 0,
        lng: plotFormData.lng ? Number(plotFormData.lng) : 0,
      },
      boundaries: [],
    })
    setPlotSubmitting(false)

    if (response.success) {
      setPlotModalOpen(false)
      fetchPlots()
    } else {
      alert(response.error || '新增地块失败')
    }
  }

  const plotColumns = [
    {
      key: 'name',
      title: '地块名称',
    },
    {
      key: 'area',
      title: '面积（亩）',
      render: (record: Plot) => record.area.toLocaleString(),
    },
    {
      key: 'soilType',
      title: '土壤类型',
      render: (record: Plot) => record.soilType || '-',
    },
    {
      key: 'location',
      title: '位置',
      render: (record: Plot) => (
        <div className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>
            {record.location.lat.toFixed(4)}, {record.location.lng.toFixed(4)}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (record: Plot) => new Date(record.createdAt).toLocaleDateString('zh-CN'),
    },
  ]

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">未找到该主体信息</p>
          <Button onClick={handleBack} className="mt-4">
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
            <p className="text-gray-500 mt-1">种植主体详情</p>
          </div>
        </div>
        <Button onClick={handleEdit}>
          <Edit2 className="w-4 h-4 mr-2" />
          编辑信息
        </Button>
      </div>

      <Card title="基本信息">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              主体名称
            </label>
            <p className="text-base text-gray-900">{entity.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              主体类型
            </label>
            <span className={`inline-block px-3 py-1 text-sm rounded-full ${
              entity.type === 'large_farmer' ? 'bg-purple-100 text-purple-800' :
              entity.type === 'family_farm' ? 'bg-blue-100 text-blue-800' :
              entity.type === 'cooperative' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {entityTypeLabels[entity.type]}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              联系人
            </label>
            <p className="text-base text-gray-900">{entity.contactPerson}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              联系电话
            </label>
            <p className="text-base text-gray-900">{entity.phone}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              年龄
            </label>
            <p className="text-base text-gray-900">{entity.age ? `${entity.age} 岁` : '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              性别
            </label>
            <p className="text-base text-gray-900">{entity.gender === 'male' ? '男' : entity.gender === 'female' ? '女' : '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              身份证号
            </label>
            <p className="text-base text-gray-900">{entity.idCard || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              详细地址
            </label>
            <p className="text-base text-gray-900">{entity.address || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              电子邮箱
            </label>
            <p className="text-base text-gray-900">{entity.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              关联地块
            </label>
            <p className="text-base text-gray-900">
              {entity.plotIds && entity.plotIds.length > 0 
                ? `${entity.plotIds.length} 个地块` 
                : '-'}
            </p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              备注
            </label>
            <p className="text-base text-gray-900">{entity.remark || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              创建时间
            </label>
            <p className="text-base text-gray-900">
              {new Date(entity.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              更新时间
            </label>
            <p className="text-base text-gray-900">
              {new Date(entity.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </Card>

      <Card title={`关联地块 (${plots.length})`}>
        <div className="mb-4">
          <Button onClick={handleAddPlot}>
            <Plus className="w-4 h-4 mr-2" />
            新增地块
          </Button>
        </div>
        <Table
          columns={plotColumns}
          data={plots}
          loading={plotsLoading}
          emptyText="暂无关联地块"
        />
      </Card>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="编辑主体信息"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主体名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入主体名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主体类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EntityType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="large_farmer">规模大户</option>
                  <option value="family_farm">家庭农场</option>
                  <option value="cooperative">合作社</option>
                  <option value="small_farmer">普通农户</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">联系人信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  联系人 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入联系人姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  联系电话 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入联系电话"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  年龄
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入年龄"
                  min="0"
                  max="150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  性别
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  身份证号
                </label>
                <input
                  type="text"
                  value={formData.idCard}
                  onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入身份证号"
                  maxLength={18}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">其他信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细地址
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入详细地址"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  电子邮箱
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入电子邮箱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关联地块
                </label>
                <MultiSelect
                  options={allPlots.map((plot) => ({
                    value: plot.id,
                    label: plot.name,
                    subLabel: `${plot.area}亩`,
                  }))}
                  value={formData.plotIds}
                  onChange={(selectedIds) => setFormData({ ...formData, plotIds: selectedIds })}
                  placeholder="请选择关联地块"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入备注信息"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={plotModalOpen}
        onClose={() => setPlotModalOpen(false)}
        title="新增地块"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlotModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePlotSubmit} loading={plotSubmitting}>
              创建
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">基本信息</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地块名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={plotFormData.name}
                  onChange={(e) => setPlotFormData({ ...plotFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入地块名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  面积（亩）<span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={plotFormData.area}
                  onChange={(e) => setPlotFormData({ ...plotFormData, area: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入面积"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地块编码
                </label>
                <input
                  type="text"
                  value={plotFormData.plotCode}
                  onChange={(e) => setPlotFormData({ ...plotFormData, plotCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入地块编码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  土地类型
                </label>
                <select
                  value={plotFormData.landType}
                  onChange={(e) => setPlotFormData({ ...plotFormData, landType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="水田">水田</option>
                  <option value="旱地">旱地</option>
                  <option value="水浇地">水浇地</option>
                  <option value="菜地">菜地</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">土地属性</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  灌溉条件
                </label>
                <select
                  value={plotFormData.irrigation}
                  onChange={(e) => setPlotFormData({ ...plotFormData, irrigation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="自流灌溉">自流灌溉</option>
                  <option value="提灌">提灌</option>
                  <option value="井灌">井灌</option>
                  <option value="无灌溉">无灌溉</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  权属类型
                </label>
                <select
                  value={plotFormData.ownership}
                  onChange={(e) => setPlotFormData({ ...plotFormData, ownership: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="承包">承包</option>
                  <option value="流转">流转</option>
                  <option value="自有">自有</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  土壤类型
                </label>
                <select
                  value={plotFormData.soilType}
                  onChange={(e) => setPlotFormData({ ...plotFormData, soilType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="黄壤">黄壤</option>
                  <option value="水稻土">水稻土</option>
                  <option value="红壤">红壤</option>
                  <option value="沙壤土">沙壤土</option>
                  <option value="黏土">黏土</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    纬度
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={plotFormData.lat}
                    onChange={(e) => setPlotFormData({ ...plotFormData, lat: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="31.2304"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    经度
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={plotFormData.lng}
                    onChange={(e) => setPlotFormData({ ...plotFormData, lng: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="117.2264"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">其他信息</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注
              </label>
              <textarea
                value={plotFormData.remark}
                onChange={(e) => setPlotFormData({ ...plotFormData, remark: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入备注信息"
                rows={2}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
