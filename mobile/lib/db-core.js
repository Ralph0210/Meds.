// Pure logic implementation, DB instance is injected
export const initDatabaseCore = (db) => {
  return db.withTransactionSync(() => {
    // Medications Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        times TEXT, -- JSON array of strings
        color TEXT,
        icon TEXT,
        keys TEXT, -- JSON array of strings (derived keys)
        type TEXT DEFAULT 'daily', -- 'daily', 'prn', 'course', 'cyclic', 'interval', 'emergency'
        config TEXT -- JSON object for type-specific data
      );
    `)

    // Records Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        data TEXT, -- JSON object: { [medKey]: boolean }
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Migrations
    try {
      db.execSync(
        "ALTER TABLE medications ADD COLUMN type TEXT DEFAULT 'daily'"
      )
    } catch (e) {}
    try {
      db.execSync("ALTER TABLE medications ADD COLUMN config TEXT")
    } catch (e) {}
  })
}

export const getMedicationsCore = (db) => {
  const result = db.getAllSync("SELECT * FROM medications ORDER BY id")
  return result.map((row) => ({
    ...row,
    times: JSON.parse(row.times || "[]"),
    keys: JSON.parse(row.keys || "[]"),
    config: JSON.parse(row.config || "{}"),
  }))
}

export const addMedicationCore = (db, med) => {
  const { name, dosage, frequency, times, color, icon, keys, type, config } =
    med
  const result = db.runSync(
    `INSERT INTO medications (name, dosage, frequency, times, color, icon, keys, type, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
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
  } = med
  db.runSync(
    `UPDATE medications SET name=?, dosage=?, frequency=?, times=?, color=?, icon=?, keys=?, type=?, config=? WHERE id=?`,
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
      id,
    ]
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
    [startDate, endDate]
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
