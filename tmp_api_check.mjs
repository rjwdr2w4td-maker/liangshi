const BASE = 'http://localhost:3001/api'

async function req(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(`${path}: ${data.error || response.statusText}`)
  return data.data
}

const checks = []
const check = async (name, fn) => {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message })
  }
}

let regionId = ''
let entityId = ''
let taskId = ''

await check('登录业务', async () => {
  const data = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  if (!data.token) throw new Error('未返回 token')
})

await check('行政区划查询', async () => {
  const regions = await req('/regions?level=3')
  if (!Array.isArray(regions) || regions.length === 0) throw new Error('无县区数据')
  regionId = regions[0].id
})

await check('种植主体新增/查询/编辑', async () => {
  const created = await req('/entities', {
    method: 'POST',
    body: JSON.stringify({
      name: '自动巡检主体',
      type: 'large_farmer',
      contactPerson: '巡检员',
      phone: '13900000000',
      regionId,
      totalArea: 120
    })
  })
  entityId = created.id
  const list = await req('/entities?name=自动巡检主体')
  if (!list.entities?.length) throw new Error('新增主体未出现在搜索结果')
  const updated = await req(`/entities/${entityId}`, {
    method: 'PUT',
    body: JSON.stringify({ totalArea: 130 })
  })
  if (updated.totalArea !== 130) throw new Error('主体编辑未生效')
})

await check('主体地块查询', async () => {
  const data = await req(`/entities/${entityId}/plots`)
  if (!Array.isArray(data.plots)) throw new Error('地块接口未返回列表')
})

await check('任务列表与任务创建', async () => {
  const created = await req('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      year: new Date().getFullYear(),
      regionId,
      cropType: 'wheat',
      plannedArea: 1000
    })
  })
  taskId = created.id
  const tasks = await req('/tasks')
  if (!Array.isArray(tasks) || !tasks.some(t => t.id === taskId)) throw new Error('任务列表未包含新任务')
})

await check('任务分解', async () => {
  const data = await req(`/tasks/${taskId}/decompose`, {
    method: 'POST',
    body: JSON.stringify({ subTasks: [{ regionId, plannedArea: 500 }] })
  })
  if (!Array.isArray(data) || data.length === 0) throw new Error('未创建子任务')
})

await check('播种进度录入与明细查询', async () => {
  await req('/sowing/record', {
    method: 'POST',
    body: JSON.stringify({ region: '区', area: 50, date: new Date().toISOString().slice(0, 10) })
  })
  const data = await req('/sowing/record?page=1&pageSize=10')
  if (!Array.isArray(data.records)) throw new Error('播种记录接口无列表')
})

await check('收获进度录入与明细查询', async () => {
  await req('/harvest/record', {
    method: 'POST',
    body: JSON.stringify({ region: '区', area: 30, date: new Date().toISOString().slice(0, 10) })
  })
  const data = await req('/harvest/record?page=1&pageSize=10')
  if (!Array.isArray(data.records)) throw new Error('收获记录接口无列表')
})

await check('灾情录入与状态流转', async () => {
  const created = await req('/disaster/records', {
    method: 'POST',
    body: JSON.stringify({
      type: 'drought',
      regionId,
      occurTime: new Date().toISOString(),
      affectedArea: 100,
      damagedArea: 40,
      lostArea: 10,
      estimatedLoss: 20,
      affectedCrops: ['wheat'],
      description: '自动巡检灾情'
    })
  })
  const updated = await req(`/disaster/records/${created.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'verified' })
  })
  if (updated.status !== 'verified') throw new Error('灾情状态未更新')
})

await check('统计报表导出数据', async () => {
  const data = await req(`/statistics/report?year=${new Date().getFullYear()}&type=sowing`)
  if (!Array.isArray(data)) throw new Error('播种报表未返回数组')
})

await check('惠农政策详情业务', async () => {
  const data = await req('/policies')
  const list = Array.isArray(data) ? data : data.policies
  if (!Array.isArray(list) || list.length === 0) throw new Error('政策列表为空')
})

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}: ${item.name}${item.detail ? ` - ${item.detail}` : ''}`)
}

if (checks.some(item => !item.ok)) process.exit(1)
