const STORAGE_KEY = 'liangshi_data'

interface StoredData {
  entities: any[]
  plots: any[]
  tasks: any[]
  sowingProgress: any[]
  harvestProgress: any[]
  disasterWarnings: any[]
  disasterRecords: any[]
  policies: any[]
  regions: any[]
  users: any[]
}

function getStoredData(): StoredData {
  const data = localStorage.getItem(STORAGE_KEY)
  if (data) {
    return JSON.parse(data)
  }
  return initDefaultData()
}

function setStoredData(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function initDefaultData(): StoredData {
  const regions = [
    { id: '1', name: '安徽省', level: 1, parentId: null, children: [
      { id: '1-1', name: '合肥市', level: 2, parentId: '1', children: [
        { id: '1-1-1', name: '庐阳区', level: 3, parentId: '1-1' },
        { id: '1-1-2', name: '瑶海区', level: 3, parentId: '1-1' },
        { id: '1-1-3', name: '蜀山区', level: 3, parentId: '1-1' },
        { id: '1-1-4', name: '包河区', level: 3, parentId: '1-1' },
      ]},
      { id: '1-2', name: '芜湖市', level: 2, parentId: '1', children: [
        { id: '1-2-1', name: '镜湖区', level: 3, parentId: '1-2' },
        { id: '1-2-2', name: '鸠江区', level: 3, parentId: '1-2' },
      ]},
      { id: '1-3', name: '蚌埠市', level: 2, parentId: '1', children: [
        { id: '1-3-1', name: '蚌山区', level: 3, parentId: '1-3' },
      ]},
    ]},
  ]

  const users = [
    { id: '1', username: 'admin', password: 'admin123', name: '管理员', role: 'admin' },
  ]

  const entities = [
    { id: 'e1', name: '合肥现代农业合作社', type: 'cooperative', regionId: '1-1-1', contactPerson: '张三', phone: '13800138001', address: '庐阳区现代农业产业园', createdAt: new Date().toISOString() },
    { id: 'e2', name: '芜湖种粮大户王五', type: 'large_farmer', regionId: '1-2-1', contactPerson: '王五', phone: '13900139001', address: '镜湖区农业示范区', createdAt: new Date().toISOString() },
  ]

  const plots = [
    { id: 'p1', name: '东区一号田', entityId: 'e1', area: 120, cropType: 'rice', status: 'active', createdAt: new Date().toISOString() },
    { id: 'p2', name: '西区二号田', entityId: 'e1', area: 80, cropType: 'wheat', status: 'active', createdAt: new Date().toISOString() },
    { id: 'p3', name: '南区试验田', entityId: 'e2', area: 50, cropType: 'corn', status: 'active', createdAt: new Date().toISOString() },
  ]

  const tasks = [
    { id: 't1', name: '2024年水稻播种任务', cropType: 'rice', regionId: '1-1-1', plannedArea: 500, actualArea: 0, startDate: '2024-04-01', endDate: '2024-05-30', status: 'pending', createdAt: new Date().toISOString() },
    { id: 't2', name: '2024年小麦播种任务', cropType: 'wheat', regionId: '1-1-2', plannedArea: 300, actualArea: 0, startDate: '2024-10-01', endDate: '2024-11-30', status: 'pending', createdAt: new Date().toISOString() },
  ]

  const defaultData: StoredData = {
    regions,
    users,
    entities,
    plots,
    tasks,
    sowingProgress: [],
    harvestProgress: [],
    disasterWarnings: [],
    disasterRecords: [],
    policies: [],
  }

  setStoredData(defaultData)
  return defaultData
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 50))
}

