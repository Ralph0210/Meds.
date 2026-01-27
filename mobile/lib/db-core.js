// Current schema version - increment when adding migrations
const CURRENT_SCHEMA_VERSION = 2

/**
 * Migration functions - each runs exactly once, in order
 * Index 0 = version 1, Index 1 = version 2, etc.
 *
 * IMPORTANT: Never modify existing migrations, only add new ones.
 * Each migration should be safe to run on existing data.
 */
const MIGRATIONS = [
  // v1: Initial schema with type/config columns
  // (Already created via CREATE TABLE, but we ensure columns exist for older DBs)
  (db) => {
    try {
      db.execSync(
        "ALTER TABLE medications ADD COLUMN type TEXT DEFAULT 'daily'",
      )
    } catch (e) {
      // Column already exists
    }
    try {
      db.execSync("ALTER TABLE medications ADD COLUMN config TEXT")
    } catch (e) {
      // Column already exists
    }
  },
  // v2: Notification preferences
  (db) => {
    try {
      db.execSync(
        "ALTER TABLE medications ADD COLUMN notificationEnabled INTEGER DEFAULT 0",
      )
    } catch (e) {
      // Column already exists
    }
    try {
      db.execSync("ALTER TABLE medications ADD COLUMN notificationTimes TEXT")
    } catch (e) {
      // Column already exists
    }
  },
]

/**
 * Get current schema version from database
 */
const getSchemaVersion = (db) => {
  try {
    const result = db.getFirstSync(
      "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
    )
    return result ? result.version : 0
  } catch (e) {
    // Table doesn't exist yet
    return 0
  }
}

/**
 * Set schema version in database
 */
const setSchemaVersion = (db, version) => {
  db.runSync("INSERT OR REPLACE INTO schema_version (version) VALUES (?)", [
    version,
  ])
}

/**
 * Initialize database with version-tracked migrations
 * - Creates tables if they don't exist
 * - Runs only new migrations (based on schema_version)
 * - Safe to call on every app start
 */
export const initDatabaseCore = (db) => {
  return db.withTransactionSync(() => {
    // 1. Create schema_version table if not exists
    db.execSync(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `)

    // 2. Create core tables if not exist
    db.execSync(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        times TEXT,
        color TEXT,
        icon TEXT,
        keys TEXT,
        type TEXT DEFAULT 'daily',
        config TEXT
      );
    `)

    db.execSync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // 3. Run pending migrations
    const currentVersion = getSchemaVersion(db)

    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      const migration = MIGRATIONS[i]
      if (migration) {
        try {
          migration(db)
        } catch (e) {
          // Log but don't crash - data integrity is priority
          console.warn(`Migration v${i + 1} failed:`, e.message)
        }
      }
      setSchemaVersion(db, i + 1)
    }
  })
}

export const getMedicationsCore = (db) => {
  const result = db.getAllSync("SELECT * FROM medications ORDER BY id")
  return result.map((row) => ({
    ...row,
    times: JSON.parse(row.times || "[]"),
    keys: JSON.parse(row.keys || "[]"),
    config: JSON.parse(row.config || "{}"),
    notificationEnabled: Boolean(row.notificationEnabled),
    notificationTimes: JSON.parse(row.notificationTimes || "{}"),
  }))
}

