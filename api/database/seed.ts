import { getDatabase, initDatabase } from './init.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const cities = [
  { name: '合肥市', code: '340100' },
  { name: '芜湖市', code: '340200' },
  { name: '蚌埠市', code: '340300' },
  { name: '淮南市', code: '340400' },
  { name: '马鞍山市', code: '340500' },
  { name: '淮北市', code: '340600' },
  { name: '铜陵市', code: '340700' },
  { name: '安庆市', code: '340800' },
  { name: '黄山市', code: '341000' },
  { name: '滁州市', code: '341100' },
  { name: '阜阳市', code: '341200' },
  { name: '宿州市', code: '341300' },
  { name: '六安市', code: '341500' },
  { name: '亳州市', code: '341600' },
  { name: '池州市', code: '341700' },
  { name: '宣城市', code: '341800' }
]

const counties: Record<string, string[]> = {
  '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区'],
  '芜湖市': ['镜湖区', '鸠江区'],
  '蚌埠市': ['蚌山区', '龙子湖区'],
  '淮南市': ['田家庵区', '大通区'],
  '马鞍山市': ['花山区', '雨山区'],
  '淮北市': ['相山区', '杜集区'],
  '铜陵市': ['铜官区', '义安区'],
  '安庆市': ['迎江区', '大观区'],
  '黄山市': ['屯溪区', '黄山区'],
  '滁州市': ['琅琊区', '南谯区'],
  '阜阳市': ['颍州区', '颍东区'],
  '宿州市': ['埇桥区', '砀山县'],
  '六安市': ['金安区', '裕安区'],
  '亳州市': ['谯城区', '涡阳县'],
  '池州市': ['贵池区', '东至县'],
  '宣城市': ['宣州区', '郎溪县']
}

