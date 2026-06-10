import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/grain.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function initDatabase(): void {
  const db = getDatabase()
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('province_admin', 'city_admin', 'county_admin', 'farmer')),
      region_id TEXT,
      phone TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      parent_id TEXT,
      level INTEGER NOT NULL CHECK(level IN (1, 2, 3)),
      FOREIGN KEY (parent_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('large_farmer', 'family_farm', 'cooperative', 'small_farmer', 'village_collective')),
      contact_person TEXT NOT NULL,
      contact_age INTEGER,
      contact_gender TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      region_id TEXT NOT NULL,
      total_area REAL DEFAULT 0,
      main_crops TEXT,
      registration_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS plots (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      area REAL NOT NULL,
      location TEXT,
      boundaries TEXT,
      soil_type TEXT,
      address TEXT,
      land_type TEXT,
      irrigation_type TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT,
      year INTEGER NOT NULL,
      region_id TEXT NOT NULL,
      crop_type TEXT NOT NULL CHECK(crop_type IN ('wheat', 'rice', 'corn', 'soybean', 'other')),
      planned_area REAL NOT NULL,
      parent_task_id TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id),
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS sowing_progress (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      region_id TEXT NOT NULL,
      crop_type TEXT NOT NULL,
      planned_area REAL NOT NULL,
      sown_area REAL DEFAULT 0,
      large_farmer_area REAL DEFAULT 0,
      progress REAL DEFAULT 0,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS sowing_details (
      id TEXT PRIMARY KEY,
      progress_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      plot_id TEXT NOT NULL,
      area REAL NOT NULL,
      sowing_date DATE NOT NULL,
      crop_variety TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (progress_id) REFERENCES sowing_progress(id),
      FOREIGN KEY (entity_id) REFERENCES entities(id),
      FOREIGN KEY (plot_id) REFERENCES plots(id)
    );

    CREATE TABLE IF NOT EXISTS harvest_progress (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      region_id TEXT NOT NULL,
      crop_type TEXT NOT NULL,
      planted_area REAL NOT NULL,
      harvested_area REAL DEFAULT 0,
      large_farmer_area REAL DEFAULT 0,
      progress REAL DEFAULT 0,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS harvest_details (
      id TEXT PRIMARY KEY,
      progress_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      plot_id TEXT NOT NULL,
      area REAL NOT NULL,
      harvest_date DATE NOT NULL,
      yield REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (progress_id) REFERENCES harvest_progress(id),
      FOREIGN KEY (entity_id) REFERENCES entities(id),
      FOREIGN KEY (plot_id) REFERENCES plots(id)
    );

    CREATE TABLE IF NOT EXISTS weather_warnings (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('typhoon', 'drought', 'flood', 'frost', 'heatwave', 'pest')),
      level TEXT NOT NULL CHECK(level IN ('red', 'orange', 'yellow', 'blue')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      affected_regions TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disaster_records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('drought', 'flood', 'typhoon', 'hail', 'frost', 'pest', 'other')),
      region_id TEXT NOT NULL,
      occur_time DATETIME NOT NULL,
      affected_area REAL DEFAULT 0,
      damaged_area REAL DEFAULT 0,
      lost_area REAL DEFAULT 0,
      estimated_loss REAL DEFAULT 0,
      affected_crops TEXT,
      description TEXT,
      status TEXT DEFAULT 'reported' CHECK(status IN ('reported', 'verified', 'assisted')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      publish_date DATE NOT NULL,
      effective_date DATE NOT NULL,
      attachment_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_region ON users(region_id);
    CREATE INDEX IF NOT EXISTS idx_entities_region ON entities(region_id);
    CREATE INDEX IF NOT EXISTS idx_plots_entity ON plots(entity_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_region ON tasks(region_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_year ON tasks(year);
    CREATE INDEX IF NOT EXISTS idx_sowing_progress_region ON sowing_progress(region_id);
    CREATE INDEX IF NOT EXISTS idx_sowing_progress_date ON sowing_progress(date);
    CREATE INDEX IF NOT EXISTS idx_harvest_progress_region ON harvest_progress(region_id);
    CREATE INDEX IF NOT EXISTS idx_harvest_progress_date ON harvest_progress(date);
    CREATE INDEX IF NOT EXISTS idx_disaster_records_region ON disaster_records(region_id);
    CREATE INDEX IF NOT EXISTS idx_disaster_records_time ON disaster_records(occur_time);
  `)

  const ensureColumns = (table: string, columns: Array<{ name: string; definition: string }>): void => {
    const infos = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    const existing = new Set(infos.map(i => i.name))
    for (const col of columns) {
      if (!existing.has(col.name)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.definition}`)
      }
    }
  }

  ensureColumns('entities', [
    { name: 'age', definition: 'age INTEGER' },
    { name: 'gender', definition: 'gender TEXT CHECK(gender IN ("male", "female"))' },
    { name: 'id_card', definition: 'id_card TEXT' },
    { name: 'address', definition: 'address TEXT' },
    { name: 'email', definition: 'email TEXT' },
    { name: 'remark', definition: 'remark TEXT' },
    { name: 'plot_ids', definition: 'plot_ids TEXT' }
  ])

  ensureColumns('plots', [
    { name: 'plot_code', definition: 'plot_code TEXT' },
    { name: 'land_type', definition: 'land_type TEXT' },
    { name: 'irrigation', definition: 'irrigation TEXT' },
    { name: 'ownership', definition: 'ownership TEXT' },
    { name: 'remark', definition: 'remark TEXT' }
  ])

  ensureColumns('tasks', [
    { name: 'name', definition: 'name TEXT' },
    { name: 'entity_type', definition: 'entity_type TEXT CHECK(entity_type IN ("large_farmer", "family_farm", "cooperative", "small_farmer", "village_collective"))' },
    { name: 'plot_ids', definition: 'plot_ids TEXT' }
  ])

  ensureColumns('harvest_details', [
    { name: 'crop_variety', definition: 'crop_variety TEXT' }
  ])

  ensureColumns('policies', [
    { name: 'source', definition: 'source TEXT' },
    { name: 'summary', definition: 'summary TEXT' },
    { name: 'status', definition: "status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'draft'))" }
  ])

  ensureColumns('disaster_records', [
    { name: 'warning_id', definition: 'warning_id TEXT' },
    { name: 'plot_id', definition: 'plot_id TEXT' },
    { name: 'ai_analysis', definition: 'ai_analysis TEXT' },
    { name: 'report_url', definition: 'report_url TEXT' }
  ])
}
