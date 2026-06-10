import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'
const checks = []
const record = (name, ok, detail = '') => checks.push({ name, ok, detail })

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const consoleErrors = []
const responseErrors = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('response', response => {
  if (response.status() >= 400) responseErrors.push(`${response.status()} ${response.url()}`)
})

try {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 })
  record('登录按钮', true)
} catch (error) {
  record('登录按钮', false, error.message)
}

const pages = [
  ['首页', '/'],
  ['种植主体管理', '/entities'],
  ['任务分解', '/tasks'],
  ['播种进度', '/sowing'],
  ['收获进度', '/harvest'],
  ['统计分析', '/statistics'],
  ['防灾减灾', '/disaster'],
  ['惠农政策', '/policies'],
  ['粮食生产一张图', '/map/production'],
  ['防灾减灾一张图', '/map/disaster'],
]

for (const [name, path] of pages) {
  try {
    await page.goto(`${BASE_URL}${path}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await page.waitForTimeout(500)
    const text = (await page.locator('body').innerText({ timeout: 3000 })).trim()
    record(`${name} 页面加载`, text.length > 0)
  } catch (error) {
    record(`${name} 页面加载`, false, error.message)
  }
}

const buttonTests = [
  ['种植主体 新增主体弹窗', '/entities', 'text=新增主体', 'text=创建'],
  ['种植主体 搜索按钮', '/entities', 'text=搜索', null],
  ['任务分解 刷新按钮', '/tasks', 'text=刷新数据', null],
  ['播种进度 明细查询弹窗', '/sowing', 'text=明细查询', 'text=播种明细查询'],
  ['播种进度 录入进度弹窗', '/sowing', 'text=录入进度', 'text=确认录入'],
  ['收获进度 明细查询弹窗', '/harvest', 'text=明细查询', 'text=收获明细查询'],
  ['收获进度 录入进度弹窗', '/harvest', 'text=录入进度', 'text=确认录入'],
  ['统计分析 导出播种报表', '/statistics', 'text=导出播种报表', null],
  ['统计分析 导出收获报表', '/statistics', 'text=导出收获报表', null],
  ['统计分析 导出灾情报表', '/statistics', 'text=导出灾情报表', null],
  ['防灾减灾 录入灾情弹窗', '/disaster', 'text=录入灾情', 'text=提交'],
  ['惠农政策 搜索按钮', '/policies', 'text=搜索', null],
]

for (const [name, path, selector, expected] of buttonTests) {
  try {
    await page.goto(`${BASE_URL}${path}`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(200)
    await page.locator(selector).first().click({ timeout: 5000 })
    await page.waitForTimeout(500)
    const ok = expected ? await page.locator(expected).first().isVisible({ timeout: 3000 }) : true
    record(name, ok)
  } catch (error) {
    record(name, false, error.message)
  }
}

if (consoleErrors.length) record('浏览器控制台错误', false, consoleErrors.slice(0, 10).join('\n'))
else record('浏览器控制台错误', true)

if (responseErrors.length) record('接口响应错误', false, [...new Set(responseErrors)].slice(0, 20).join('\n'))
else record('接口响应错误', true)

await browser.close()

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'}: ${check.name}${check.detail ? ` - ${check.detail}` : ''}`)
}

if (checks.some(check => !check.ok)) process.exit(1)