export function seedDatabase(): void {
  initDatabase()
  const db = getDatabase()

  db.pragma('foreign_keys = OFF')
  db.exec(`
    DELETE FROM sowing_details;
    DELETE FROM harvest_details;
    DELETE FROM sowing_progress;
    DELETE FROM harvest_progress;
    DELETE FROM tasks;
    DELETE FROM plots;
    DELETE FROM entities;
    DELETE FROM disaster_records;
    DELETE FROM weather_warnings;
    DELETE FROM policies;
    DELETE FROM users;
    DELETE FROM regions;
  `)
  db.pragma('foreign_keys = ON')

  const transaction = db.transaction(() => {
    const provinceId = uuidv4()
    db.prepare(`
      INSERT INTO regions (id, name, code, level)
      VALUES (?, ?, ?, ?)
    `).run(provinceId, '安徽省', '340000', 1)

    const cityRegionIds: Record<string, string> = {}
    
    cities.forEach(city => {
      const cityId = uuidv4()
      cityRegionIds[city.name] = cityId
      db.prepare(`
        INSERT INTO regions (id, name, code, parent_id, level)
        VALUES (?, ?, ?, ?, ?)
      `).run(cityId, city.name, city.code, provinceId, 2)

      const countyList = counties[city.name] || []
      countyList.forEach((countyName, index) => {
        const countyId = uuidv4()
        const countyCode = `${city.code}${String(index + 1).padStart(2, '0')}`
        db.prepare(`
          INSERT INTO regions (id, name, code, parent_id, level)
          VALUES (?, ?, ?, ?, ?)
        `).run(countyId, countyName, countyCode, cityId, 3)
      })
    })

    const hashedPassword = bcrypt.hashSync('admin123', 10)
    db.prepare(`
      INSERT INTO users (id, username, password, name, role, region_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'admin', hashedPassword, '系统管理员', 'province_admin', provinceId)

    const cityAdminPassword = bcrypt.hashSync('city123', 10)
    Object.entries(cityRegionIds).forEach(([cityName, cityId]) => {
      db.prepare(`
        INSERT INTO users (id, username, password, name, role, region_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), `admin_${cityName.replace('市', '')}`, cityAdminPassword, `${cityName}管理员`, 'city_admin', cityId)
    })

    const entityTypes = ['large_farmer', 'family_farm', 'cooperative', 'small_farmer', 'village_collective'] as const
    const entityTypeNames: Record<string, string> = {
      large_farmer: '规模大户',
      family_farm: '家庭农场',
      cooperative: '合作社',
      small_farmer: '普通农户',
      village_collective: '村集体'
    }

    const allPlotIds: Record<string, string[]> = {}

    Object.entries(cityRegionIds).forEach(([cityName, cityId]) => {
      const countyRows = db.prepare('SELECT id, name FROM regions WHERE parent_id = ?').all(cityId) as { id: string; name: string }[]
      
      countyRows.forEach((county, countyIndex) => {
        const numEntities = Math.floor(Math.random() * 5) + 3
        for (let i = 0; i < numEntities; i++) {
          const entityId = uuidv4()
          const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)]
          const totalArea = Math.floor(Math.random() * 500) + 50
          
          db.prepare(`
            INSERT INTO entities (id, name, type, contact_person, phone, region_id, total_area)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            entityId,
            `${county.name}${entityTypeNames[entityType]}${i + 1}`,
            entityType,
            `联系人${i + 1}`,
            `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            county.id,
            totalArea
          )

          const plotIdsForEntity: string[] = []
          const numPlots = Math.floor(Math.random() * 3) + 1
          for (let j = 0; j < numPlots; j++) {
            const plotId = uuidv4()
            const plotArea = totalArea / numPlots
            const baseLat = 31.5 + countyIndex * 0.1
            const baseLng = 117.2 + countyIndex * 0.1
            
            db.prepare(`
              INSERT INTO plots (id, entity_id, name, area, location, soil_type)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              plotId,
              entityId,
              `${county.name}地块${j + 1}`,
              plotArea,
              JSON.stringify({ lat: baseLat + Math.random() * 0.1, lng: baseLng + Math.random() * 0.1 }),
              ['沙壤土', '黏土', '壤土', '沙土'][Math.floor(Math.random() * 4)]
            )
            plotIdsForEntity.push(plotId)
          }

          if (!allPlotIds[county.id]) allPlotIds[county.id] = []
          allPlotIds[county.id].push(...plotIdsForEntity)
        }
      })
    })

    const currentYear = new Date().getFullYear()

    const provinceTaskId = uuidv4()
    const provincePlannedArea = 7300000
    db.prepare(`
      INSERT INTO tasks (id, year, region_id, crop_type, planned_area, entity_type, plot_ids, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      provinceTaskId, currentYear, provinceId, 'wheat', provincePlannedArea,
      null, null, 'in_progress',
      new Date().toISOString(), new Date().toISOString()
    )

    const cityTaskIds: Record<string, string> = {}
    const cityPlannedAreas: Record<string, number> = {
      '合肥市': 580000, '芜湖市': 360000, '蚌埠市': 520000, '淮南市': 410000,
      '马鞍山市': 280000, '淮北市': 350000, '铜陵市': 180000, '安庆市': 490000,
      '黄山市': 150000, '滁州市': 620000, '阜阳市': 750000, '宿州市': 680000,
      '六安市': 530000, '亳州市': 600000, '池州市': 240000, '宣城市': 320000
    }

    Object.entries(cityRegionIds).forEach(([cityName, cityId]) => {
      const cityTaskId = uuidv4()
      cityTaskIds[cityName] = cityTaskId
      const cityArea = cityPlannedAreas[cityName] || 300000

      const countyRows = db.prepare('SELECT id FROM regions WHERE parent_id = ?').all(cityId) as { id: string }[]
      const countyPlotIds = countyRows.flatMap(c => allPlotIds[c.id] || [])

      db.prepare(`
        INSERT INTO tasks (id, year, region_id, crop_type, planned_area, parent_task_id, entity_type, plot_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cityTaskId, currentYear, cityId, 'wheat', cityArea,
        provinceTaskId,
        'large_farmer',
        countyPlotIds.length > 0 ? JSON.stringify(countyPlotIds.slice(0, 5)) : null,
        'in_progress',
        new Date().toISOString(), new Date().toISOString()
      )

      const countyRows2 = db.prepare('SELECT id, name FROM regions WHERE parent_id = ?').all(cityId) as { id: string; name: string }[]
      const areaPerCounty = Math.round(cityArea / countyRows2.length)
      
      countyRows2.forEach((county, idx) => {
        const countyTaskId = uuidv4()
        const countyArea = idx === countyRows2.length - 1 ? cityArea - areaPerCounty * (countyRows2.length - 1) : areaPerCounty
        const countyPlots = allPlotIds[county.id] || []

        db.prepare(`
          INSERT INTO tasks (id, year, region_id, crop_type, planned_area, parent_task_id, entity_type, plot_ids, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          countyTaskId, currentYear, county.id, 'wheat', countyArea,
          cityTaskId,
          idx % 2 === 0 ? 'cooperative' : 'village_collective',
          countyPlots.length > 0 ? JSON.stringify(countyPlots.slice(0, 3)) : null,
          'in_progress',
          new Date().toISOString(), new Date().toISOString()
        )

        const sownArea = countyArea * (0.3 + Math.random() * 0.5)
        const progress = (sownArea / countyArea) * 100
        
        db.prepare(`
          INSERT INTO sowing_progress (id, task_id, region_id, crop_type, planned_area, sown_area, large_farmer_area, progress, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          countyTaskId,
          county.id,
          'wheat',
          countyArea,
          sownArea,
          sownArea * 0.3,
          progress,
          new Date().toISOString().split('T')[0]
        )
      })
    })

    const provinceTaskId2 = uuidv4()
    const provincePlannedArea2 = 2800000
    db.prepare(`
      INSERT INTO tasks (id, year, region_id, crop_type, planned_area, entity_type, plot_ids, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      provinceTaskId2, currentYear, provinceId, 'rice', provincePlannedArea2,
      null, null, 'pending',
      new Date().toISOString(), new Date().toISOString()
    )

    const riceAreas: Record<string, number> = {
      '合肥市': 260000, '芜湖市': 220000, '蚌埠市': 180000, '淮南市': 150000,
      '马鞍山市': 120000, '淮北市': 80000, '铜陵市': 90000, '安庆市': 240000,
      '黄山市': 60000, '滁州市': 200000, '阜阳市': 280000, '宿州市': 160000,
      '六安市': 230000, '亳州市': 190000, '池州市': 110000, '宣城市': 170000
    }

    Object.entries(cityRegionIds).forEach(([cityName, cityId]) => {
      const cityTaskId = uuidv4()
      const cityArea = riceAreas[cityName] || 100000

      db.prepare(`
        INSERT INTO tasks (id, year, region_id, crop_type, planned_area, parent_task_id, entity_type, plot_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cityTaskId, currentYear, cityId, 'rice', cityArea,
        provinceTaskId2,
        'family_farm',
        null,
        'pending',
        new Date().toISOString(), new Date().toISOString()
      )
    })

    const warningTypes = ['typhoon', 'drought', 'flood', 'frost', 'heatwave', 'pest'] as const
    const warningLevels = ['red', 'orange', 'yellow', 'blue'] as const
    
    for (let i = 0; i < 5; i++) {
      const warningType = warningTypes[Math.floor(Math.random() * warningTypes.length)]
      const warningLevel = warningLevels[Math.floor(Math.random() * warningLevels.length)]
      const affectedCityIds = Object.values(cityRegionIds).slice(0, Math.floor(Math.random() * 3) + 1)
      
      db.prepare(`
        INSERT INTO weather_warnings (id, type, level, title, content, affected_regions, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        warningType,
        warningLevel,
        `${warningType === 'typhoon' ? '台风' : warningType === 'drought' ? '干旱' : warningType === 'flood' ? '洪涝' : warningType === 'frost' ? '霜冻' : warningType === 'heatwave' ? '高温' : '病虫害'}预警`,
        `预计未来几天将出现${warningType === 'typhoon' ? '台风天气' : warningType === 'drought' ? '干旱情况' : warningType === 'flood' ? '洪涝灾害' : warningType === 'frost' ? '霜冻天气' : warningType === 'heatwave' ? '高温天气' : '病虫害'}，请注意防范。`,
        JSON.stringify(affectedCityIds),
        new Date().toISOString(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      )
    }

    const disasterTypes = ['drought', 'flood', 'typhoon', 'hail', 'frost', 'pest', 'other'] as const
    const disasterStatuses = ['reported', 'verified', 'assisted'] as const
    
    Object.values(cityRegionIds).slice(0, 3).forEach(cityId => {
      const countyRows = db.prepare('SELECT id FROM regions WHERE parent_id = ? LIMIT 2').all(cityId) as { id: string }[]
      countyRows.forEach(county => {
        const disasterType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)]
        const affectedArea = Math.floor(Math.random() * 1000) + 100
        
        db.prepare(`
          INSERT INTO disaster_records (id, type, region_id, occur_time, affected_area, damaged_area, lost_area, estimated_loss, affected_crops, description, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          disasterType,
          county.id,
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          affectedArea,
          affectedArea * 0.3,
          affectedArea * 0.1,
          affectedArea * 1000,
          JSON.stringify(['wheat', 'corn']),
          `${disasterType === 'drought' ? '干旱' : disasterType === 'flood' ? '洪涝' : disasterType === 'typhoon' ? '台风' : disasterType === 'hail' ? '冰雹' : disasterType === 'frost' ? '霜冻' : disasterType === 'pest' ? '病虫害' : '其他'}灾害，造成一定损失。`,
          disasterStatuses[Math.floor(Math.random() * disasterStatuses.length)]
        )
      })
    })

    const policies = [
      { title: '2024年耕地地力保护补贴政策', category: '补贴政策', content: '为保护耕地地力，对拥有耕地承包权的农民给予补贴...' },
      { title: '农机购置补贴实施方案', category: '补贴政策', content: '对购买农机的农户给予一定比例的补贴...' },
      { title: '粮食生产功能区划定与保护办法', category: '保护政策', content: '为保障粮食安全，划定粮食生产功能区...' },
      { title: '农业保险保费补贴政策', category: '保险政策', content: '对参加农业保险的农户给予保费补贴...' }
    ]

    policies.forEach(policy => {
      db.prepare(`
        INSERT INTO policies (id, title, content, category, publish_date, effective_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        policy.title,
        policy.content,
        policy.category,
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )
    })
  })

  transaction()

  console.log('Database seeded successfully!')
}
