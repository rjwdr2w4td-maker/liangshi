from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = 'http://localhost:5173'

checks = []

def record(name, ok, detail=''):
    checks.append({'name': name, 'ok': ok, 'detail': detail})

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.goto(f'{BASE_URL}/login')
    page.wait_for_load_state('networkidle')
    page.fill('input[name="username"]', 'admin')
    page.fill('input[name="password"]', 'admin123')
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE_URL}/', timeout=10000)
    record('登录按钮', True)

    pages = [
        ('首页', '/'),
        ('种植主体管理', '/entities'),
        ('任务分解', '/tasks'),
        ('播种进度', '/sowing'),
        ('收获进度', '/harvest'),
        ('统计分析', '/statistics'),
        ('防灾减灾', '/disaster'),
        ('惠农政策', '/policies'),
        ('粮食生产一张图', '/map/production'),
        ('防灾减灾一张图', '/map/disaster'),
    ]

    for name, path in pages:
        try:
            page.goto(f'{BASE_URL}{path}')
            page.wait_for_load_state('networkidle', timeout=15000)
            page.wait_for_timeout(500)
            has_body = page.locator('body').inner_text(timeout=3000).strip() != ''
            record(f'{name} 页面加载', has_body)
        except Exception as e:
            record(f'{name} 页面加载', False, str(e))

    button_tests = [
        ('种植主体 新增主体弹窗', '/entities', 'text=新增主体', 'text=创建'),
        ('种植主体 搜索按钮', '/entities', 'text=搜索', None),
        ('任务分解 刷新按钮', '/tasks', 'text=刷新数据', None),
        ('播种进度 明细查询弹窗', '/sowing', 'text=明细查询', 'text=播种明细查询'),
        ('播种进度 录入进度弹窗', '/sowing', 'text=录入进度', 'text=确认录入'),
        ('收获进度 明细查询弹窗', '/harvest', 'text=明细查询', 'text=收获明细查询'),
        ('收获进度 录入进度弹窗', '/harvest', 'text=录入进度', 'text=确认录入'),
        ('统计分析 导出播种报表', '/statistics', 'text=导出播种报表', None),
        ('统计分析 导出收获报表', '/statistics', 'text=导出收获报表', None),
        ('统计分析 导出灾情报表', '/statistics', 'text=导出灾情报表', None),
        ('防灾减灾 录入灾情弹窗', '/disaster', 'text=录入灾情', 'text=提交'),
        ('惠农政策 搜索按钮', '/policies', 'text=搜索', None),
    ]

    for name, path, selector, expected in button_tests:
        try:
            page.goto(f'{BASE_URL}{path}')
            page.wait_for_load_state('networkidle', timeout=15000)
            page.locator(selector).first.click(timeout=5000)
            page.wait_for_timeout(500)
            if expected:
                ok = page.locator(expected).first.is_visible(timeout=3000)
            else:
                ok = True
            record(name, ok)
        except Exception as e:
            record(name, False, str(e))

    if console_errors:
        record('浏览器控制台错误', False, '\n'.join(console_errors[:10]))
    else:
        record('浏览器控制台错误', True)

    browser.close()

failed = [c for c in checks if not c['ok']]
for c in checks:
    status = 'PASS' if c['ok'] else 'FAIL'
    print(f"{status}: {c['name']}{' - ' + c['detail'] if c['detail'] else ''}")

if failed:
    raise SystemExit(1)