export const localStorageApi = {
  async getRegions(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.regions }
  },

  async login(username: string, password: string): Promise<{ success: boolean; data?: any; error?: string }> {
    await simulateDelay()
    const data = getStoredData()
    const user = data.users.find(u => u.username === username && u.password === password)
    if (user) {
      const token = 'mock_token_' + generateId()
      return { success: true, data: { user: { ...user, password: undefined }, token } }
    }
    return { success: false, error: '用户名或密码错误' }
  },

  async getEntities(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: { entities: data.entities, total: data.entities.length } }
  },

  async createEntity(entity: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newEntity = { ...entity, id: generateId(), createdAt: new Date().toISOString() }
    store.entities.push(newEntity)
    setStoredData(store)
    return { success: true, data: newEntity, message: '创建成功' }
  },

  async updateEntity(id: string, updates: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const index = store.entities.findIndex(e => e.id === id)
    if (index === -1) return { success: false, data: null, message: '主体不存在' }
    store.entities[index] = { ...store.entities[index], ...updates }
    setStoredData(store)
    return { success: true, data: store.entities[index], message: '更新成功' }
  },

  async deleteEntity(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.entities = store.entities.filter(e => e.id !== id)
    store.plots = store.plots.filter(p => p.entityId !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getPlots(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: { plots: data.plots, total: data.plots.length } }
  },

  async createPlot(plot: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newPlot = { ...plot, id: generateId(), createdAt: new Date().toISOString() }
    store.plots.push(newPlot)
    setStoredData(store)
    return { success: true, data: newPlot, message: '创建成功' }
  },

  async updatePlot(id: string, updates: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const index = store.plots.findIndex(p => p.id === id)
    if (index === -1) return { success: false, data: null, message: '地块不存在' }
    store.plots[index] = { ...store.plots[index], ...updates }
    setStoredData(store)
    return { success: true, data: store.plots[index], message: '更新成功' }
  },

  async deletePlot(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.plots = store.plots.filter(p => p.id !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getTasks(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.tasks }
  },

  async createTask(task: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newTask = { ...task, id: generateId(), createdAt: new Date().toISOString() }
    store.tasks.push(newTask)
    setStoredData(store)
    return { success: true, data: newTask, message: '创建成功' }
  },

  async updateTask(id: string, updates: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const index = store.tasks.findIndex(t => t.id === id)
    if (index === -1) return { success: false, data: null, message: '任务不存在' }
    store.tasks[index] = { ...store.tasks[index], ...updates }
    setStoredData(store)
    return { success: true, data: store.tasks[index], message: '更新成功' }
  },

  async deleteTask(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.tasks = store.tasks.filter(t => t.id !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getSowingProgress(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.sowingProgress }
  },

  async createSowingProgress(progress: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newProgress = { ...progress, id: generateId(), createdAt: new Date().toISOString() }
    store.sowingProgress.push(newProgress)
    setStoredData(store)
    return { success: true, data: newProgress, message: '录入成功' }
  },

  async getHarvestProgress(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.harvestProgress }
  },

  async createHarvestProgress(progress: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newProgress = { ...progress, id: generateId(), createdAt: new Date().toISOString() }
    store.harvestProgress.push(newProgress)
    setStoredData(store)
    return { success: true, data: newProgress, message: '录入成功' }
  },

  async getDisasterWarnings(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.disasterWarnings }
  },

  async createDisasterWarning(warning: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newWarning = { ...warning, id: generateId(), createdAt: new Date().toISOString() }
    store.disasterWarnings.push(newWarning)
    setStoredData(store)
    return { success: true, data: newWarning, message: '发布成功' }
  },

  async deleteDisasterWarning(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.disasterWarnings = store.disasterWarnings.filter(w => w.id !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getDisasterRecords(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    const enrichedRecords = data.disasterRecords.map(r => ({
      ...r,
      regionName: r.regionName || getRegionNameById(data.regions, r.regionId)
    }))
    return { success: true, data: enrichedRecords }
  },

  async createDisasterRecord(record: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newRecord = { ...record, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    store.disasterRecords.push(newRecord)
    setStoredData(store)
    return { success: true, data: newRecord, message: '创建成功' }
  },

  async updateDisasterRecord(id: string, updates: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const index = store.disasterRecords.findIndex(r => r.id === id)
    if (index === -1) return { success: false, data: null, message: '记录不存在' }
    store.disasterRecords[index] = { ...store.disasterRecords[index], ...updates, updatedAt: new Date().toISOString() }
    setStoredData(store)
    return { success: true, data: store.disasterRecords[index], message: '更新成功' }
  },

  async deleteDisasterRecord(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.disasterRecords = store.disasterRecords.filter(r => r.id !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getPolicies(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    return { success: true, data: data.policies }
  },

  async createPolicy(policy: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const newPolicy = { ...policy, id: generateId(), createdAt: new Date().toISOString() }
    store.policies.push(newPolicy)
    setStoredData(store)
    return { success: true, data: newPolicy, message: '发布成功' }
  },

  async updatePolicy(id: string, updates: any): Promise<{ success: boolean; data: any; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    const index = store.policies.findIndex(p => p.id === id)
    if (index === -1) return { success: false, data: null, message: '政策不存在' }
    store.policies[index] = { ...store.policies[index], ...updates }
    setStoredData(store)
    return { success: true, data: store.policies[index], message: '更新成功' }
  },

  async deletePolicy(id: string): Promise<{ success: boolean; message: string }> {
    await simulateDelay()
    const store = getStoredData()
    store.policies = store.policies.filter(p => p.id !== id)
    setStoredData(store)
    return { success: true, message: '删除成功' }
  },

  async getStatistics(): Promise<{ success: boolean; data: any }> {
    await simulateDelay()
    const data = getStoredData()
    const totalPlots = data.plots.length
    const totalArea = data.plots.reduce((sum, p) => sum + (p.area || 0), 0)
    const totalTasks = data.tasks.length
    const completedTasks = data.tasks.filter(t => t.status === 'completed').length
    return {
      success: true,
      data: {
        totalPlots,
        totalArea,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0
      }
    }
  },
}

function getRegionNameById(regions: any[], id: string): string {
  const flatRegions: any[] = []
  const flatten = (items: any[]) => {
    items.forEach(item => {
      flatRegions.push(item)
      if (item.children?.length) flatten(item.children)
    })
  }
  flatten(regions)
  const regionMap = new Map<string, any>()
  flatRegions.forEach(r => regionMap.set(r.id, r))

  const buildPath = (rid: string): string => {
    const region = regionMap.get(rid)
    if (!region) return rid
    if (region.parentId) return buildPath(region.parentId) + '-' + region.name
    return region.name
  }
  return buildPath(id)
}