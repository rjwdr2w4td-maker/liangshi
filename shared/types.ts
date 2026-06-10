export type UserRole = 'province_admin' | 'city_admin' | 'county_admin' | 'farmer'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  regionId: string
  phone?: string
  email?: string
  createdAt: string
}

export type EntityType = 'large_farmer' | 'family_farm' | 'cooperative' | 'small_farmer' | 'village_collective'

export const entityTypeLabels: Record<EntityType, string> = {
  large_farmer: '规模大户',
  family_farm: '家庭农场',
  cooperative: '合作社',
  small_farmer: '普通农户',
  village_collective: '村集体'
}

export interface Entity {
  id: string
  name: string
  type: EntityType
  contactPerson: string
  phone: string
  regionId?: string
  age?: number
  gender?: 'male' | 'female'
  idCard?: string
  address?: string
  email?: string
  remark?: string
  plotIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface Plot {
  id: string
  entityId: string
  name: string
  area: number
  location: { lat: number; lng: number }
  boundaries: Array<{ lat: number; lng: number }>
  soilType?: string
  plotCode?: string
  landType?: string
  irrigation?: string
  ownership?: string
  remark?: string
  createdAt: string
}

export type CropType = 'wheat' | 'rice' | 'corn' | 'soybean' | 'other'

export const cropTypeLabels: Record<CropType, string> = {
  wheat: '小麦',
  rice: '水稻',
  corn: '玉米',
  soybean: '大豆',
  other: '其他'
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: '待执行',
  in_progress: '进行中',
  completed: '已完成'
}

export interface Task {
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
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface SowingProgress {
  id: string
  taskId: string
  regionId: string
  cropType: CropType
  plannedArea: number
  sownArea: number
  largeFarmerArea: number
  progress: number
  date: string
  createdAt: string
}

export interface SowingDetail {
  id: string
  progressId: string
  entityId: string
  plotId: string
  area: number
  sowingDate: string
  cropVariety?: string
  createdAt: string
}

export interface HarvestProgress {
  id: string
  taskId: string
  regionId: string
  cropType: CropType
  plantedArea: number
  harvestedArea: number
  largeFarmerArea: number
  progress: number
  date: string
  createdAt: string
}

export interface HarvestDetail {
  id: string
  progressId: string
  entityId: string
  plotId: string
  area: number
  harvestDate: string
  cropVariety?: string
  yield?: number
  createdAt: string
}

export type WarningLevel = 'red' | 'orange' | 'yellow' | 'blue'

export const warningLevelLabels: Record<WarningLevel, string> = {
  red: '红色预警',
  orange: '橙色预警',
  yellow: '黄色预警',
  blue: '蓝色预警'
}

export type WarningType = 'typhoon' | 'drought' | 'flood' | 'frost' | 'heatwave' | 'pest'

export const warningTypeLabels: Record<WarningType, string> = {
  typhoon: '台风',
  drought: '干旱',
  flood: '洪涝',
  frost: '霜冻',
  heatwave: '高温热害',
  pest: '病虫害'
}

export interface WeatherWarning {
  id: string
  type: WarningType
  level: WarningLevel
  title: string
  content: string
  affectedRegions: string[]
  startTime: string
  endTime: string
  createdAt: string
}

export type DisasterType = 'drought' | 'flood' | 'typhoon' | 'hail' | 'frost' | 'pest' | 'other'

export const disasterTypeLabels: Record<DisasterType, string> = {
  drought: '干旱',
  flood: '洪涝',
  typhoon: '台风',
  hail: '冰雹',
  frost: '霜冻',
  pest: '病虫害',
  other: '其他'
}

export type DisasterStatus = 'reported' | 'verified' | 'assisted'

export const disasterStatusLabels: Record<DisasterStatus, string> = {
  reported: '已上报',
  verified: '已核实',
  assisted: '已救助'
}

export interface DisasterRecord {
  id: string
  type: DisasterType
  regionId: string
  regionName?: string
  warningId?: string
  plotId?: string
  plotName?: string
  occurTime: string
  affectedArea: number
  damagedArea: number
  lostArea: number
  estimatedLoss: number
  affectedCrops: CropType[]
  description: string
  aiAnalysis?: string
  reportUrl?: string
  status: DisasterStatus
  createdAt: string
  updatedAt: string
}

export interface Policy {
  id: string
  title: string
  content: string
  category: string
  publishDate: string
  effectiveDate: string
  source?: string
  summary?: string
  status?: 'active' | 'expired' | 'draft'
  attachmentUrl?: string
  createdAt: string
}

export interface Region {
  id: string
  name: string
  code: string
  parentId?: string
  level: number
  children?: Region[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface DashboardStats {
  totalSownArea: number
  totalHarvestedArea: number
  taskCompletionRate: number
  warningCount: number
}

export interface ProgressSummary {
  regionId: string
  regionName: string
  plannedArea: number
  completedArea: number
  progress: number
}

export interface StatisticsSummary {
  year: number
  regionId: string
  regionName: string
  sownArea: number
  harvestedArea: number
  yield: number
}
