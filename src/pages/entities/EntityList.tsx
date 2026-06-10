import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import Card from '@/components/common/Card'
import Table from '@/components/common/Table'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import MultiSelect from '@/components/common/MultiSelect'
import { api } from '@/utils/api'
import type { Entity, EntityType, Plot } from '../../../shared/types'
import { entityTypeLabels } from '../../../shared/types'

interface EntityListResponse {
  entities: Entity[]
  total: number
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

export default function EntityList() {
  const navigate = useNavigate()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState<EntityType | ''>('')
  const [filterRegion, setFilterRegion] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const [allPlots, setAllPlots] = useState<Plot[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingEntity, setDeletingEntity] = useState<Entity | null>(null)

  useEffect(() => {
    fetchEntities()
    fetchAllPlots()
  }, [currentPage, filterType, filterRegion])

  const fetchEntities = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append('page', currentPage.toString())
    params.append('pageSize', pageSize.toString())
    if (searchText) params.append('name', searchText)
    if (filterType) params.append('type', filterType)
    if (filterRegion) params.append('regionId', filterRegion)

    const response = await api.get<EntityListResponse>(`/entities?${params.toString()}`)
    if (response.success && response.data) {
      setEntities(response.data.entities)
      setTotal(response.data.total)
    }
    setLoading(false)
  }

  const fetchAllPlots = async () => {
    const response = await api.get<PlotListResponse>('/plots?pageSize=1000')
    if (response.success && response.data) {
      setAllPlots(response.data.plots)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchEntities()
  }

  const handleAdd = () => {
    setEditingEntity(null)
    setFormData({
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
    setModalOpen(true)
  }

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity)
    setFormData({
      name: entity.name,
      type: entity.type,
      contactPerson: entity.contactPerson,
      phone: entity.phone,
      age: entity.age ?? '',
      gender: entity.gender ?? '',
      idCard: entity.idCard ?? '',
      address: entity.address ?? '',
      email: entity.email ?? '',
      remark: entity.remark ?? '',
      plotIds: entity.plotIds ?? [],
    })
    setModalOpen(true)
  }

  const handleDelete = (entity: Entity) => {
    setDeletingEntity(entity)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingEntity) return

    setSubmitting(true)
    const response = await api.delete(`/entities/${deletingEntity.id}`)
    setSubmitting(false)

    if (response.success) {
      setDeleteModalOpen(false)
      fetchEntities()
    } else {
      alert(response.error || '删除失败')
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.contactPerson || !formData.phone) {
      alert('请填写必填项')
      return
    }

    setSubmitting(true)
    let response
    if (editingEntity) {
      response = await api.put(`/entities/${editingEntity.id}`, formData)
    } else {
      response = await api.post('/entities', formData)
    }
    setSubmitting(false)

    if (response.success) {
      setModalOpen(false)
      fetchEntities()
    } else {
      alert(response.error || '操作失败')
    }
  }

  const handleViewDetail = (id: string) => {
    navigate(`/entities/${id}`)
  }

  const columns = [
    {
      key: 'name',
      title: '主体名称',
      render: (record: Entity) => (
        <button
          onClick={() => handleViewDetail(record.id)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {record.name}
        </button>
      ),
    },
    {
      key: 'type',
      title: '主体类型',
      render: (record: Entity) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          record.type === 'large_farmer' ? 'bg-purple-100 text-purple-800' :
          record.type === 'family_farm' ? 'bg-blue-100 text-blue-800' :
          record.type === 'cooperative' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {entityTypeLabels[record.type]}
        </span>
      ),
    },
    {
      key: 'contactPerson',
      title: '联系人',
    },
    {
      key: 'phone',
      title: '联系电话',
    },
    {
      key: 'plotIds',
      title: '关联地块',
      render: (record: Entity) => record.plotIds?.length ? `${record.plotIds.length} 个` : '-',
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (record: Entity) => new Date(record.createdAt).toLocaleDateString('zh-CN'),
    },
    {
      key: 'actions',
      title: '操作',
      render: (record: Entity) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">种植主体管理</h1>
          <p className="text-gray-500 mt-1">管理规模大户、家庭农场、合作社等种植主体</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          新增主体
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索主体名称、联系人..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as EntityType | '')
                setCurrentPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部类型</option>
              <option value="large_farmer">规模大户</option>
              <option value="family_farm">家庭农场</option>
              <option value="cooperative">合作社</option>
              <option value="small_farmer">普通农户</option>
            </select>
            <input
              type="text"
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="地区ID筛选"
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
            <Button onClick={handleSearch}>搜索</Button>
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        data={entities}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: setCurrentPage,
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntity ? '编辑主体' : '新增主体'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingEntity ? '保存' : '创建'}
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
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="确认删除"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={submitting}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          确定要删除主体 <span className="font-medium text-gray-900">{deletingEntity?.name}</span> 吗？此操作不可恢复。
        </p>
      </Modal>
    </div>
  )
}
