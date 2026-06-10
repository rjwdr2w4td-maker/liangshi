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
    { id: '340000', name: '安徽省', level: 1, parentId: null, children: [
      { id: '340100', name: '合肥市', level: 2, parentId: '340000', children: [
        { id: '340103', name: '庐阳区', level: 3, parentId: '340100' },
        { id: '340102', name: '瑶海区', level: 3, parentId: '340100' },
        { id: '340104', name: '蜀山区', level: 3, parentId: '340100' },
        { id: '340111', name: '包河区', level: 3, parentId: '340100' },
        { id: '340121', name: '长丰县', level: 3, parentId: '340100' },
        { id: '340122', name: '肥东县', level: 3, parentId: '340100' },
        { id: '340123', name: '肥西县', level: 3, parentId: '340100' },
      ]},
      { id: '340200', name: '芜湖市', level: 2, parentId: '340000', children: [
        { id: '340202', name: '镜湖区', level: 3, parentId: '340200' },
        { id: '340203', name: '鸠江区', level: 3, parentId: '340200' },
        { id: '340207', name: '湾沚区', level: 3, parentId: '340200' },
        { id: '340225', name: '无为市', level: 3, parentId: '340200' },
      ]},
      { id: '340300', name: '蚌埠市', level: 2, parentId: '340000', children: [
        { id: '340303', name: '蚌山区', level: 3, parentId: '340300' },
        { id: '340302', name: '龙子湖区', level: 3, parentId: '340300' },
        { id: '340304', name: '禹会区', level: 3, parentId: '340300' },
      ]},
      { id: '340400', name: '淮南市', level: 2, parentId: '340000', children: [
        { id: '340402', name: '大通区', level: 3, parentId: '340400' },
        { id: '340403', name: '田家庵区', level: 3, parentId: '340400' },
      ]},
      { id: '340500', name: '马鞍山市', level: 2, parentId: '340000', children: [
        { id: '340503', name: '花山区', level: 3, parentId: '340500' },
        { id: '340504', name: '雨山区', level: 3, parentId: '340500' },
      ]},
    ]},
  ]

  const users = [
    { id: 'u1', username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin' },
    { id: 'u2', username: 'user1', password: '123456', name: '合肥管理员', role: 'user' },
  ]

  const entities = [
    { id: 'e1', name: '合肥绿源现代农业专业合作社', type: 'cooperative', regionId: '340103', contactPerson: '张伟', phone: '13805601234', address: '庐阳区三十岗乡现代农业产业园', area: 2500, createdAt: '2024-01-15T08:00:00.000Z' },
    { id: 'e2', name: '芜湖金穗家庭农场', type: 'family_farm', regionId: '340202', contactPerson: '李明', phone: '13955345678', address: '镜湖区方村街道', area: 800, createdAt: '2024-02-20T08:00:00.000Z' },
    { id: 'e3', name: '蚌埠丰收种植合作社', type: 'cooperative', regionId: '340303', contactPerson: '王强', phone: '13705521234', address: '蚌山区燕山乡', area: 1500, createdAt: '2024-03-10T08:00:00.000Z' },
    { id: 'e4', name: '合肥大圩葡萄种植大户', type: 'large_farmer', regionId: '340111', contactPerson: '陈华', phone: '13856987654', address: '包河区大圩镇', area: 320, createdAt: '2024-01-25T08:00:00.000Z' },
    { id: 'e5', name: '肥东水稻种植专业合作社', type: 'cooperative', regionId: '340122', contactPerson: '刘洋', phone: '13965012345', address: '肥东县撮镇镇', area: 3200, createdAt: '2024-02-08T08:00:00.000Z' },
    { id: 'e6', name: '芜湖无为水稻家庭农场', type: 'family_farm', regionId: '340225', contactPerson: '赵军', phone: '13739234567', address: '无为市无城镇', area: 560, createdAt: '2024-03-15T08:00:00.000Z' },
    { id: 'e7', name: '淮南八公山果蔬合作社', type: 'cooperative', regionId: '340403', contactPerson: '孙丽', phone: '13866982345', address: '田家庵区曹庵镇', area: 450, createdAt: '2024-04-01T08:00:00.000Z' },
    { id: 'e8', name: '长丰草莓种植大户', type: 'large_farmer', regionId: '340121', contactPerson: '周涛', phone: '13955123456', address: '长丰县水湖镇', area: 180, createdAt: '2024-04-20T08:00:00.000Z' },
  ]

  const plots = [
    { id: 'p1', name: '东区水稻一号田', entityId: 'e1', area: 520, cropType: 'rice', status: 'active', soilType: '水稻土', createdAt: '2024-01-15T08:00:00.000Z' },
    { id: 'p2', name: '西区小麦示范田', entityId: 'e1', area: 380, cropType: 'wheat', status: 'active', soilType: '黄褐土', createdAt: '2024-01-15T08:00:00.000Z' },
    { id: 'p3', name: '南区玉米试验田', entityId: 'e2', area: 260, cropType: 'corn', status: 'active', soilType: '砂姜黑土', createdAt: '2024-02-20T08:00:00.000Z' },
    { id: 'p4', name: '水稻核心区', entityId: 'e3', area: 680, cropType: 'rice', status: 'active', soilType: '水稻土', createdAt: '2024-03-10T08:00:00.000Z' },
    { id: 'p5', name: '小麦种植区', entityId: 'e3', area: 420, cropType: 'wheat', status: 'active', soilType: '黄褐土', createdAt: '2024-03-10T08:00:00.000Z' },
    { id: 'p6', name: '葡萄园A区', entityId: 'e4', area: 160, cropType: 'grape', status: 'active', soilType: '黄棕壤', createdAt: '2024-01-25T08:00:00.000Z' },
    { id: 'p7', name: '葡萄园B区', entityId: 'e4', area: 160, cropType: 'grape', status: 'active', soilType: '黄棕壤', createdAt: '2024-01-25T08:00:00.000Z' },
    { id: 'p8', name: '水稻主产区', entityId: 'e5', area: 1200, cropType: 'rice', status: 'active', soilType: '水稻土', createdAt: '2024-02-08T08:00:00.000Z' },
    { id: 'p9', name: '小麦轮作区', entityId: 'e5', area: 800, cropType: 'wheat', status: 'active', soilType: '砂姜黑土', createdAt: '2024-02-08T08:00:00.000Z' },
    { id: 'p10', name: '优质稻基地', entityId: 'e6', area: 280, cropType: 'rice', status: 'active', soilType: '水稻土', createdAt: '2024-03-15T08:00:00.000Z' },
    { id: 'p11', name: '蔬菜大棚区', entityId: 'e7', area: 150, cropType: 'vegetable', status: 'active', soilType: '菜园土', createdAt: '2024-04-01T08:00:00.000Z' },
    { id: 'p12', name: '草莓采摘园', entityId: 'e8', area: 90, cropType: 'strawberry', status: 'active', soilType: '黄棕壤', createdAt: '2024-04-20T08:00:00.000Z' },
  ]

  const tasks = [
    { id: 't1', name: '2024年早稻播种任务', cropType: 'rice', regionId: '340103', plannedArea: 1500, actualArea: 1450, startDate: '2024-04-01', endDate: '2024-04-30', status: 'completed', createdAt: '2024-03-15T08:00:00.000Z' },
    { id: 't2', name: '2024年小麦收割任务', cropType: 'wheat', regionId: '340122', plannedArea: 2000, actualArea: 1800, startDate: '2024-05-20', endDate: '2024-06-15', status: 'in_progress', createdAt: '2024-05-01T08:00:00.000Z' },
    { id: 't3', name: '2024年夏玉米播种任务', cropType: 'corn', regionId: '340202', plannedArea: 800, actualArea: 0, startDate: '2024-06-10', endDate: '2024-06-30', status: 'pending', createdAt: '2024-06-01T08:00:00.000Z' },
    { id: 't4', name: '2024年中稻播种任务', cropType: 'rice', regionId: '340303', plannedArea: 1200, actualArea: 960, startDate: '2024-05-15', endDate: '2024-06-10', status: 'in_progress', createdAt: '2024-05-10T08:00:00.000Z' },
    { id: 't5', name: '葡萄园夏季管理', cropType: 'grape', regionId: '340111', plannedArea: 320, actualArea: 320, startDate: '2024-06-01', endDate: '2024-08-31', status: 'in_progress', createdAt: '2024-05-25T08:00:00.000Z' },
    { id: 't6', name: '草莓苗定植任务', cropType: 'strawberry', regionId: '340121', plannedArea: 180, actualArea: 90, startDate: '2024-09-01', endDate: '2024-09-20', status: 'pending', createdAt: '2024-08-20T08:00:00.000Z' },
  ]

  const sowingProgress = [
    { id: 's1', taskId: 't1', regionId: '340103', date: '2024-04-05', plannedArea: 500, sownArea: 480, progress: 96, operator: '张伟', weather: '晴', createdAt: '2024-04-05T18:00:00.000Z' },
    { id: 's2', taskId: 't1', regionId: '340103', date: '2024-04-10', plannedArea: 500, sownArea: 490, progress: 98, operator: '张伟', weather: '多云', createdAt: '2024-04-10T18:00:00.000Z' },
    { id: 's3', taskId: 't1', regionId: '340103', date: '2024-04-15', plannedArea: 500, sownArea: 480, progress: 96, operator: '张伟', weather: '晴', createdAt: '2024-04-15T18:00:00.000Z' },
    { id: 's4', taskId: 't4', regionId: '340303', date: '2024-05-20', plannedArea: 600, sownArea: 480, progress: 80, operator: '王强', weather: '阴', createdAt: '2024-05-20T18:00:00.000Z' },
    { id: 's5', taskId: 't4', regionId: '340303', date: '2024-05-28', plannedArea: 600, sownArea: 480, progress: 80, operator: '王强', weather: '晴', createdAt: '2024-05-28T18:00:00.000Z' },
    { id: 's6', taskId: 't5', regionId: '340111', date: '2024-06-05', plannedArea: 160, sownArea: 160, progress: 100, operator: '陈华', weather: '晴', createdAt: '2024-06-05T18:00:00.000Z' },
  ]

  const harvestProgress = [
    { id: 'h1', taskId: 't2', regionId: '340122', date: '2024-05-25', plannedArea: 800, harvestedArea: 720, progress: 90, operator: '刘洋', weather: '晴', yield: 576, createdAt: '2024-05-25T18:00:00.000Z' },
    { id: 'h2', taskId: 't2', regionId: '340122', date: '2024-06-02', plannedArea: 800, harvestedArea: 680, progress: 85, operator: '刘洋', weather: '多云', yield: 544, createdAt: '2024-06-02T18:00:00.000Z' },
    { id: 'h3', taskId: 't1', regionId: '340103', date: '2024-07-20', plannedArea: 1450, harvestedArea: 0, progress: 0, operator: '张伟', weather: '-', yield: 0, createdAt: '2024-07-01T08:00:00.000Z' },
  ]

  const disasterWarnings = [
    { id: 'w1', type: 'flood', level: 'yellow', title: '合肥市暴雨黄色预警', content: '预计未来24小时内，合肥市将出现暴雨天气，部分地区大暴雨，请注意防范农田渍涝灾害。', startTime: '2024-06-10T08:00:00.000Z', endTime: '2024-06-12T08:00:00.000Z', affectedRegions: ['340100'], createdAt: '2024-06-10T06:00:00.000Z' },
    { id: 'w2', type: 'drought', level: 'orange', title: '蚌埠市干旱橙色预警', content: '持续高温少雨，蚌埠市部分地区出现中度干旱，请做好抗旱保苗工作。', startTime: '2024-07-15T08:00:00.000Z', endTime: '2024-07-25T08:00:00.000Z', affectedRegions: ['340300'], createdAt: '2024-07-15T06:00:00.000Z' },
    { id: 'w3', type: 'pest', level: 'blue', title: '水稻病虫害预警', content: '当前水稻处于分蘖期，请注意防治稻飞虱、稻纵卷叶螟等病虫害。', startTime: '2024-06-15T08:00:00.000Z', endTime: '2024-07-15T08:00:00.000Z', affectedRegions: ['340103', '340122', '340303'], createdAt: '2024-06-15T06:00:00.000Z' },
    { id: 'w4', type: 'heatwave', level: 'red', title: '高温红色预警', content: '预计未来3天最高气温将超过40℃，请注意防范高温热害对农作物的影响。', startTime: '2024-07-20T08:00:00.000Z', endTime: '2024-07-23T08:00:00.000Z', affectedRegions: ['340000'], createdAt: '2024-07-20T06:00:00.000Z' },
  ]

  const disasterRecords = [
    { id: 'd1', type: 'flood', occurTime: '2024-06-11T14:00:00.000Z', regionId: '340103', plotId: 'p1', plotName: '东区水稻一号田', affectedArea: 180, damagedArea: 85, lostArea: 20, estimatedLoss: 35.6, affectedCrops: '水稻', description: '暴雨导致田间积水严重，部分低洼田块秧苗被淹。', status: 'verified', aiAnalysis: '建议及时排水，对受灾较轻的田块补施速效肥促进恢复生长；对受灾严重的田块，待水退后及时改种补种。预计经济损失约35.6万元。', createdAt: '2024-06-12T08:00:00.000Z', updatedAt: '2024-06-13T10:00:00.000Z' },
    { id: 'd2', type: 'drought', occurTime: '2024-07-18T08:00:00.000Z', regionId: '340303', plotId: 'p4', plotName: '水稻核心区', affectedArea: 320, damagedArea: 180, lostArea: 60, estimatedLoss: 48.5, affectedCrops: '水稻', description: '持续高温干旱导致水稻抽穗扬花期受影响，结实率下降。', status: 'assisted', aiAnalysis: '建议加强灌溉调度，优先保障抽穗扬花期水稻用水；对受旱严重的田块，可喷施叶面肥增强抗旱能力。预计经济损失约48.5万元。', createdAt: '2024-07-19T08:00:00.000Z', updatedAt: '2024-07-20T15:00:00.000Z' },
    { id: 'd3', type: 'pest', occurTime: '2024-06-20T08:00:00.000Z', regionId: '340122', plotId: 'p8', plotName: '水稻主产区', affectedArea: 450, damagedArea: 200, lostArea: 0, estimatedLoss: 15.2, affectedCrops: '水稻', description: '稻飞虱大面积发生，虫口密度达到防治指标。', status: 'verified', aiAnalysis: '建议立即组织统防统治，选用高效低毒农药如吡蚜酮、噻嗪酮等进行防治。注意交替用药，延缓抗药性产生。预计经济损失约15.2万元。', createdAt: '2024-06-21T08:00:00.000Z', updatedAt: '2024-06-22T10:00:00.000Z' },
    { id: 'd4', type: 'hail', occurTime: '2024-05-30T16:30:00.000Z', regionId: '340202', plotId: 'p3', plotName: '南区玉米试验田', affectedArea: 120, damagedArea: 80, lostArea: 40, estimatedLoss: 12.8, affectedCrops: '玉米', description: '突发冰雹天气，玉米叶片被打烂，部分植株折断。', status: 'reported', aiAnalysis: '对受灾较轻的田块，及时追施氮肥促进恢复生长；对受灾严重的田块，可考虑改种短季作物如绿豆、荞麦等减少损失。预计经济损失约12.8万元。', createdAt: '2024-05-31T08:00:00.000Z', updatedAt: '2024-06-01T10:00:00.000Z' },
    { id: 'd5', type: 'typhoon', occurTime: '2024-08-05T10:00:00.000Z', regionId: '340111', plotId: 'p6', plotName: '葡萄园A区', affectedArea: 80, damagedArea: 50, lostArea: 30, estimatedLoss: 28.6, affectedCrops: '葡萄', description: '台风导致葡萄架倒塌，果实脱落严重。', status: 'reported', aiAnalysis: '台风过后及时清理果园，修剪受损枝条；对倒伏的葡萄架进行加固修复；加强病虫害防治，预防伤口感染。预计经济损失约28.6万元。', createdAt: '2024-08-06T08:00:00.000Z', updatedAt: '2024-08-06T15:00:00.000Z' },
  ]

  const policies = [
    { id: 'po1', title: '安徽省2024年耕地地力保护补贴实施方案', category: 'subsidy', publishDate: '2024-03-01', effectiveDate: '2024-03-15', content: '补贴对象为拥有耕地承包权的种地农民，补贴标准为每亩120元。补贴资金通过"一卡通"直接发放到农户。', status: 'active', createdAt: '2024-03-01T08:00:00.000Z' },
    { id: 'po2', title: '安徽省水稻完全成本保险试点方案', category: 'insurance', publishDate: '2024-04-01', effectiveDate: '2024-04-15', content: '保险金额覆盖水稻生产的物化成本、土地流转成本和人工成本，每亩保险金额最高可达1100元。保费由中央、省、市县财政补贴80%，农户自缴20%。', status: 'active', createdAt: '2024-04-01T08:00:00.000Z' },
    { id: 'po3', title: '安徽省新型农业经营主体贷款贴息政策', category: 'finance', publishDate: '2024-02-15', effectiveDate: '2024-03-01', content: '对家庭农场、农民合作社等新型农业经营主体，用于农业生产经营的贷款给予贴息支持，贴息比例最高可达贷款利息的50%，单个主体年度贴息额度不超过20万元。', status: 'active', createdAt: '2024-02-15T08:00:00.000Z' },
    { id: 'po4', title: '安徽省农机购置补贴政策', category: 'subsidy', publishDate: '2024-01-20', effectiveDate: '2024-02-01', content: '对购买列入补贴范围的农机具给予补贴，一般机具补贴额不超过购机价格的30%，单机补贴额不超过5万元。', status: 'active', createdAt: '2024-01-20T08:00:00.000Z' },
    { id: 'po5', title: '安徽省自然灾害救助应急预案', category: 'emergency', publishDate: '2024-05-01', effectiveDate: '2024-05-01', content: '建立健全自然灾害救助体系和运行机制，规范应急救助行为，提高应急救助能力。对受灾农户给予生活救助和生产恢复补助。', status: 'active', createdAt: '2024-05-01T08:00:00.000Z' },
    { id: 'po6', title: '安徽省高标准农田建设补助政策', category: 'subsidy', publishDate: '2024-03-10', effectiveDate: '2024-04-01', content: '对新建高标准农田，中央和省级财政每亩补助不低于1500元。市县可根据财力给予配套补助。', status: 'active', createdAt: '2024-03-10T08:00:00.000Z' },
  ]

  const defaultData: StoredData = {
    regions,
    users,
    entities,
    plots,
    tasks,
    sowingProgress,
    harvestProgress,
    disasterWarnings,
    disasterRecords,
    policies,
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
    const totalEntities = data.entities.length
    const totalWarnings = data.disasterWarnings.length
    const totalRecords = data.disasterRecords.length
    return {
      success: true,
      data: {
        totalPlots,
        totalArea,
        totalTasks,
        completedTasks,
        totalEntities,
        totalWarnings,
        totalRecords,
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