export const addMedicationCore = (db, med) => {
  const {
    name,
    dosage,
    frequency,
    times,
    color,
    icon,
    keys,
    type,
    config,
    notificationEnabled,
    notificationTimes,
  } = med
  const result = db.runSync(
    `INSERT INTO medications (name, dosage, frequency, times, color, icon, keys, type, config, notificationEnabled, notificationTimes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      dosage,
      frequency,
      JSON.stringify(times),
      color,
      icon,
      JSON.stringify(keys),
      type || "daily",
      JSON.stringify(config || {}),
      notificationEnabled ? 1 : 0,
      JSON.stringify(notificationTimes || {}),
    ],
  )
  return result.lastInsertRowId
}

export const updateMedicationCore = (db, med) => {
  const {
    id,
    name,
    dosage,
    frequency,
    times,
    color,
    icon,
    keys,
    type,
    config,
    notificationEnabled,
    notificationTimes,
  } = med
  db.runSync(
    `UPDATE medications SET name=?, dosage=?, frequency=?, times=?, color=?, icon=?, keys=?, type=?, config=?, notificationEnabled=?, notificationTimes=? WHERE id=?`,
    [
      name,
      dosage,
      frequency,
      JSON.stringify(times),
      color,
      icon,
      JSON.stringify(keys),
      type || "daily",
      JSON.stringify(config || {}),
      notificationEnabled ? 1 : 0,
      JSON.stringify(notificationTimes || {}),
      id,
    ],
  )
}

export const deleteMedicationCore = (db, id) => {
  return db.withTransactionSync(() => {
    // 1. Get medication keys before deletion
    const med = db.getFirstSync("SELECT keys FROM medications WHERE id = ?", [
      id,
    ])
    const keysToRemove = med ? JSON.parse(med.keys || "[]") : []

    // 2. Delete the medication
    db.runSync("DELETE FROM medications WHERE id = ?", [id])

    // 3. Cleanup orphaned keys from all records
    if (keysToRemove.length > 0) {
      const allRecords = db.getAllSync("SELECT id, data FROM records")
      for (const record of allRecords) {
        const data = JSON.parse(record.data || "{}")
        let modified = false

        for (const key of keysToRemove) {
          if (key in data) {
            delete data[key]
            modified = true
          }
        }

        if (modified) {
          // Update the record with cleaned data
          if (Object.keys(data).length === 0) {
            // If no data left, delete the entire record
            db.runSync("DELETE FROM records WHERE id = ?", [record.id])
          } else {
            db.runSync("UPDATE records SET data = ? WHERE id = ?", [
              JSON.stringify(data),
              record.id,
            ])
          }
        }
      }
    }
  })
}

export const getRecordCore = (db, date) => {
  const result = db.getFirstSync("SELECT * FROM records WHERE date = ?", [date])
  if (result) {
    return { ...result, data: JSON.parse(result.data || "{}") }
  }
  return null
}

export const getRecordsCore = (db, startDate, endDate) => {
  const results = db.getAllSync(
    "SELECT * FROM records WHERE date >= ? AND date <= ?",
    [startDate, endDate],
  )
  const map = {}
  results.forEach((row) => {
    map[row.date] = { ...row, data: JSON.parse(row.data || "{}") }
  })
  return map
}

export const updateRecordCore = (db, date, key, value) => {
  return db.withTransactionSync(() => {
    let record = db.getFirstSync("SELECT * FROM records WHERE date = ?", [date])
    let data = {}

    if (record) {
      data = JSON.parse(record.data || "{}")
    }

    data[key] = value

    if (record) {
      db.runSync("UPDATE records SET data = ? WHERE date = ?", [
        JSON.stringify(data),
        date,
      ])
    } else {
      db.runSync("INSERT INTO records (date, data) VALUES (?, ?)", [
        date,
        JSON.stringify(data),
      ])
    }
    return data
  })
}

export const seedDefaultsCore = (db, addMedicationFn) => {
  const existing = db.getFirstSync("SELECT COUNT(*) as count FROM medications")
  if (existing.count === 0) {
    const defaultMed = {
      name: "Minoxidil",
      dosage: "5mg",
      frequency: "2x Daily",
      times: ["Morning", "Night"],
      color: "#FF6B6B",
      icon: "Pill",
      keys: ["minoxidil_morning", "minoxidil_night"],
      type: "daily",
      config: {},
    }
    addMedicationFn(db, defaultMed)
    const secondMed = {
      name: "Vitamin D",
      dosage: "1000IU",
      frequency: "1x Daily",
      times: ["Morning"],
      color: "#4ECDC4",
      icon: "Sun",
      keys: ["vitamind_morning"],
      type: "daily",
      config: {},
    }
    addMedicationFn(db, secondMed)
  }
}

export const resetDatabaseCore = (db, initFn) => {
  db.execSync("DROP TABLE IF EXISTS medications")
  db.execSync("DROP TABLE IF EXISTS records")
  initFn(db)
}
